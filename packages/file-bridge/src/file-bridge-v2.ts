/**
 * FileBridge V2 — Durable Bridge for pt-control
 *
 * Orchestrates: Lease management, command processing, crash recovery,
 * diagnostics, and garbage collection into a unified durable bridge.
 */
import { existsSync, watch, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { EventEmitter } from "node:events";
import { ensureDir, ensureFile, atomicWriteFile } from "./shared/fs-atomic.js";
import type {
  BridgeCommandEnvelope,
  BridgeResultEnvelope,
  BridgeEvent,
} from "./shared/protocol.js";
import type {
  Snapshot,
  DeviceSnapshot, 
  LinkSnapshot,
} from "@cisco-auto/types";
import { BridgePathLayout } from "./shared/path-layout.js";
import { SequenceStore } from "./shared/sequence-store.js";
import { EventLogWriter } from "./event-log-writer.js";
import { DurableNdjsonConsumer } from "./durable-ndjson-consumer.js";
import { SharedResultWatcher } from "./shared-result-watcher.js";
import { BackpressureManager, BackpressureError } from "./backpressure-manager.js";
import { LeaseManager } from "./v2/lease-manager.js";
import { CommandProcessor } from "./v2/command-processor.js";
import { CrashRecovery } from "./v2/crash-recovery.js";
import { BridgeDiagnostics, type BridgeHealth } from "./v2/diagnostics.js";
import { GarbageCollector, type GCReport } from "./v2/garbage-collector.js";

export interface FileBridgeV2Options {
  root: string;
  consumerId?: string;
  resultTimeoutMs?: number;
  leaseIntervalMs?: number;
  leaseTtlMs?: number;
  maxPendingCommands?: number;
  enableBackpressure?: boolean;
  autoSnapshotIntervalMs?: number; // Intervalo para auto-snapshot (default: 5000ms)
  heartbeatIntervalMs?: number;    // Intervalo para monitorear heartbeat (default: 2000ms)
}

export class FileBridgeV2 extends EventEmitter {
  private readonly paths: BridgePathLayout;
  private readonly seq: SequenceStore;
  private readonly eventWriter: EventLogWriter;
  private readonly consumer: DurableNdjsonConsumer;
  private readonly resultWatcher: SharedResultWatcher;
  private readonly backpressure: BackpressureManager;
  private readonly leaseManager: LeaseManager;
  private readonly commandProcessor: CommandProcessor;
  private readonly crashRecovery: CrashRecovery;
  private readonly _diagnostics: BridgeDiagnostics;
  private readonly garbageCollector: GarbageCollector;

  private leaseTimer: ReturnType<typeof setInterval> | null = null;
  private autoSnapshotTimer: ReturnType<typeof setInterval> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private running = false;
  private lastSnapshot: Snapshot | null = null;

  constructor(private readonly options: FileBridgeV2Options) {
    super();

    this.paths = new BridgePathLayout(options.root);
    this.seq = new SequenceStore(options.root);
    this.eventWriter = new EventLogWriter(this.paths);
    this.resultWatcher = new SharedResultWatcher(this.paths.resultsDir());
    this.backpressure = new BackpressureManager(this.paths, {
      maxPending: options.maxPendingCommands ?? 100,
    });

    this.leaseManager = new LeaseManager(
      this.paths.leaseFile(),
      options.leaseTtlMs ?? 30000,
    );
    this.commandProcessor = new CommandProcessor(this.paths, this.eventWriter, this.seq);
    this.crashRecovery = new CrashRecovery(this.paths, this.seq, this.eventWriter, this.leaseManager);
    this._diagnostics = new BridgeDiagnostics(
      this.paths,
      this.seq,
      () => this.leaseManager.getOwnerId(),
      () => this.leaseManager.readLease(),
    );
    this.garbageCollector = new GarbageCollector(
      this.paths,
      (logFile) => this._diagnostics.isLogNeededByAnyConsumer(logFile),
    );

    this.consumer = new DurableNdjsonConsumer(this.paths, {
      consumerId: options.consumerId ?? "cli-main",
      startFromBeginning: false,
      onEvent: (event) => this.handleEvent(event),
      onGap: (expected, actual) => this.emit("gap", { expected, actual }),
      onParseError: (line, error) => this.emit("parse-error", { line, error }),
      onDataLoss: (info) => this.emit("data-loss", info),
    });
  }

  start(): void {
    if (this.running) {
      if (!this.leaseManager.hasValidLease()) {
        const reacquired = this.leaseManager.acquireLease();
        if (!reacquired) {
          try {
            this.leaseManager.renewLease();
          } catch {
            this.appendEvent({
              type: "bridge-startup-failed",
              note: "Unable to reacquire lease",
            });
          }
        }
      }
      return;
    }
    this.running = true;

    // FASE 8: Ensure directories first
    ensureDir(this.paths.commandsDir());
    ensureDir(this.paths.inFlightDir());
    ensureDir(this.paths.resultsDir());
    ensureDir(this.paths.logsDir());
    ensureDir(this.paths.consumerStateDir());
    ensureDir(this.paths.deadLetterDir());
    ensureFile(this.paths.currentEventsFile(), "");

    // FASE 8: Lease-aware gate - CRITICAL
    // Recovery and consumer must NOT proceed without valid lease
    if (!this.leaseManager.acquireLease()) {
      this.running = false; // Mark as stopped since we can't get lease
      this.emit("lease-denied");
      this.appendEvent({
        type: "bridge-startup-failed",
        note: "Unable to acquire lease",
      });
      return;
    }

    // FASE 8: Only run recovery if we have valid lease
    this.crashRecovery.recover();

    // FASE 8: Only start lease renewal if lease is valid
    this.leaseTimer = setInterval(() => {
      this.leaseManager.renewLease();
    }, this.options.leaseIntervalMs ?? 5_000);

    // FASE 8: Only start consumer if we have valid lease
    this.consumer.start();
  }

  /**
   * Check if the bridge is ready to accept commands
   * Bridge is ready when running and holding a valid lease
   */
  isReady(): boolean {
    return this.running && this.leaseManager.hasValidLease();
  }

  async stop(): Promise<void> {
    if (!this.running) return;
    this.running = false;

    if (this.leaseTimer) {
      clearInterval(this.leaseTimer);
      this.leaseTimer = null;
    }

    this.stopMonitoring(); // Parar auto-snapshot y heartbeat monitoring

    this.consumer.stop();
    this.leaseManager.releaseLease();
    this.resultWatcher.destroy();
  }

  async loadRuntime(code: string): Promise<void> {
    ensureDir(this.paths.root);
    atomicWriteFile(join(this.paths.root, "runtime.js"), code);
  }

  async loadRuntimeFromFile(filePath: string): Promise<void> {
    const code = readFileSync(filePath, "utf8");
    await this.loadRuntime(code);
  }

  sendCommand<TPayload = unknown>(
    type: string,
    payload: TPayload,
    expiresAtMs?: number,
  ): BridgeCommandEnvelope<TPayload> {
    console.log(`[bridge] sendCommand type=${type} expiresAtMs=${String(expiresAtMs ?? "none")}`);
    if (this.options.enableBackpressure ?? true) {
      this.backpressure.checkCapacity();
    }

    const seq = this.seq.next();
    const id = `cmd_${String(seq).padStart(12, "0")}`;

    // Asegurar que el payload tenga el campo 'type' que espera el runtime
    const payloadWithType = {
      type,
      ...(payload as object)
    } as TPayload;

    const envelope: BridgeCommandEnvelope<TPayload> = {
      protocolVersion: 2,
      id,
      seq,
      createdAt: Date.now(),
      type,
      payload: payloadWithType,
      attempt: 1,
      expiresAt: expiresAtMs,
      checksum: this.checksumOf({ type, payload: payloadWithType }),
    };

    const commandFile = this.paths.commandFilePath(seq, type);
    console.log(`[bridge] commandFile=${commandFile}`);

    ensureDir(this.paths.commandsDir());
    atomicWriteFile(commandFile, JSON.stringify(envelope, null, 2));
    console.log(`[bridge] wrote command id=${id} seq=${seq}`);

    // NUEVO: escribir a commands/ en lugar de command.json (Fase 5)
    // Nota: timeoutMs se usa para logging pero el timeout real está en expiresAtMs
    this.eventWriter.append({
      seq,
      ts: Date.now(),
      type: "command-enqueued",
      id,
      commandType: type,
      payloadSizeBytes: JSON.stringify(payload).length,
      expiresAt: expiresAtMs,
    });

    return envelope;
  }

  async sendCommandAndWait<TPayload = unknown, TResult = unknown>(
    type: string,
    payload: TPayload,
    timeoutMs?: number,
  ): Promise<BridgeResultEnvelope<TResult>> {
    console.log(`[bridge] sendCommandAndWait type=${type} timeoutMs=${String(timeoutMs ?? this.options.resultTimeoutMs ?? 120_000)}`);
    if (this.options.enableBackpressure ?? true) {
      console.log(`[bridge] waitForCapacity start type=${type}`);
      await this.backpressure.waitForCapacity();
      console.log(`[bridge] waitForCapacity done type=${type}`);
    }

    // NUEVO: escribir a commands/ (Fase 5) - ya no hay slot único
    const envelope = this.sendCommand(
      type,
      payload,
      Date.now() + (timeoutMs ?? this.options.resultTimeoutMs ?? 120_000),
    );
    const resultPath = this.paths.resultFilePath(envelope.id);
    const timeout = timeoutMs ?? this.options.resultTimeoutMs ?? 120_000;
    const started = Date.now();
    let pollMs = 25;
    console.log(`[bridge] waiting result id=${envelope.id} path=${resultPath}`);

    return new Promise((resolve, reject) => {
      let resolved = false;
      let timer: ReturnType<typeof setTimeout> | null = null;

      const cleanup = () => {
        if (timer) clearTimeout(timer);
        this.resultWatcher.unwatch(envelope.id, checkResult);
      };

      const resolveOnce = (result: BridgeResultEnvelope<TResult>) => {
        if (resolved) return;
        resolved = true;
        cleanup();
        resolve(result);
      };

      const rejectOnce = (error: Error) => {
        if (resolved) return;
        resolved = true;
        cleanup();
        reject(error);
      };

      const checkResult = async () => {
        if (Date.now() - started > timeout) {
          console.log(`[bridge] result timeout id=${envelope.id}`);
          rejectOnce(new Error(`Timeout waiting for result for ${envelope.id} after ${timeout}ms`));
          return;
        }

        try {
          const content = readFileSync(resultPath, "utf8");
          const result = JSON.parse(content) as BridgeResultEnvelope<TResult>;
          resolveOnce(result);
        } catch (err) {
          const error = err as NodeJS.ErrnoException;
          console.log(`[bridge] result not ready id=${envelope.id} code=${String(error.code ?? "unknown")}`);
          if (error.code === "ENOENT") {
            pollMs = Math.min(pollMs * 1.5, 500);
            timer = setTimeout(checkResult, pollMs);
          } else {
            pollMs = Math.min(pollMs * 1.5, 500);
            timer = setTimeout(checkResult, pollMs);
          }
        }
      };

      timer = setTimeout(checkResult, 0);
      this.resultWatcher.watch(envelope.id, checkResult);
    });
  }

  async waitForCapacity(timeoutMs?: number): Promise<void> {
    return this.backpressure.waitForCapacity(timeoutMs);
  }

  getBackpressureStats(): {
    maxPending: number;
    currentPending: number;
    availableCapacity: number;
    utilizationPercent: number;
  } {
    return this.backpressure.getStats();
  }

  pickNextCommand<T = unknown>(): BridgeCommandEnvelope<T> | null {
    return this.commandProcessor.pickNextCommand<T>();
  }

  publishResult<TResult = unknown>(
    cmd: BridgeCommandEnvelope,
    result: {
      startedAt: number;
      status: "completed" | "failed" | "timeout";
      ok: boolean;
      value?: TResult;
      error?: BridgeResultEnvelope["error"];
    },
  ): void {
    this.commandProcessor.publishResult(cmd, result);
  }

  appendEvent(
    event: Omit<BridgeEvent, "seq" | "ts"> & Partial<Pick<BridgeEvent, "seq" | "ts">>,
  ): void {
    this.eventWriter.append({
      seq: event.seq ?? this.seq.next(),
      ts: event.ts ?? Date.now(),
      ...event,
    } as BridgeEvent);
  }

  readState<T = unknown>(): T | null {
    try {
      const content = readFileSync(this.paths.stateFile(), "utf8");
      return JSON.parse(content) as T;
    } catch {
      return null;
    }
  }

  onAll(handler: (event: unknown) => void): () => void {
    this.on("*", handler);
    return () => this.off("*", handler);
  }

  diagnostics(): BridgeHealth {
    return this._diagnostics.collectHealth();
  }

  gc(options: { resultTtlMs?: number; logTtlMs?: number } = {}): GCReport {
    return this.garbageCollector.collect(options);
  }

  /**
   * Inicia auto-snapshot cada X segundos
   * Toma snapshots automáticamente y detecta diffs para generar eventos
   */
  startAutoSnapshot(): void {
    if (this.autoSnapshotTimer) return;

    const intervalMs = this.options.autoSnapshotIntervalMs ?? 5_000;
    
    this.autoSnapshotTimer = setInterval(async () => {
      try {
        // Solo hacer snapshot si tenemos lease activo
        if (!this.leaseManager.hasValidLease()) return;

        // Solicitar snapshot a PT
        const result = await this.sendCommandAndWait<{}, Snapshot>('snapshot', {}, 10_000);
        
        if (result.ok && result.value) {
          const newSnapshot = result.value;
          
          // Si tenemos snapshot anterior, calcular diff
          if (this.lastSnapshot) {
            const diff = this.calculateSnapshotDiff(this.lastSnapshot, newSnapshot);
            if (diff.hasChanges) {
              this.appendEvent({
                type: 'topology-changed',
                diff,
                snapshot: newSnapshot,
              });
            }
          } else {
            // Primer snapshot
            this.appendEvent({
              type: 'topology-initial',
              snapshot: newSnapshot,
            });
          }

          this.lastSnapshot = newSnapshot;
        }
      } catch (error) {
        this.appendEvent({
          type: 'auto-snapshot-error', 
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }, intervalMs);
  }

  /**
   * Inicia monitoreo de heartbeat.json
   * Detecta cuando PT deja de escribir heartbeat
   */
  startHeartbeatMonitoring(): void {
    if (this.heartbeatTimer) return;

    const intervalMs = this.options.heartbeatIntervalMs ?? 2_000;
    const heartbeatFile = join(this.paths.root, "heartbeat.json");

    this.heartbeatTimer = setInterval(() => {
      try {
        const stats = statSync(heartbeatFile);
        const age = Date.now() - stats.mtime.getTime();
        
        // Si el heartbeat tiene más de 10 segundos, PT probablemente murió
        if (age > 10_000) {
          this.appendEvent({
            type: 'pt-heartbeat-stale',
            ageMs: age,
            lastModified: stats.mtime.getTime(),
          });
        } else {
          // Heartbeat OK - leer contenido opcional
          try {
            const content = readFileSync(heartbeatFile, 'utf8');
            const heartbeat = JSON.parse(content);
            this.appendEvent({
              type: 'pt-heartbeat-ok',
              heartbeat,
              ageMs: age,
            });
          } catch {
            // Heartbeat file existe pero no es JSON válido
            this.appendEvent({
              type: 'pt-heartbeat-ok',
              ageMs: age,
            });
          }
        }
      } catch (error) {
        const err = error as NodeJS.ErrnoException;
        if (err.code === 'ENOENT') {
          this.appendEvent({
            type: 'pt-heartbeat-missing',
          });
        } else {
          this.appendEvent({
            type: 'pt-heartbeat-error',
            error: err.message,
          });
        }
      }
    }, intervalMs);
  }

  /**
   * Para auto-snapshot y heartbeat monitoring
   */
  stopMonitoring(): void {
    if (this.autoSnapshotTimer) {
      clearInterval(this.autoSnapshotTimer);
      this.autoSnapshotTimer = null;
    }
    
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Calcula diferencias entre dos snapshots
   */
  private calculateSnapshotDiff(prev: Snapshot, curr: Snapshot): { 
    hasChanges: boolean;
    devicesAdded: string[];
    devicesRemoved: string[];
    devicesChanged: string[];
    linksAdded: string[];
    linksRemoved: string[];
  } {
    const prevDevices = new Set(Object.keys(prev.devices));
    const currDevices = new Set(Object.keys(curr.devices));
    const prevLinks = new Set(Object.keys(prev.links));
    const currLinks = new Set(Object.keys(curr.links));

    const devicesAdded = [...currDevices].filter(d => !prevDevices.has(d));
    const devicesRemoved = [...prevDevices].filter(d => !currDevices.has(d));
    const linksAdded = [...currLinks].filter(l => !prevLinks.has(l));
    const linksRemoved = [...prevLinks].filter(l => !currLinks.has(l));

    // Detectar dispositivos que cambiaron (mismo nombre, diferentes propiedades)
    const devicesChanged: string[] = [];
    for (const deviceName of [...currDevices].filter(d => prevDevices.has(d))) {
      const prevDevice = prev.devices[deviceName];
      const currDevice = curr.devices[deviceName];
      if (JSON.stringify(prevDevice) !== JSON.stringify(currDevice)) {
        devicesChanged.push(deviceName);
      }
    }

    const hasChanges = devicesAdded.length > 0 || 
                      devicesRemoved.length > 0 || 
                      devicesChanged.length > 0 ||
                      linksAdded.length > 0 || 
                      linksRemoved.length > 0;

    return {
      hasChanges,
      devicesAdded,
      devicesRemoved,
      devicesChanged,
      linksAdded,
      linksRemoved,
    };
  }

  /**
   * Obtiene información de heartbeat si existe
   */
  /**
   * Obtiene información de heartbeat si existe
   * Devuelve el JSON parseado o null si no existe / no se puede parsear
   */
  getHeartbeat<T = unknown>(): T | null {
    try {
      const heartbeatFile = join(this.paths.root, 'heartbeat.json');
      const content = readFileSync(heartbeatFile, 'utf8');
      return JSON.parse(content) as T;
    } catch {
      return null;
    }
  }

  /**
   * Obtiene el estado de salud del heartbeat
   */
  /**
   * Obtiene el estado de salud del heartbeat
   */
  getHeartbeatHealth(): {
    state: 'ok' | 'stale' | 'missing' | 'unknown';
    ageMs?: number;
    lastSeenTs?: number;
  } {
    try {
      const heartbeatFile = join(this.paths.root, 'heartbeat.json');

      const stats = statSync(heartbeatFile);
      const ageMs = Date.now() - stats.mtime.getTime();
      const isStale = ageMs > 10_000; // 10 segundos como umbral por defecto


      return {
        state: isStale ? 'stale' : 'ok',
        ageMs,
        lastSeenTs: stats.mtime.getTime(),
      };
    } catch (err) {
      const e = err as NodeJS.ErrnoException;
      if (e && e.code === 'ENOENT') return { state: 'missing' };
      return { state: 'unknown' };
    }
  }

  /**
   * Obtiene el snapshot de topología más reciente
   */
  /**
   * Obtiene el snapshot de topología más reciente
   */
  getStateSnapshot<T = unknown>(): T | null {
    return this.lastSnapshot as T | null;
  }

  /**
   * Obtiene estado general del bridge
   */
  /**
   * Obtiene estado general del bridge
   */
  getBridgeStatus(): {
    ready: boolean;
    leaseValid?: boolean;
    queuedCount?: number;
    inFlightCount?: number;
    warnings?: string[];
  } {
    const warnings: string[] = [];
    const ready = this.isReady();
    let leaseValid: boolean | undefined = undefined;
    try {
      leaseValid = this.leaseManager.hasValidLease();
    } catch {
      warnings.push("No se pudo validar el lease actual");
    }

    let queuedCount = 0;
    let inFlightCount = 0;
    try {
      const stats = (this.backpressure as any).getDetailedStats?.();
      if (stats) {
        queuedCount = stats.queuedCount;
        inFlightCount = stats.inFlightCount;
      } else {
        queuedCount = this.backpressure.getPendingCount();
      }
    } catch {
      warnings.push("No se pudo leer el estado de la cola");
    }

    return {
      ready,
      leaseValid,
      queuedCount,
      inFlightCount,
      warnings,
    };
  }

  /**
   * Minimal aggregated context for CLI/system consumers
   */
  getContext(): {
    bridgeReady: boolean;
    heartbeat: {
      state: "ok" | "stale" | "missing" | "unknown";
      ageMs?: number;
      lastSeenTs?: number;
    };
  } {
    return {
      bridgeReady: this.isReady(),
      heartbeat: this.getHeartbeatHealth(),
    };
  }

  private handleEvent(event: BridgeEvent): void {
    this.emit(event.type, event);
    this.emit("*", event);
  }

  private checksumOf(input: unknown): string {
    return `sha256:${createHash("sha256")
      .update(JSON.stringify(input))
      .digest("hex")}`;
  }
}

export type { BridgeHealth, GCReport };
