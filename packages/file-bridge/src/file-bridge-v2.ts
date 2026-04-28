/**
 * FileBridge V2 — Bridge durable para pt-control.
 *
 * Orchestra lease management, command processing, crash recovery,
 * diagnostics y garbage collection en un bridge unificado y durable.
 *
 * Estado máquina: stopped -> starting -> leased -> recovering -> running -> stopping
 *
 * Protocolo de archivos (fuente de verdad: filesystem):
 * - commands/*.json: cola FIFO de comandos pending (seq = nombre de archivo)
 * - in-flight/*.json: comandos en proceso por PT (claim via atomic rename)
 * - results/<id>.json: resultado authoritative de cada comando
 * - dead-letter/*.json: comandos corruptos que no se pudieron procesar
 * - logs/events.current.ndjson: journal NDJSON de todos los eventos del bridge
 *
 * Flujo de un comando:
 * 1. CLI escribe commands/<seq>-<type>.json con el envelope del comando
 * 2. PT hace claim con rename atómico -> in-flight/<seq>-<type>.json
 * 3. PT escribe resultado -> results/<id>.json
 * 4. CLI lee resultado, borra in-flight
 *
 * El índice _queue.json es auxiliar (legacy fallback para PT que no puede
 * enumerar directorios). La fuente de verdad es la existencia física de
 * los archivos en commands/.
 */
import { existsSync, watch, readFileSync, statSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { EventEmitter } from "node:events";
import { ensureDir, ensureFile, atomicWriteFile } from "./shared/fs-atomic.js";
import type {
  BridgeCommandEnvelope,
  BridgeResultEnvelope,
  BridgeTimeoutDetails,
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
import { MonitoringService } from "./v2/monitoring-service.js";

const DEBUG = process.env.PT_DEBUG === "1";
const debugLog = (...args: unknown[]) => {
  if (DEBUG) console.log("[bridge]", ...args);
};

/**
 * Opciones de configuración para FileBridgeV2.
 */
export interface FileBridgeV2Options {
  /** Directorio raíz del bridge (pt-dev) */
  root: string;
  /** ID del consumer para tracking de posición (default: "cli-main") */
  consumerId?: string;
  /** Timeout por defecto para esperar resultados (default: 120000ms) */
  resultTimeoutMs?: number;
  /** Intervalo de renewal del lease (default: 10000ms) */
  leaseIntervalMs?: number;
  /** TTL del lease antes de considerarse stale (default: 30000ms) */
  leaseTtlMs?: number;
  /** Máximo de comandos pending antes de aplicar backpressure (default: 100) */
  maxPendingCommands?: number;
  /** Habilita verificación de backpressure antes de enviar (default: true) */
  enableBackpressure?: boolean;
  /** Intervalo para auto-snapshot de topología (default: 5000ms) */
  autoSnapshotIntervalMs?: number;
  /** Intervalo para monitoreo de heartbeat de PT (default: 2000ms) */
  heartbeatIntervalMs?: number;
  /** Si true, omite escritura de _queue.json (fs es fuente primary) */
  skipQueueIndex?: boolean;
  /** Intervalo para limpieza automática de archivos huérfanos (default: 30000ms) */
  autoGcIntervalMs?: number;
}

export interface SendCommandAndWaitOptions {
  resolveDeferred?: boolean;
}

/**
 * Bridge V2 que coordina todos los componentes del sistema de archivos
 * para comunicación CLI <-> PT de forma durable y crash-safe.
 */
export class FileBridgeV2 extends EventEmitter {
  private readonly paths: BridgePathLayout;
  private readonly seq: SequenceStore;
  private readonly eventWriter: EventLogWriter;
  private readonly consumer: DurableNdjsonConsumer;
  private readonly resultWatcher: SharedResultWatcher;
  private readonly backpressure: BackpressureManager;
  private readonly commandProcessor: CommandProcessor;
  private readonly monitoringService: MonitoringService;
  private readonly _diagnostics: BridgeDiagnostics;
  private readonly garbageCollector: GarbageCollector;
  private readonly lifecycle: BridgeLifecycle;
  private readonly leaseManager: LeaseManager;
  private readonly crashRecovery: CrashRecovery;

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

    this.monitoringService = new MonitoringService(
      this.paths,
      {
        sendCommandAndWait: async <TPayload = unknown, TResult = unknown>(
          type: string,
          payload: TPayload,
          timeoutMs: number,
        ) => {
          return this.sendCommandAndWait<TPayload, TResult>(type, payload, timeoutMs);
        },
        appendEvent: (event) => this.appendEvent(event),
        runGc: (opts) => this.gc(opts),
        nextSeq: () => this.seq.next(),
      },
      {
        autoSnapshotIntervalMs: options.autoSnapshotIntervalMs ?? 5_000,
        heartbeatIntervalMs: options.heartbeatIntervalMs ?? 2_000,
        autoGcIntervalMs: options.autoGcIntervalMs ?? 30_000,
      },
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

  /**
   * Inicia el bridge: crea estructura de directorios, adquiere lease,
   * ejecuta crash recovery y comienza a consumir eventos.
   *
   * @throws Error si no puede adquirir el lease (otra instancia está corriendo)
   */
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
      this.startAutoGc();
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
   * Indica si el bridge está listo para aceptar comandos.
   * Requiere que el lifecycle esté en estado "running" y el lease sea válido.
   * @returns true si el bridge puede aceptar comandos
   */
  isReady(): boolean {
    return this.lifecycle.state !== "stopped" && this.lifecycle.isReady;
  }

  /**
   * Detiene el bridge de forma graceful: para consumers, libera lease,
   * y transiciona al estado "stopped".
   * @returns Promise que resuelve cuando el shutdown está completo
   */
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

  /**
   * Carga código JavaScript como runtime en el directorio del bridge.
   * El runtime es cargado por main.js en Packet Tracer.
   *
   * @param code - Código JavaScript del runtime
   */
  async loadRuntime(code: string): Promise<void> {
    ensureDir(this.paths.root);
    atomicWriteFile(join(this.paths.root, "runtime.js"), code);
  }

  /**
   * Carga un archivo existente como runtime del bridge.
   *
   * @param filePath - Path al archivo de runtime
   */
  async loadRuntimeFromFile(filePath: string): Promise<void> {
    const code = readFileSync(filePath, "utf8");
    await this.loadRuntime(code);
  }

  /**
   * Envía un comando al bridge (no bloquea esperando resultado).
   *
   * El comando se escribe atómicamente en commands/<seq>-<type>.json.
   * Aplica backpressure si enableBackpressure=true y la cola está llena.
   *
   * @param type - Tipo del comando (identifica el handler en PT)
   * @param payload - Datos del comando (debe ser serializable)
   * @param expiresAtMs - Timestamp opcional tras el cual el comando expira
   * @returns El envelope del comando creado
   * @throws Error si el bridge no está listo o el payload es inválido
   */
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
    this.commandProcessor.appendQueueIndex(filename);
  }

  /**
   * Remueve una entrada del índice auxiliar de cola.
   * NO altera la fuente primaria de verdad, que es commands/*.json.
   */
  static removeQueueEntry(root: string, filename: string): void {
    CommandProcessor.removeQueueEntry(root, filename);
  }

  /**
   * Envía un comando y espera su resultado de forma blocking.
   *
   * Usa SharedResultWatcher para ser notificado cuando el resultado esté
   * disponible, con polling exponencial como fallback.
   *
   * Si el resultado contiene un valor diferido (deferred ticket),
   * hace poll adicional para resolver el valor final.
   *
   * @param type - Tipo del comando
   * @param payload - Datos del comando
   * @param timeoutMs - Timeout opcional (default: resultTimeoutMs de config)
   * @returns El resultado del comando
   * @throws Error siexpira el timeout o el bridge no está listo
   */
  async sendCommandAndWait<TPayload = unknown, TResult = unknown>(
    type: string,
    payload: TPayload,
    timeoutMs?: number,
    options: SendCommandAndWaitOptions = {},
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
    let pollMs = 5;
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
          resolveOnce(
            this.buildResultTimeoutEnvelope(
              envelope.id,
              envelope.type,
              timeout,
              envelope.seq,
            ) as unknown as BridgeResultEnvelope<TResult>,
          );
          return;
        }

        try {
          const content = readFileSync(resultPath, "utf8");
          const result = JSON.parse(content) as BridgeResultEnvelope<TResult>;
          resolveOnce(result);
        } catch (err) {
          const error = err as NodeJS.ErrnoException;
          if (error.code === "ENOENT") {
            pollMs = Math.min(pollMs * 1.5, 200);
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

    const resultSeenAt = Date.now();
    const resultMeta = (result as {
      meta?: {
        queueLatencyMs?: number;
        execLatencyMs?: number;
        completedAtMs?: number;
      };
    }).meta;
    const timings = {
      sentAt: started,
      resultSeenAt,
      receivedAt: resultSeenAt,
      waitMs: resultSeenAt - started,
      queueLatencyMs: resultMeta?.queueLatencyMs,
      execLatencyMs: resultMeta?.execLatencyMs,
      completedAtMs: resultMeta?.completedAtMs ?? result.completedAt,
    };

    if (options.resolveDeferred !== false && this.isDeferredBridgeValue(result.value)) {
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
        options,
      );
      const followUpTimings = (followUp as { timings?: typeof timings }).timings;
      const receivedAt = Date.now();
      return {
        ...result,
        ok: followUp.ok,
        status: followUp.status,
        completedAt: followUp.completedAt,
        value: followUp.value as TResult,
        error: followUp.error,
        timings: {
          sentAt: started,
          resultSeenAt: followUpTimings?.resultSeenAt ?? resultSeenAt,
          receivedAt,
          waitMs: receivedAt - started,
          queueLatencyMs: followUpTimings?.queueLatencyMs ?? timings.queueLatencyMs,
          execLatencyMs: followUpTimings?.execLatencyMs ?? timings.execLatencyMs,
          completedAtMs: followUpTimings?.completedAtMs ?? followUp.completedAt,
        },
      };
    }

    return {
      ...result,
      timings,
    };
  }

  private isDeferredBridgeValue(value: unknown): value is { deferred: true; ticket: string } {
    return (
      typeof value === "object" &&
      value !== null &&
      (value as { deferred?: unknown }).deferred === true &&
      typeof (value as { ticket?: unknown }).ticket === "string"
    );
  }

  private findCommandArtifact(commandId: string): {
    commandId: string;
    commandFile: string | null;
    inFlightFile: string | null;
    resultFile: string | null;
    deadLetterFile: string | null;
    queueIndexHasCommand: boolean;
  } {
    const findInDir = (dir: string): string | null => {
      try {
        const files = readdirSync(dir);
        return files.find((file) => file.includes(commandId)) ?? null;
      } catch {
        return null;
      }
    };

    const commandFile = findInDir(this.paths.commandsDir());
    const inFlightFile = findInDir(this.paths.inFlightDir());
    const resultFile = findInDir(this.paths.resultsDir());
    const deadLetterFile = findInDir(this.paths.deadLetterDir());

    let queueIndexHasCommand = false;
    try {
      const queuePath = join(this.paths.commandsDir(), "_queue.json");
      if (existsSync(queuePath)) {
        const parsed = JSON.parse(readFileSync(queuePath, "utf8"));
        if (Array.isArray(parsed)) {
          queueIndexHasCommand = parsed.some((entry) => String(entry).includes(commandId));
        }
      }
    } catch {
      queueIndexHasCommand = false;
    }

    return {
      commandId,
      commandFile,
      inFlightFile,
      resultFile,
      deadLetterFile,
      queueIndexHasCommand,
    };
  }

  private buildResultTimeoutEnvelope(
    commandId: string,
    type: string,
    timeoutMs: number,
    seq: number,
  ): BridgeResultEnvelope {
    const artifact = this.findCommandArtifact(commandId);

    // Determinar dónde quedó el comando
    let location: BridgeTimeoutDetails["location"] = "unknown";
    if (artifact.commandFile) location = "commands";
    else if (artifact.inFlightFile) location = "in-flight";
    else if (artifact.resultFile) location = "results";
    else if (artifact.deadLetterFile) location = "dead-letter";

    const bridgeTimeoutDetails: BridgeTimeoutDetails = {
      commandId,
      seq,
      timeoutMs,
      timedOutAt: Date.now(),
      location,
      exists: location !== "unknown",
    };

    return {
      protocolVersion: 2,
      id: commandId,
      seq,
      completedAt: Date.now(),
      status: "timeout",
      ok: false,
      bridgeTimeoutDetails,
    };
  }

  /**
   * Espera hasta que haya capacidad disponible en la cola.
   * Wrapper sobre BackpressureManager.waitForCapacity().
   *
   * @param timeoutMs - Timeout máximo de espera
   */
  async waitForCapacity(timeoutMs?: number): Promise<void> {
    return this.backpressure.waitForCapacity(timeoutMs);
  }

  /**
   * Obtiene estadísticas de uso de la cola de comandos.
   * @returns Métricas de backpressure (pending, available, utilization%)
   */
  getBackpressureStats(): {
    maxPending: number;
    currentPending: number;
    availableCapacity: number;
    utilizationPercent: number;
  } {
    return this.backpressure.getStats();
  }

  /**
   * PT llama esto para obtener el siguiente comando a procesar.
   * Hace claim atómico via rename de commands/ -> in-flight/.
   *
   * @returns El envelope del comando o null si la cola está vacía
   */
  pickNextCommand<T = unknown>(): BridgeCommandEnvelope<T> | null {
    return this.commandProcessor.pickNextCommand<T>();
  }

  /**
   * PT llama esto para publicar el resultado de un comando.
   * Escribe results/<id>.json y limpia el archivo in-flight.
   *
   * @param cmd - El envelope original del comando
   * @param result - El resultado a publicar
   */
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

  /**
   * Agrega un evento al journal NDJSON del bridge.
   * El seq se asigna automáticamente si no se provee.
   *
   * @param event - Evento a escribir (sin seq ni ts, se agregan automáticamente)
   */
  appendEvent(
    event: Omit<BridgeEvent, "seq" | "ts"> & Partial<Pick<BridgeEvent, "seq" | "ts">>,
  ): void {
    this.eventWriter.append({
      seq: event.seq ?? this.seq.next(),
      ts: event.ts ?? Date.now(),
      ...event,
    } as BridgeEvent);
  }

  /**
   * Lee el state snapshot del bridge (topología actual).
   * @returns El state parseado o null si no existe
   */
  readState<T = unknown>(): T | null {
    try {
      const content = readFileSync(this.paths.stateFile(), "utf8");
      return JSON.parse(content) as T;
    } catch {
      return null;
    }
  }

  /**
   * Registra un handler para TODOS los eventos del bridge.
   * @param handler - Función llamada con cada evento
   * @returns Función de cleanup para desregistrar el handler
   */
  onAll(handler: (event: unknown) => void): () => void {
    this.on("*", handler);
    return () => this.off("*", handler);
  }

  /**
   * Recopila información de salud del bridge.
   * Incluye lease, colas, journal y estado de consumers.
   *
   * @returns Objeto BridgeHealth con estado general y métricas detalladas
   */
  diagnostics(): BridgeHealth {
    return this._diagnostics.collectHealth();
  }

  /**
   * Ejecuta el garbage collector para limpiar resultados y logs antiguos.
   *
   * @param options - TTLs opcionales para resultados y logs
   * @returns Reporte con cantidad de archivos eliminados y errores
   */
  gc(options: { resultTtlMs?: number; logTtlMs?: number } = {}): GCReport {
    return this.garbageCollector.collect(options);
  }

  /**
   * Inicia el auto-snapshot periódico de la topología de red.
   * Delega a MonitoringService.
   */
  startAutoSnapshot(): void {
    this.monitoringService.startAutoSnapshot();
  }

  /**
   * Inicia monitoreo de heartbeat.json.
   * Delega a MonitoringService.
   */
  startHeartbeatMonitoring(): void {
    this.monitoringService.startHeartbeatMonitoring();
  }

  /**
   * Inicia el garbage collector automático.
   * Delega a MonitoringService.
   */
  startAutoGc(): void {
    this.monitoringService.startAutoGc();
  }

  /**
   * Para auto-snapshot y heartbeat monitoring.
   * Delega a MonitoringService.
   */
  stopMonitoring(): void {
    this.monitoringService.stopMonitoring();
  }

  /**
   * Obtiene el contenido del heartbeat de PT.
   * El heartbeat es escrito por PT para indicar que sigue vivo.
   *
   * @returns El JSON parseado del heartbeat o null si no existe/válido
   */
  getHeartbeat<T = unknown>(): T | null {
    return this.monitoringService.getHeartbeat<T>();
  }

  /**
   * Evalúa la salud del heartbeat de PT basado en la edad del archivo.
   * Delega a MonitoringService.
   *
   * @returns Estado (ok/stale/missing/unknown), edad en ms, y timestamp de última modificación
   */
  getHeartbeatHealth(): {
    state: "ok" | "stale" | "missing" | "unknown";
    ageMs?: number;
    lastSeenTs?: number;
  } {
    return this.monitoringService.getHeartbeatHealth();
  }

  /**
   * Obtiene el último snapshot de topología capturado por auto-snapshot.
   * Delega a MonitoringService.
   *
   * @returns El último snapshot o null si no hay snapshot todavía
   */
  getStateSnapshot<T = unknown>(): T | null {
    return this.monitoringService.getLastSnapshot<T>();
  }

  /**
   * Obtiene un resumen del estado actual del bridge.
   * Incluye warnings si hay condiciones anómalas (lease inválido, drift, etc.).
   *
   * @returns Objeto con estado listo, lifecycle, y warnings si los hay
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
      claimMode: "unknown",
      warnings,
    };
  }

  /**
   * Obtiene contexto agregado mínimo para consumidores CLI o sistema.
   * Versión simplificada de getBridgeStatus + getHeartbeatHealth combinados.
   *
   * @returns Contexto con bridgeReady, lifecycleState, y estado de heartbeat
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
