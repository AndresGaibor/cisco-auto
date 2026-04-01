/**
 * FileBridge V2 — Durable Bridge for pt-control
 *
 * Orchestrates: Lease management, command processing, crash recovery,
 * diagnostics, and garbage collection into a unified durable bridge.
 */
import { existsSync, watch } from "node:fs";
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
  private running = false;

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
      options.leaseTtlMs ?? 5000,
    );
    this.commandProcessor = new CommandProcessor(this.paths, this.eventWriter);
    this.crashRecovery = new CrashRecovery(this.paths, this.seq, this.eventWriter);
    this._diagnostics = new BridgeDiagnostics(
      this.paths,
      this.seq,
      this.leaseManager.getOwnerId(),
      this.leaseManager.readLease(),
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
    if (this.running) return;
    this.running = true;

    ensureDir(this.paths.commandsDir());
    ensureDir(this.paths.inFlightDir());
    ensureDir(this.paths.resultsDir());
    ensureDir(this.paths.logsDir());
    ensureDir(this.paths.consumerStateDir());
    ensureDir(this.paths.deadLetterDir());
    ensureFile(this.paths.currentEventsFile(), "");

    this.crashRecovery.recover();

    if (!this.leaseManager.acquireLease()) {
      this.emit("lease-denied");
    }

    this.leaseTimer = setInterval(() => {
      this.leaseManager.renewLease();
    }, this.options.leaseIntervalMs ?? 1_000);

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

    this.consumer.stop();
    this.leaseManager.releaseLease();
    this.resultWatcher.destroy();
  }

  async loadRuntime(code: string): Promise<void> {
    const { atomicWriteFile } = await import("./shared/fs-atomic.js");
    const { join } = await import("node:path");
    ensureDir(this.paths.root);
    atomicWriteFile(join(this.paths.root, "runtime.js"), code);
  }

  async loadRuntimeFromFile(filePath: string): Promise<void> {
    const { readFileSync } = await import("node:fs");
    const code = readFileSync(filePath, "utf8");
    await this.loadRuntime(code);
  }

  sendCommand<TPayload = unknown>(
    type: string,
    payload: TPayload,
    expiresAtMs?: number,
  ): BridgeCommandEnvelope<TPayload> {
    if (this.options.enableBackpressure ?? true) {
      this.backpressure.checkCapacity();
    }

    const seq = this.seq.next();
    const id = `cmd_${String(seq).padStart(12, "0")}`;

    const envelope: BridgeCommandEnvelope<TPayload> = {
      protocolVersion: 2,
      id,
      seq,
      createdAt: Date.now(),
      type,
      payload,
      attempt: 1,
      expiresAt: expiresAtMs,
      checksum: this.checksumOf({ type, payload }),
    };

    const { atomicWriteFile } = require("./shared/fs-atomic.js");
    const { join } = require("node:path");
    const commandFile = join(this.paths.root, "command.json");

    atomicWriteFile(commandFile, JSON.stringify(envelope, null, 2));

    this.eventWriter.append({
      seq,
      ts: Date.now(),
      type: "command-enqueued",
      id,
      commandType: type,
    });

    return envelope;
  }

  async sendCommandAndWait<TPayload = unknown, TResult = unknown>(
    type: string,
    payload: TPayload,
    timeoutMs?: number,
  ): Promise<BridgeResultEnvelope<TResult>> {
    if (this.options.enableBackpressure ?? true) {
      await this.backpressure.waitForCapacity();
    }

    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const commandFile = join(this.paths.root, "command.json");
    try {
      for (let attempt = 0; attempt < 20; attempt++) {
        const existing = readFileSync(commandFile, "utf8").trim();
        if (!existing) break;
        await new Promise((r) => setTimeout(r, 250));
      }
    } catch (e) {
      const err = e as NodeJS.ErrnoException;
      if (err.code !== "ENOENT") throw e;
    }

    const envelope = this.sendCommand(
      type,
      payload,
      Date.now() + (timeoutMs ?? this.options.resultTimeoutMs ?? 120_000),
    );
    const resultPath = this.paths.resultFilePath(envelope.id);
    const timeout = timeoutMs ?? this.options.resultTimeoutMs ?? 120_000;
    const started = Date.now();
    let pollMs = 25;

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
          rejectOnce(new Error(`Timeout waiting for result for ${envelope.id} after ${timeout}ms`));
          return;
        }

        try {
          const { readFileSync } = await import("node:fs");
          const content = readFileSync(resultPath, "utf8");
          const result = JSON.parse(content) as BridgeResultEnvelope<TResult>;
          resolveOnce(result);
        } catch (err) {
          const error = err as NodeJS.ErrnoException;
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
      const { readFileSync } = require("node:fs");
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

  private handleEvent(event: BridgeEvent): void {
    this.emit(event.type, event);
    this.emit("*", event);
  }

  private checksumOf(input: unknown): string {
    const { createHash } = require("node:crypto");
    return `sha256:${createHash("sha256")
      .update(JSON.stringify(input))
      .digest("hex")}`;
  }
}

export { BridgeHealth, GCReport };
