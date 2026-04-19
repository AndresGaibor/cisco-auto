/**
 * FileBridge V2 — Durable Bridge for pt-control
 *
 * Orchestrates: Lease management, command processing, crash recovery,
 * diagnostics, and garbage collection into a unified durable bridge.
 *
 * State machine: stopped -> starting -> leased -> recovering -> running -> stopping
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
import type { Snapshot, DeviceSnapshot, LinkSnapshot } from "@cisco-auto/types";
import { BridgePathLayout } from "./shared/path-layout.js";
import { SequenceStore } from "./shared/sequence-store.js";
import { EventLogWriter } from "./event-log-writer.js";
import { DurableNdjsonConsumer } from "./durable-ndjson-consumer.js";
import { SharedResultWatcher } from "./shared-result-watcher.js";
import { BackpressureManager, BackpressureError } from "./backpressure-manager.js";
import { CommandProcessor } from "./v2/command-processor.js";
import { BridgeDiagnostics, type BridgeHealth } from "./v2/diagnostics.js";
import { GarbageCollector, type GCReport } from "./v2/garbage-collector.js";
import { BridgeLifecycle } from "./v2/bridge-lifecycle.js";
import { LeaseManager } from "./v2/lease-manager.js";
import { CrashRecovery } from "./v2/crash-recovery.js";

const DEBUG = process.env.PT_DEBUG === "1";
const debugLog = (...args: unknown[]) => {
  if (DEBUG) console.log("[bridge]", ...args);
};

export interface FileBridgeV2Options {
  root: string;
  consumerId?: string;
  resultTimeoutMs?: number;
  leaseIntervalMs?: number;
  leaseTtlMs?: number;
  maxPendingCommands?: number;
  enableBackpressure?: boolean;
  autoSnapshotIntervalMs?: number; // Intervalo para auto-snapshot (default: 5000ms)
  heartbeatIntervalMs?: number; // Intervalo para monitorear heartbeat (default: 2000ms)
  skipQueueIndex?: boolean; // Si true, no escribe _queue.json (fs es fuente primary)
}

export class FileBridgeV2 extends EventEmitter {
  private readonly paths: BridgePathLayout;
  private readonly seq: SequenceStore;
  private readonly eventWriter: EventLogWriter;
  private readonly consumer: DurableNdjsonConsumer;
  private readonly resultWatcher: SharedResultWatcher;
  private readonly backpressure: BackpressureManager;
  private readonly commandProcessor: CommandProcessor;
  private readonly _diagnostics: BridgeDiagnostics;
  private readonly garbageCollector: GarbageCollector;
  private readonly lifecycle: BridgeLifecycle;
  private readonly leaseManager: LeaseManager;
  private readonly crashRecovery: CrashRecovery;

  private autoSnapshotTimer: ReturnType<typeof setInterval> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
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

    this.commandProcessor = new CommandProcessor(this.paths, this.eventWriter, this.seq);

    this.leaseManager = new LeaseManager(this.paths.leaseFile(), options.leaseTtlMs ?? 30_000);

    this.crashRecovery = new CrashRecovery(
      this.paths,
      this.seq,
      this.eventWriter,
      this.leaseManager,
    );

    this.lifecycle = new BridgeLifecycle();

    this._diagnostics = new BridgeDiagnostics(
      this.paths,
      this.seq,
      () => this.leaseManager.getOwnerId(),
      () => this.leaseManager.readLease(),
    );
    this.garbageCollector = new GarbageCollector(this.paths, (logFile) =>
      this._diagnostics.isLogNeededByAnyConsumer(logFile),
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
    if (this.lifecycle.state !== "stopped") {
      return;
    }

    this.lifecycle.transition("starting");

    try {
      ensureDir(this.paths.commandsDir());
      ensureDir(this.paths.inFlightDir());
      ensureDir(this.paths.resultsDir());
      ensureDir(this.paths.logsDir());
      ensureDir(this.paths.consumerStateDir());
      ensureDir(this.paths.deadLetterDir());
      ensureFile(this.paths.currentEventsFile(), "");

      const acquiredLease = this.leaseManager.acquireLease();
      if (!acquiredLease) {
        this.eventWriter.append({
          seq: this.seq.next(),
          ts: Date.now(),
          type: "lease-denied",
          note: "Another bridge instance holds the lease",
        });
        this.lifecycle.transition("stopped");
        return;
      }

      this.lifecycle.transition("leased");
      this.crashRecovery.recover();
      this.lifecycle.transition("running");

      this.consumer.start();
    } catch (err) {
      this.eventWriter.append({
        seq: this.seq.next(),
        ts: Date.now(),
        type: "startup-error",
        error: String(err),
      });
      try {
        this.leaseManager.releaseLease();
      } catch {}
      this.lifecycle.transition("stopped");
    }
  }

  /**
   * Check if the bridge is ready to accept commands.
   * Requires lifecycle in running state and a valid lease.
   */
  isReady(): boolean {
    return this.lifecycle.isReady;
  }

  async stop(): Promise<void> {
    if (this.lifecycle.state === "stopped" || this.lifecycle.state === "stopping") {
      return;
    }

    this.lifecycle.transition("stopping");

    try {
      this.stopMonitoring();
      this.consumer.stop();
      this.resultWatcher.destroy();
      this.leaseManager.releaseLease();
    } catch (err) {
      this.eventWriter.append({
        seq: this.seq.next(),
        ts: Date.now(),
        type: "shutdown-error",
        error: String(err),
      });
    } finally {
      this.lifecycle.transition("stopped");
    }
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
    if (!this.isReady()) throw new Error("[bridge] sendCommand: bridge is not ready");

    if (typeof type !== "string" || type.trim() === "") {
      throw new Error("[bridge] sendCommand: type must be a non-empty string");
    }
    if (payload === null || payload === undefined) {
      throw new Error("[bridge] sendCommand: payload cannot be null or undefined");
    }
    if (typeof payload === "object" && Array.isArray(payload)) {
      throw new Error("[bridge] sendCommand: payload cannot be an array");
    }
    if (typeof payload !== "object") {
      throw new Error("[bridge] sendCommand: payload must be a serializable object");
    }
    if (expiresAtMs !== undefined && (typeof expiresAtMs !== "number" || expiresAtMs <= 0)) {
      throw new Error("[bridge] sendCommand: expiresAtMs must be a positive number");
    }

    debugLog(`sendCommand type=${type} expiresAtMs=${String(expiresAtMs ?? "none")}`);
    if (this.options.enableBackpressure ?? true) {
      this.backpressure.checkCapacity();
    }

    const seq = this.seq.next();
    const id = `cmd_${String(seq).padStart(12, "0")}`;

    // Asegurar que el payload tenga el campo 'type' que espera el runtime
    const payloadWithType = {
      type,
      ...(payload as object),
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
    debugLog(`commandFile=${commandFile}`);

    ensureDir(this.paths.commandsDir());
    atomicWriteFile(commandFile, JSON.stringify(envelope, null, 2));

    // _queue.json es legacy fallback — no escribir si skipQueueIndex=true
    // Fuente primary: commands/*.json (filesystem)
    if (!this.options.skipQueueIndex) {
      try {
        this.appendQueueIndex(this.paths.commandFileName(seq, type));
      } catch (queueErr) {
        console.warn(`[bridge] failed to update queue index: ${String(queueErr)}`);
      }
    }

    debugLog(`wrote command id=${id} seq=${seq}`);

    // Nuevo: escribir a commands/ en lugar de command.json (Fase 5)
    // Nota: timeoutMs se usa para logging, pero el timeout real está en expiresAtMs
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

  /**
   * Agrega un archivo de comando al índice de cola.
   * PT usa este archivo porque no puede enumerar confiablemente la carpeta commands.
   * NOTA: Este índice es best-effort y NO es fuente de verdad.
   * El estado real se deriva de los archivos físicos en commands/.
   */
  private appendQueueIndex(filename: string): void {
    const queueFilePath = join(this.paths.commandsDir(), "_queue.json");
    let queue: string[] = [];

    try {
      const existing = readFileSync(queueFilePath, "utf8");
      if (existing.trim()) {
        const parsed = JSON.parse(existing);
        if (Array.isArray(parsed)) {
          queue = parsed.map((entry) => String(entry));
        }
      }
    } catch {
      queue = [];
    }

    if (!queue.includes(filename)) {
      queue.push(filename);
    }

    atomicWriteFile(queueFilePath, JSON.stringify(queue));
  }

  /**
   * Remueve una entrada del índice de cola.
   * Se usa para mantenimiento y depuración.
   */
  static removeQueueEntry(root: string, filename: string): void {
    const queueFilePath = join(root, "commands", "_queue.json");

    try {
      const existing = readFileSync(queueFilePath, "utf8");
      if (!existing.trim()) return;

      const parsed = JSON.parse(existing);
      if (!Array.isArray(parsed)) return;

      const filtered = parsed.map((entry) => String(entry)).filter((entry) => entry !== filename);
      atomicWriteFile(queueFilePath, JSON.stringify(filtered));
    } catch {
      // Índice best-effort.
    }
  }

  async sendCommandAndWait<TPayload = unknown, TResult = unknown>(
    type: string,
    payload: TPayload,
    timeoutMs?: number,
  ): Promise<BridgeResultEnvelope<TResult>> {
    debugLog(
      `sendCommandAndWait type=${type} timeoutMs=${String(timeoutMs ?? this.options.resultTimeoutMs ?? 120_000)}`,
    );

    // La política de admisión (backpressure) queda solo en sendCommand()
    const envelope = this.sendCommand(
      type,
      payload,
      Date.now() + (timeoutMs ?? this.options.resultTimeoutMs ?? 120_000),
    );
    const resultPath = this.paths.resultFilePath(envelope.id);
    const timeout = timeoutMs ?? this.options.resultTimeoutMs ?? 120_000;
    const started = Date.now();
    let pollMs = 25;
    debugLog(`waiting result id=${envelope.id} path=${resultPath}`);

    const result = await new Promise<BridgeResultEnvelope<TResult>>((resolve, reject) => {
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
          debugLog(`result timeout id=${envelope.id}`);
          rejectOnce(new Error(`Timeout waiting for result for ${envelope.id} after ${timeout}ms`));
          return;
        }

        try {
          const content = readFileSync(resultPath, "utf8");
          const result = JSON.parse(content) as BridgeResultEnvelope<TResult>;
          resolveOnce(result);
        } catch (err) {
          const error = err as NodeJS.ErrnoException;
          if (error.code === "ENOENT") {
            pollMs = Math.min(pollMs * 1.5, 500);
            timer = setTimeout(checkResult, pollMs);
          } else {
            debugLog(
              `result read failed id=${envelope.id} code=${String(error.code ?? "unknown")}`,
            );
            pollMs = Math.min(pollMs * 1.5, 500);
            timer = setTimeout(checkResult, pollMs);
          }
        }
      };

      timer = setTimeout(checkResult, 0);
      this.resultWatcher.watch(envelope.id, checkResult);
    });

    if (this.isDeferredBridgeValue(result.value)) {
      const remainingTimeout = timeout - (Date.now() - started);
      if (remainingTimeout <= 0) {
        throw new Error(
          `Timeout waiting for deferred result for ${envelope.id} after ${timeout}ms`,
        );
      }

      const followUp = await this.sendCommandAndWait(
        "__pollDeferred",
        { ticket: result.value.ticket },
        remainingTimeout,
      );
      return {
        ...result,
        ok: followUp.ok,
        status: followUp.status,
        completedAt: followUp.completedAt,
        value: followUp.value as TResult,
        error: followUp.error,
      };
    }

    return result;
  }

  private isDeferredBridgeValue(value: unknown): value is { deferred: true; ticket: string } {
    return (
      typeof value === "object" &&
      value !== null &&
      (value as { deferred?: unknown }).deferred === true &&
      typeof (value as { ticket?: unknown }).ticket === "string"
    );
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
        // Solicitar snapshot a PT
        const result = await this.sendCommandAndWait<{}, Snapshot>("snapshot", {}, 10_000);

        if (result.ok && result.value) {
          const newSnapshot = result.value;

          // Si tenemos snapshot anterior, calcular diff
          if (this.lastSnapshot) {
            const diff = this.calculateSnapshotDiff(this.lastSnapshot, newSnapshot);
            if (diff.hasChanges) {
              this.appendEvent({
                type: "topology-changed",
                diff,
                snapshot: newSnapshot,
              });
            }
          } else {
            // Primer snapshot
            this.appendEvent({
              type: "topology-initial",
              snapshot: newSnapshot,
            });
          }

          this.lastSnapshot = newSnapshot;
        }
      } catch (error) {
        this.appendEvent({
          type: "auto-snapshot-error",
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
            type: "pt-heartbeat-stale",
            ageMs: age,
            lastModified: stats.mtime.getTime(),
          });
        } else {
          // Heartbeat OK - leer contenido opcional
          try {
            const content = readFileSync(heartbeatFile, "utf8");
            const heartbeat = JSON.parse(content);
            this.appendEvent({
              type: "pt-heartbeat-ok",
              heartbeat,
              ageMs: age,
            });
          } catch {
            // Heartbeat file existe pero no es JSON válido
            this.appendEvent({
              type: "pt-heartbeat-ok",
              ageMs: age,
            });
          }
        }
      } catch (error) {
        const err = error as NodeJS.ErrnoException;
        if (err.code === "ENOENT") {
          this.appendEvent({
            type: "pt-heartbeat-missing",
          });
        } else {
          this.appendEvent({
            type: "pt-heartbeat-error",
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
  private calculateSnapshotDiff(
    prev: Snapshot,
    curr: Snapshot,
  ): {
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

    const devicesAdded = [...currDevices].filter((d) => !prevDevices.has(d));
    const devicesRemoved = [...prevDevices].filter((d) => !currDevices.has(d));
    const linksAdded = [...currLinks].filter((l) => !prevLinks.has(l));
    const linksRemoved = [...prevLinks].filter((l) => !currLinks.has(l));

    // Detectar dispositivos que cambiaron (mismo nombre, diferentes propiedades)
    const devicesChanged: string[] = [];
    for (const deviceName of [...currDevices].filter((d) => prevDevices.has(d))) {
      const prevDevice = prev.devices[deviceName];
      const currDevice = curr.devices[deviceName];
      if (JSON.stringify(prevDevice) !== JSON.stringify(currDevice)) {
        devicesChanged.push(deviceName);
      }
    }

    const hasChanges =
      devicesAdded.length > 0 ||
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
      const heartbeatFile = join(this.paths.root, "heartbeat.json");
      const content = readFileSync(heartbeatFile, "utf8");
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
    state: "ok" | "stale" | "missing" | "unknown";
    ageMs?: number;
    lastSeenTs?: number;
  } {
    try {
      const heartbeatFile = join(this.paths.root, "heartbeat.json");

      const stats = statSync(heartbeatFile);
      const ageMs = Date.now() - stats.mtime.getTime();
      const isStale = ageMs > 10_000; // 10 segundos como umbral por defecto

      return {
        state: isStale ? "stale" : "ok",
        ageMs,
        lastSeenTs: stats.mtime.getTime(),
      };
    } catch (err) {
      const e = err as NodeJS.ErrnoException;
      if (e && e.code === "ENOENT") return { state: "missing" };
      return { state: "unknown" };
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
  getBridgeStatus(): {
    ready: boolean;
    state: string;
    leaseValid?: boolean;
    queuedCount?: number;
    inFlightCount?: number;
    queueIndexDrift?: boolean;
    claimMode?: "atomic-move" | "copy-delete" | "unknown" | string;
    warnings?: string[];
  } {
    const warnings: string[] = [];
    const ready = this.isReady();

    if (!this.leaseManager.hasValidLease()) {
      warnings.push("No valid lease held");
    }

    if (this.lifecycle.state !== "running") {
      warnings.push(`Lifecycle state is ${this.lifecycle.state}, not running`);
    }

    let queuedCount = 0;
    let inFlightCount = 0;
    try {
      const stats = this.backpressure.getDetailedStats();
      queuedCount = stats.queuedCount;
      inFlightCount = stats.inFlightCount;
    } catch {
      warnings.push("No se pudo leer el estado de la cola");
    }

    let queueIndexDrift = false;
    try {
      const health = this._diagnostics.collectHealth();
      queueIndexDrift = health.queues.queueIndexDrift;
      if (queueIndexDrift) {
        warnings.push(
          `Queue index drift detected (missing=${health.queues.queueIndexMissingEntries}, extra=${health.queues.queueIndexExtraEntries})`,
        );
      }
    } catch {
      warnings.push("No se pudo leer el estado de cola index");
    }

    return {
      ready,
      state: this.lifecycle.state,
      leaseValid: this.leaseManager.isLeaseValid(),
      queuedCount,
      inFlightCount,
      queueIndexDrift,
      claimMode: "atomic-move",
      warnings,
    };
  }

  /**
   * Minimal aggregated context for CLI/system consumers
   */
  getContext(): {
    bridgeReady: boolean;
    lifecycleState: string;
    heartbeat: {
      state: "ok" | "stale" | "missing" | "unknown";
      ageMs?: number;
      lastSeenTs?: number;
    };
  } {
    return {
      bridgeReady: this.isReady(),
      lifecycleState: this.lifecycle.state,
      heartbeat: this.getHeartbeatHealth(),
    };
  }

  private handleEvent(event: BridgeEvent): void {
    this.emit(event.type, event);
    this.emit("*", event);
  }

  private checksumOf(input: unknown): string {
    return `sha256:${createHash("sha256").update(JSON.stringify(input)).digest("hex")}`;
  }
}

export type { BridgeHealth, GCReport };
