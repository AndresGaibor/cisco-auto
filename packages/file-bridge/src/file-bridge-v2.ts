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
import { EventEmitter } from "node:events";
import { ensureDir, ensureFile } from "./shared/fs-atomic.js";
import type {
  BridgeCommandEnvelope,
  BridgeResultEnvelope,
  BridgeEvent,
} from "./shared/protocol.js";
import { BridgePathLayout } from "./shared/path-layout.js";
import { SequenceStore } from "./shared/sequence-store.js";
import { EventLogWriter } from "./event-log-writer.js";
import { DurableNdjsonConsumer } from "./durable-ndjson-consumer.js";
import { SharedResultWatcher } from "./shared-result-watcher.js";
import { BackpressureManager } from "./backpressure-manager.js";
import { CommandProcessor } from "./v2/command-processor.js";
import { BridgeDiagnostics, type BridgeHealth } from "./v2/diagnostics.js";
import { GarbageCollector, type GCReport } from "./v2/garbage-collector.js";
import { BridgeLifecycle } from "./v2/bridge-lifecycle.js";
import { LeaseManager } from "./v2/lease-manager.js";
import { CrashRecovery } from "./v2/crash-recovery.js";
import { BridgeStatusService } from "./v2/bridge-status-service.js";
import { ensureBridgeRuntimeDirectories } from "./v2/bridge-directory-setup.js";
import { MonitoringService } from "./v2/monitoring-service.js";
import { FileBridgeMetrics } from "./file-bridge-metrics.js";
import { FileBridgeMetricsHistory, getSnapshotAndPersist } from "./file-bridge-metrics-history.js";
import {
  BridgeCommandClient,
  BridgeResultResolver,
  type SendCommandAndWaitOptions,
  type DeferredTimingAccumulator,
} from "./v2/bridge-command-client.js";
import { BridgeRuntimeAdmin } from "./v2/bridge-runtime-admin.js";

const DEBUG = process.env.PT_DEBUG === "1";
const debugLog = (...args: unknown[]) => {
  if (DEBUG) console.log("[bridge]", ...args);
};

export interface FileBridgeV2Options {
  root: string;
  role?: "owner" | "client";
  consumerId?: string;
  resultTimeoutMs?: number;
  leaseIntervalMs?: number;
  leaseTtlMs?: number;
  maxPendingCommands?: number;
  enableBackpressure?: boolean;
  autoSnapshotIntervalMs?: number;
  heartbeatIntervalMs?: number;
  skipQueueIndex?: boolean;
  autoGcIntervalMs?: number;
}

export interface SendCommandAndWaitOptionsExt extends SendCommandAndWaitOptions {
  resolveDeferred?: boolean;
  deferredTiming?: DeferredTimingAccumulator;
}

export class FileBridgeV2 extends EventEmitter {
  private readonly paths: BridgePathLayout;
  private readonly seq: SequenceStore;
  private readonly eventWriter: EventLogWriter;
  private readonly metrics: FileBridgeMetrics;
  private readonly metricsHistory: FileBridgeMetricsHistory;
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
  private readonly cmdClient: BridgeCommandClient;
  private readonly resultResolver: BridgeResultResolver;
  private readonly runtimeAdmin: BridgeRuntimeAdmin;
  private readonly statusService: BridgeStatusService;

  constructor(private readonly options: FileBridgeV2Options) {
    super();

    this.paths = new BridgePathLayout(options.root);
    this.seq = new SequenceStore(options.root);
    this.eventWriter = new EventLogWriter(this.paths);
    this.metrics = new FileBridgeMetrics();
    this.metricsHistory = new FileBridgeMetricsHistory(options.root);
    this.resultWatcher = new SharedResultWatcher(this.paths.resultsDir());
    this.backpressure = new BackpressureManager(this.paths, {
      maxPending: options.maxPendingCommands ?? 100,
    });

    this.commandProcessor = new CommandProcessor(this.paths, this.eventWriter, this.seq, 100, this.metrics);

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

    this.cmdClient = new BridgeCommandClient(this.paths, this.backpressure, {
      enableBackpressure: options.enableBackpressure,
      skipQueueIndex: options.skipQueueIndex,
      resultTimeoutMs: options.resultTimeoutMs,
      appendQueueIndex: (filename) => this.commandProcessor.appendQueueIndex(filename),
      nextSeq: () => this.seq.next(),
      appendEvent: (event) => this.eventWriter.append(event as BridgeEvent),
      resultWatcher: this.resultWatcher,
      getResultTimeoutMs: () => this.options.resultTimeoutMs ?? 120_000,
    });

    this.resultResolver = new BridgeResultResolver({
      paths: this.paths,
      resultWatcher: this.resultWatcher,
      buildResultTimeoutEnvelope: this.cmdClient.buildResultTimeoutEnvelope.bind(this.cmdClient),
      isDeferredBridgeValue: this.cmdClient.isDeferredBridgeValue.bind(this.cmdClient),
      isMalformedDeferredBridgeValue: this.cmdClient.isMalformedDeferredBridgeValue.bind(this.cmdClient),
      getResultTimeoutMs: () => this.options.resultTimeoutMs ?? 120_000,
    });

    this.runtimeAdmin = new BridgeRuntimeAdmin(
      this.paths,
      () => this.monitoringService.getHeartbeat(),
      () => this.monitoringService.getHeartbeatHealth(),
    );

    this.statusService = new BridgeStatusService({
      lifecycle: this.lifecycle,
      leaseManager: this.leaseManager,
      backpressure: this.backpressure,
      diagnostics: this._diagnostics,
      getPerformanceSnapshot: () => {
        const snap = this.metrics.getSnapshot();
        return {
          averageClaimMs: snap.averageClaimMs,
          averageReaddirMs: snap.averageReaddirMs,
          averageJsonParseMs: snap.averageJsonParseMs,
          averageQueueAppendMs: snap.averageQueueAppendMs,
          readdirCacheHitRate: snap.readdirCacheHitRate,
        };
      },
      isReady: () => this.isReady(),
    });
  }

  private get role(): "owner" | "client" {
    return this.options.role ?? "owner";
  }

  start(): void {
    if (this.lifecycle.state !== "stopped") {
      return;
    }

    this.lifecycle.transition("starting");

    try {
      ensureBridgeRuntimeDirectories(this.paths);

      if (this.role === "client") {
        this.lifecycle.transition("client");
        return;
      }

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

      this.metricsHistory.startAutoSnapshot(
        this.metrics,
        this.options.autoSnapshotIntervalMs ?? 5_000,
      );
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
        if (this.role === "owner") {
          this.leaseManager.releaseLease();
        }
      } catch {}
      this.lifecycle.transition("stopped");
    }
  }

  isReady(): boolean {
    return this.lifecycle.state !== "stopped" && this.lifecycle.isReady;
  }

  async stop(): Promise<void> {
    if (this.lifecycle.state === "stopped" || this.lifecycle.state === "stopping") {
      return;
    }

    this.lifecycle.transition("stopping");

    try {
      if (this.role === "owner") {
        this.stopMonitoring();
        this.consumer.stop();
        this.leaseManager.releaseLease();
      }
      this.metricsHistory.stopAutoSnapshot();
      this.resultWatcher.destroy();
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
    return this.runtimeAdmin.loadRuntime(code);
  }

  async loadRuntimeFromFile(filePath: string): Promise<void> {
    return this.runtimeAdmin.loadRuntimeFromFile(filePath);
  }

  sendCommand<TPayload = unknown>(
    type: string,
    payload: TPayload,
    expiresAtMs?: number,
  ): BridgeCommandEnvelope<TPayload> {
    if (!this.isReady()) throw new Error("[bridge] sendCommand: bridge is not ready");
    return this.cmdClient.sendCommand(type, payload, expiresAtMs);
  }

  private appendQueueIndex(filename: string): void {
    this.commandProcessor.appendQueueIndex(filename);
  }

  static removeQueueEntry(root: string, filename: string): void {
    CommandProcessor.removeQueueEntry(root, filename);
  }

  async sendCommandAndWait<TPayload = unknown, TResult = unknown>(
    type: string,
    payload: TPayload,
    timeoutMs?: number,
    options: SendCommandAndWaitOptionsExt = {},
  ): Promise<BridgeResultEnvelope<TResult>> {
    debugLog(
      `sendCommandAndWait type=${type} timeoutMs=${String(timeoutMs ?? this.options.resultTimeoutMs ?? 120_000)}`,
    );

    const timeout = timeoutMs ?? this.options.resultTimeoutMs ?? 120_000;

    const envelope = this.sendCommand(
      type,
      payload,
      Date.now() + timeout,
    );

    const started = Date.now();
    const result = await this.resultResolver.waitForResult<TResult>(
      envelope,
      timeout,
      options.recommendedPollAfterMs,
    );

    const resultSeenAt = Date.now();
    const resultMeta = (result as { meta?: { queueLatencyMs?: number; execLatencyMs?: number; completedAtMs?: number } }).meta;
    const timings = {
      sentAt: started,
      resultSeenAt,
      receivedAt: resultSeenAt,
      waitMs: resultSeenAt - started,
      queueLatencyMs: resultMeta?.queueLatencyMs,
      execLatencyMs: resultMeta?.execLatencyMs,
      completedAtMs: resultMeta?.completedAtMs ?? result.completedAt,
    };

    if (options.resolveDeferred !== false && this.cmdClient.isMalformedDeferredBridgeValue(result.value)) {
      return {
        ...result,
        ok: false,
        status: "failed",
        error: {
          code: "INVALID_DEFERRED_RESULT",
          message: "Deferred result is missing a non-empty ticket",
          phase: "result",
        },
        timings,
      };
    }

    if (options.resolveDeferred !== false && this.cmdClient.isDeferredBridgeValue(result.value)) {
      const ticket = result.value.ticket;
      let deferredTiming = this.resultResolver.recordDeferredPoll(options, ticket);
      let currentFollowUp = result;

      while (this.cmdClient.isDeferredBridgeValue(currentFollowUp.value)) {
        const remainingTimeout = timeout - (Date.now() - started);
        if (remainingTimeout <= 0) {
          const now = Date.now();
          throw new Error(
            `Timeout waiting for deferred result for ${envelope.id} after ${timeout}ms` +
              ` deferred=${JSON.stringify(this.resultResolver.buildDeferredTimingSummary(deferredTiming, false, now))}`,
          );
        }

        const followUpOptions: SendCommandAndWaitOptionsExt = {
          ...options,
          recommendedPollAfterMs: (currentFollowUp.value as any)?.recommendedPollAfterMs,
        };

        currentFollowUp = await this.sendCommandAndWait(
          "__pollDeferred" as any,
          { ticket },
          remainingTimeout,
          followUpOptions,
        );

        deferredTiming = this.resultResolver.recordDeferredPoll({ ...options, deferredTiming }, ticket);

        if (!this.cmdClient.isDeferredBridgeValue(currentFollowUp.value)) {
          break;
        }
      }

      const followUpTimings = (currentFollowUp as { timings?: any }).timings;

      const receivedAt = Date.now();
      const deferredSummary =
        followUpTimings?.deferred ??
        this.resultResolver.buildDeferredTimingSummary(deferredTiming, currentFollowUp.ok !== false, receivedAt);

      return {
        ...result,
        ok: currentFollowUp.ok,
        status: currentFollowUp.status,
        completedAt: currentFollowUp.completedAt,
        value: currentFollowUp.value as TResult,
        error: currentFollowUp.error,
        timings: {
          sentAt: started,
          resultSeenAt: followUpTimings?.resultSeenAt ?? resultSeenAt,
          receivedAt,
          waitMs: receivedAt - started,
          queueLatencyMs: followUpTimings?.queueLatencyMs ?? timings.queueLatencyMs,
          execLatencyMs: followUpTimings?.execLatencyMs ?? timings.execLatencyMs,
          completedAtMs: followUpTimings?.completedAtMs ?? currentFollowUp.completedAt,
          deferred: deferredSummary,
        },
      };
    }

    const deferredSummary = this.resultResolver.buildDeferredTimingSummary(
      options.deferredTiming,
      result.ok !== false,
      Date.now(),
    );

    return {
      ...result,
      timings: {
        ...timings,
        ...(deferredSummary ? { deferred: deferredSummary } : {}),
      },
    };
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
    return this.runtimeAdmin.readState<T>();
  }

  onAll(handler: (event: unknown) => void): () => void {
    this.on("*", handler);
    return () => this.off("*", handler);
  }

  diagnostics(): BridgeHealth {
    try {
      getSnapshotAndPersist(this.metrics, this.metricsHistory);
    } catch {
      // El historial es auxiliar; no bloqueamos un health check por esto.
    }
    const health = this._diagnostics.collectHealth();
    const snap = this.metrics.getSnapshot();
    return {
      ...health,
      performance: {
        averageClaimMs: snap.averageClaimMs,
        averageReaddirMs: snap.averageReaddirMs,
        averageJsonParseMs: snap.averageJsonParseMs,
        averageQueueAppendMs: snap.averageQueueAppendMs,
        readdirCacheHitRate: snap.readdirCacheHitRate,
      },
    };
  }

  gc(options: { resultTtlMs?: number; logTtlMs?: number } = {}): GCReport {
    return this.garbageCollector.collect(options);
  }

  startAutoSnapshot(): void {
    this.monitoringService.startAutoSnapshot();
  }

  startHeartbeatMonitoring(): void {
    this.monitoringService.startHeartbeatMonitoring();
  }

  startAutoGc(): void {
    this.monitoringService.startAutoGc();
  }

  stopMonitoring(): void {
    this.monitoringService.stopMonitoring();
    this.metricsHistory.stopAutoSnapshot();
  }

  getHeartbeat<T = unknown>(): T | null {
    return this.monitoringService.getHeartbeat<T>();
  }

  getHeartbeatHealth(): {
    state: "ok" | "stale" | "missing" | "unknown";
    ageMs?: number;
    lastSeenTs?: number;
  } {
    return this.monitoringService.getHeartbeatHealth();
  }

  getStateSnapshot<T = unknown>(): T | null {
    return this.monitoringService.getLastSnapshot<T>();
  }

  getBridgeStatus() {
    return this.statusService.getBridgeStatus();
  }

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
}

export type { BridgeHealth, GCReport };
