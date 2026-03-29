/**
 * FileBridge V2 — Durable Bridge for pt-control-v2
 *
 * Replaces the v1 FileBridge which used a single command.json slot
 * and rewrote events.ndjson entirely on every append.
 *
 * Key improvements:
 * - Commands are individual files in commands/ (no overwrite)
 * - Results are written to results/<id>.json (authoritative, not just events)
 * - NDJSON events are append-only (not rewritten)
 * - Consumer persists byteOffset + lastSeq (replay on restart)
 * - Single-instance lease prevents dual CLI corruption
 * - Sequence numbers on everything for gap detection
 */
import { existsSync, readdirSync, readFileSync, renameSync, unlinkSync } from "node:fs";
import { hostname } from "node:os";
import { randomUUID, createHash } from "node:crypto";
import { join } from "node:path";
import { EventEmitter } from "node:events";
import {
  atomicWriteFile,
  ensureDir,
  ensureFile,
} from "./shared/fs-atomic.js";
import type {
  BridgeCommandEnvelope,
  BridgeResultEnvelope,
  BridgeEvent,
  BridgeLease,
} from "./shared/protocol.js";
import { BridgePathLayout } from "./shared/path-layout.js";
import { SequenceStore } from "./shared/sequence-store.js";
import { EventLogWriter } from "./event-log-writer.js";
import { DurableNdjsonConsumer } from "./durable-ndjson-consumer.js";

export interface FileBridgeV2Options {
  /** Root directory for PT communication files (e.g. ~/pt-dev) */
  root: string;
  /** Consumer ID for this CLI instance (default: "cli-main") */
  consumerId?: string;
  /** How long to wait for a result before timing out (default: 120000ms) */
  resultTimeoutMs?: number;
  /** How often to renew the lease (default: 1000ms) */
  leaseIntervalMs?: number;
}

export class FileBridgeV2 extends EventEmitter {
  private readonly paths: BridgePathLayout;
  private readonly seq: SequenceStore;
  private readonly eventWriter: EventLogWriter;
  private readonly consumer: DurableNdjsonConsumer;

  private readonly ownerId = randomUUID();
  private leaseTimer: ReturnType<typeof setInterval> | null = null;
  private running = false;

  // Pending result waiters keyed by command id
  private readonly pendingResults = new Map<
    string,
    {
      resolve: (result: BridgeResultEnvelope) => void;
      reject: (error: Error) => void;
      timeout: ReturnType<typeof setTimeout>;
    }
  >();

  constructor(private readonly options: FileBridgeV2Options) {
    super();

    this.paths = new BridgePathLayout(options.root);
    this.seq = new SequenceStore(options.root);
    this.eventWriter = new EventLogWriter(this.paths);

    this.consumer = new DurableNdjsonConsumer(this.paths, {
      consumerId: options.consumerId ?? "cli-main",
      startFromBeginning: false,
      onEvent: (event) => this.handleEvent(event),
      onGap: (expected, actual) => this.emit("gap", { expected, actual }),
      onParseError: (line, error) =>
        this.emit("parse-error", { line, error }),
    });
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  /** Start the bridge — initialize directories, start consumer, acquire lease */
  start(): void {
    if (this.running) return;
    this.running = true;

    // Ensure all directories exist
    ensureDir(this.paths.commandsDir());
    ensureDir(this.paths.inFlightDir());
    ensureDir(this.paths.resultsDir());
    ensureDir(this.paths.logsDir());
    ensureDir(this.paths.consumerStateDir());

    // Ensure events file exists
    ensureFile(this.paths.currentEventsFile(), "");

    // Acquire lease
    this.writeLease();
    this.leaseTimer = setInterval(() => {
      this.writeLease();
    }, this.options.leaseIntervalMs ?? 1000);

    // Start consuming events
    this.consumer.start();
  }

  /** Stop the bridge gracefully */
  async stop(): Promise<void> {
    if (!this.running) return;
    this.running = false;

    if (this.leaseTimer) {
      clearInterval(this.leaseTimer);
      this.leaseTimer = null;
    }

    this.consumer.stop();

    // Reject all pending results
    for (const [, pending] of this.pendingResults) {
      clearTimeout(pending.timeout);
      pending.reject(new Error("Bridge stopped"));
    }
    this.pendingResults.clear();
  }

  // ============================================================================
  // Runtime Management (CLI → PT)
  // ============================================================================

  /**
   * Load runtime JavaScript code into PT.
   * Writes to runtime.js in the pt-dev directory.
   */
  async loadRuntime(code: string): Promise<void> {
    ensureDir(this.paths.root);
    const runtimeFile = join(this.paths.root, "runtime.js");
    atomicWriteFile(runtimeFile, code);
  }

  /**
   * Load runtime from a file path.
   */
  async loadRuntimeFromFile(filePath: string): Promise<void> {
    const code = readFileSync(filePath, "utf8");
    await this.loadRuntime(code);
  }

  // ============================================================================
  // Command Sending (CLI side)
  // ============================================================================

  /**
   * Send a command to PT by creating an individual file in commands/.
   * Returns the command envelope with id, seq, and checksum.
   *
   * This is atomic — the file is either fully written or not created at all.
   */
  sendCommand<TPayload = unknown>(
    type: string,
    payload: TPayload,
    expiresAtMs?: number,
  ): BridgeCommandEnvelope<TPayload> {
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
      checksum: checksumOf({ type, payload }),
    };

    const file = this.paths.commandFilePath(seq, type);
    atomicWriteFile(file, JSON.stringify(envelope, null, 2));

    this.eventWriter.append({
      seq,
      ts: Date.now(),
      type: "command-enqueued",
      id,
      commandType: type,
    });

    return envelope;
  }

  /**
   * Send a command and wait for its result.
   * Reads result from results/<id>.json — not just from events.
   */
  async sendCommandAndWait<TPayload = unknown, TResult = unknown>(
    type: string,
    payload: TPayload,
    timeoutMs?: number,
  ): Promise<BridgeResultEnvelope<TResult>> {
    const envelope = this.sendCommand(
      type,
      payload,
      Date.now() + (timeoutMs ?? this.options.resultTimeoutMs ?? 120_000),
    );
    const resultPath = this.paths.resultFilePath(envelope.id);

    const started = Date.now();
    const timeout = timeoutMs ?? this.options.resultTimeoutMs ?? 120_000;

    while (Date.now() - started < timeout) {
      if (existsSync(resultPath)) {
        try {
          const result = JSON.parse(
            readFileSync(resultPath, "utf8"),
          ) as BridgeResultEnvelope<TResult>;
          return result;
        } catch {
          // File might be partially written; retry
        }
      }
      await sleep(50);
    }

    throw new Error(
      `Timeout waiting for result for ${envelope.id} after ${timeout}ms`,
    );
  }

  // ============================================================================
  // Command Processing (PT side — for the runner inside PT)
  // ============================================================================

  /**
   * Pick up the next command from the queue.
   * Called by the PT runner. Moves the command from commands/ to in-flight/.
   * Returns null if no pending commands.
   */
  pickNextCommand<T = unknown>(): BridgeCommandEnvelope<T> | null {
    const files = readdirSync(this.paths.commandsDir())
      .filter((f) => f.endsWith(".json"))
      .sort();

    if (files.length === 0) return null;

    const nextFile = files[0]!;
    const from = join(this.paths.commandsDir(), nextFile);
    const to = join(this.paths.inFlightDir(), nextFile);

    renameSync(from, to);

    const cmd = JSON.parse(readFileSync(to, "utf8")) as BridgeCommandEnvelope<T>;

    this.eventWriter.append({
      seq: cmd.seq,
      ts: Date.now(),
      type: "command-picked",
      id: cmd.id,
      commandType: cmd.type,
    });

    return cmd;
  }

  /**
   * Publish a command result.
   * Called by the PT runner after executing a command.
   * Writes results/<id>.json and emits a final event.
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
    const finalResult: BridgeResultEnvelope<TResult> = {
      protocolVersion: 2,
      id: cmd.id,
      seq: cmd.seq,
      completedAt: Date.now(),
      ...result,
    };

    // Write authoritative result file
    atomicWriteFile(
      this.paths.resultFilePath(cmd.id),
      JSON.stringify(finalResult, null, 2),
    );

    // Emit journal event for streaming consumers
    this.eventWriter.append({
      seq: cmd.seq,
      ts: Date.now(),
      type: finalResult.ok ? "command-completed" : "command-failed",
      id: cmd.id,
      status: finalResult.status,
      ok: finalResult.ok,
    });

    // Remove from in-flight
    const inFlightPath = this.paths.inFlightFilePath(cmd.seq, cmd.type);
    try {
      unlinkSync(inFlightPath);
    } catch {
      // Already removed or never existed
    }
  }

  // ============================================================================
  // Event Emission
  // ============================================================================

  /**
   * Append a telemetry/event line to the NDJSON log.
   * Used by both CLI and PT to write events.
   * The event's seq is auto-assigned if not provided.
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

  // ============================================================================
  // Internal
  // ============================================================================

  private handleEvent(event: BridgeEvent): void {
    // Check for pending result waiters
    if (
      event.type === "result" ||
      event.type === "command-completed" ||
      event.type === "command-failed"
    ) {
      const id = (event as { id?: string }).id;
      if (id) {
        const pending = this.pendingResults.get(id);
        if (pending) {
          // For now, resolve with the event data
          // The authoritative result is in results/<id>.json which
          // sendCommandAndWait reads directly
          pending.resolve(event as unknown as BridgeResultEnvelope);
          return;
        }
      }
    }

    // Emit to all listeners
    this.emit(event.type, event);
    this.emit("*", event);
  }

  private writeLease(): void {
    const lease: BridgeLease = {
      ownerId: this.ownerId,
      pid: process.pid,
      hostname: hostname(),
      updatedAt: Date.now(),
    };

    atomicWriteFile(this.paths.leaseFile(), JSON.stringify(lease, null, 2));
  }
}

// -----------------------------------------------------------------------------
// Utilities
// -----------------------------------------------------------------------------

function checksumOf(input: unknown): string {
  return `sha256:${createHash("sha256")
    .update(JSON.stringify(input))
    .digest("hex")}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
