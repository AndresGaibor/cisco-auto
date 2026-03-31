/**
 * FileBridge V2 — Durable Bridge for pt-control
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
 * - Crash recovery reconciles inconsistent state on startup
 * - Exponential backoff on sendCommandAndWait polling
 * - Dead-letter queue for corrupted command files
 * - Lease includes expiresAt and PID recycling protection
 * - Garbage collector cleans up old results and rotated logs
 * - Diagnostics/health endpoint for observability
 */
import { existsSync, readdirSync, readFileSync, renameSync, statSync, unlinkSync } from "node:fs";
import { hostname } from "node:os";
import { randomUUID, createHash } from "node:crypto";
import { join } from "node:path";
import { EventEmitter } from "node:events";
import { watch } from "node:fs";
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
import { SharedResultWatcher } from "./shared-result-watcher.js";
import { BackpressureManager, BackpressureError } from "./backpressure-manager.js";

// ----------------------------------------------------------------------------
// Options
// ----------------------------------------------------------------------------

export interface FileBridgeV2Options {
  /** Root directory for PT communication files (e.g. ~/pt-dev) */
  root: string;
  /** Consumer ID for this CLI instance (default: "cli-main") */
  consumerId?: string;
  /** How long to wait for a result before timing out (default: 120000ms) */
  resultTimeoutMs?: number;
  /** How often to renew the lease (default: 1000ms) */
  leaseIntervalMs?: number;
  /** TTL for lease in ms (default: 5000ms) */
  leaseTtlMs?: number;
  /** Maximum pending commands before backpressure (default: 100) */
  maxPendingCommands?: number;
  /** Enable backpressure checking (default: true) */
  enableBackpressure?: boolean;
}

// ----------------------------------------------------------------------------
// Bridge
// ----------------------------------------------------------------------------

export class FileBridgeV2 extends EventEmitter {
  private readonly paths: BridgePathLayout;
  private readonly seq: SequenceStore;
  private readonly eventWriter: EventLogWriter;
  private readonly consumer: DurableNdjsonConsumer;
  private readonly resultWatcher: SharedResultWatcher;
  private readonly backpressure: BackpressureManager;

  private readonly ownerId = randomUUID();
  private readonly leaseTtlMs: number;
  private readonly enableBackpressure: boolean;
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
    this.leaseTtlMs = options.leaseTtlMs ?? 5_000;
    this.enableBackpressure = options.enableBackpressure ?? true;

    // Shared result watcher to avoid fd exhaustion
    this.resultWatcher = new SharedResultWatcher(this.paths.resultsDir());
    
    // Backpressure manager
    this.backpressure = new BackpressureManager(this.paths, {
      maxPending: options.maxPendingCommands ?? 100,
    });

    this.consumer = new DurableNdjsonConsumer(this.paths, {
      consumerId: options.consumerId ?? "cli-main",
      startFromBeginning: false,
      onEvent: (event) => this.handleEvent(event),
      onGap: (expected, actual) => this.emit("gap", { expected, actual }),
      onParseError: (line, error) =>
        this.emit("parse-error", { line, error }),
      onDataLoss: (info) => this.emit("data-loss", info),
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
    ensureDir(this.paths.deadLetterDir());

    // Ensure events file exists
    ensureFile(this.paths.currentEventsFile(), "");

    // Recover inconsistent state from potential crashes
    this.recoverInconsistentState();

    // Acquire lease
    if (!this.acquireLease()) {
      this.emit("lease-denied");
    }

    this.leaseTimer = setInterval(() => {
      this.renewLease();
    }, this.options.leaseIntervalMs ?? 1_000);

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
    this.releaseLease();
    
    // Clean up shared result watcher
    this.resultWatcher.destroy();

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
   * Throws BackpressureError if queue is full and backpressure is enabled.
   */
  sendCommand<TPayload = unknown>(
    type: string,
    payload: TPayload,
    expiresAtMs?: number,
  ): BridgeCommandEnvelope<TPayload> {
    // Check backpressure before sending
    if (this.enableBackpressure) {
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
   * Send a command and wait for its result with exponential backoff.
   * Uses shared result watcher to avoid file descriptor exhaustion.
   */
  async sendCommandAndWait<TPayload = unknown, TResult = unknown>(
    type: string,
    payload: TPayload,
    timeoutMs?: number,
  ): Promise<BridgeResultEnvelope<TResult>> {
    // Wait for capacity if backpressure is enabled
    if (this.enableBackpressure) {
      await this.backpressure.waitForCapacity();
    }

    const envelope = this.sendCommand(
      type,
      payload,
      Date.now() + (timeoutMs ?? this.options.resultTimeoutMs ?? 120_000),
    );
    const resultPath = this.paths.resultFilePath(envelope.id);

    const started = Date.now();
    const timeout = timeoutMs ?? this.options.resultTimeoutMs ?? 120_000;
    let pollMs = 25; // initial poll interval

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

      const checkResult = () => {
        if (Date.now() - started > timeout) {
          rejectOnce(new Error(`Timeout waiting for result for ${envelope.id} after ${timeout}ms`));
          return;
        }

        try {
          const content = readFileSync(resultPath, "utf8");
          const result = JSON.parse(content) as BridgeResultEnvelope<TResult>;
          resolveOnce(result);
        } catch (err: any) {
          if (err.code === "ENOENT") {
            // Result not ready yet — exponential backoff
            pollMs = Math.min(pollMs * 1.5, 500);
            timer = setTimeout(checkResult, pollMs);
          } else {
            // Corrupted result file — retry after brief wait
            pollMs = Math.min(pollMs * 1.5, 500);
            timer = setTimeout(checkResult, pollMs);
          }
        }
      };

      // Start initial check
      timer = setTimeout(checkResult, 0);

      // Register with shared watcher for immediate notification
      this.resultWatcher.watch(envelope.id, checkResult);
    });
  }

  /**
   * Wait for command queue capacity.
   * Useful for scripts that send many commands in a loop.
   */
  async waitForCapacity(timeoutMs?: number): Promise<void> {
    return this.backpressure.waitForCapacity(timeoutMs);
  }

  /**
   * Get backpressure statistics.
   */
  getBackpressureStats(): {
    maxPending: number;
    currentPending: number;
    availableCapacity: number;
    utilizationPercent: number;
  } {
    return this.backpressure.getStats();
  }

  // ============================================================================
  // Command Processing (PT side — for the runner inside PT)
  // ============================================================================

  /**
   * Pick up the next command from the queue.
   * Called by the PT runner. Moves the command from commands/ to in-flight/.
   * Returns null if no pending commands.
   *
   * Uses renameSync for atomic dequeue — safe against concurrent runners.
   * Handles ENOENT gracefully (another runner may have taken the file).
   * Moves corrupted JSON files to dead-letter queue.
   */
  pickNextCommand<T = unknown>(): BridgeCommandEnvelope<T> | null {
    const files = readdirSync(this.paths.commandsDir())
      .filter((f) => f.endsWith(".json"))
      .sort();

    for (const file of files) {
      const srcPath = join(this.paths.commandsDir(), file);
      const dstPath = join(this.paths.inFlightDir(), file);

      // Try atomic rename — may fail with ENOENT if another runner got it
      try {
        renameSync(srcPath, dstPath);
      } catch (err: any) {
        if (err.code === "ENOENT") continue; // Another runner took it
        throw err;
      }

      try {
        const content = readFileSync(dstPath, "utf8");
        const envelope = JSON.parse(content) as BridgeCommandEnvelope<T>;

        // Check expiration
        if (envelope.expiresAt && Date.now() > envelope.expiresAt) {
          this.publishResult(envelope, {
            startedAt: Date.now(),
            status: "timeout",
            ok: false,
            error: {
              code: "EXPIRED",
              message: "Command expired before being processed",
              phase: "queue",
            },
          });
          continue;
        }

        // Verify checksum
        if (envelope.checksum) {
          const computed = checksumOf({ type: envelope.type, payload: envelope.payload });
          if (computed !== envelope.checksum) {
            this.publishResult(envelope, {
              startedAt: Date.now(),
              status: "failed",
              ok: false,
              error: {
                code: "CHECKSUM_MISMATCH",
                message: "Payload integrity compromised",
                phase: "queue",
              },
            });
            continue;
          }
        }

        this.eventWriter.append({
          seq: envelope.seq,
          ts: Date.now(),
          type: "command-picked",
          id: envelope.id,
          commandType: envelope.type,
        });

        return envelope;
      } catch (err) {
        // JSON parse error — move to dead-letter
        this.moveToDeadLetter(dstPath, err);
        continue;
      }
    }

    return null;
  }

  /**
   * Publish a command result.
   * Called by the PT runner after executing a command.
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

    // Write authoritative result file FIRST
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
  // FileBridgePort implementation
  // ============================================================================

  readState<T = unknown>(): T | null {
    return null; // V2 derives topology from events, not a single state file
  }

  onAll(handler: (event: unknown) => void): () => void {
    this.on("*", handler);
    return () => this.off("*", handler);
  }

  // ============================================================================
  // Diagnostics
  // ============================================================================

  /**
   * Get a health snapshot of the bridge.
   */
  diagnostics(): BridgeHealth {
    const issues: string[] = [];
    const lease = this.readLease();
    const now = Date.now();

    // Check lease
    let leaseActive = false;
    if (lease) {
      const isStale = !lease.expiresAt || now > lease.expiresAt;
      if (!isStale && lease.ownerId === this.ownerId) {
        leaseActive = true;
      }
    }

    // Count files in queues
    let pendingCommands = 0;
    let inFlight = 0;
    let results = 0;
    let rotatedLogs = 0;

    try {
      pendingCommands = readdirSync(this.paths.commandsDir()).filter((f) => f.endsWith(".json")).length;
    } catch { /* ignore */ }
    try {
      inFlight = readdirSync(this.paths.inFlightDir()).filter((f) => f.endsWith(".json")).length;
    } catch { /* ignore */ }
    try {
      results = readdirSync(this.paths.resultsDir()).filter((f) => f.endsWith(".json")).length;
    } catch { /* ignore */ }
    try {
      rotatedLogs = readdirSync(this.paths.logsDir()).filter((f) => f.startsWith("events.") && f.endsWith(".ndjson")).length;
    } catch { /* ignore */ }

    // Check consumer lag
    const consumers: BridgeHealth["consumers"] = [];
    try {
      const consumerFiles = readdirSync(this.paths.consumerStateDir()).filter((f) => f.endsWith(".json"));
      for (const cf of consumerFiles) {
        const cp = JSON.parse(readFileSync(join(this.paths.consumerStateDir(), cf), "utf8"));
        const seqStore = this.seq.peek();
        consumers.push({
          consumerId: cf.replace(".json", ""),
          lastSeq: cp.lastSeq ?? 0,
          lagEvents: Math.max(0, seqStore - (cp.lastSeq ?? 0)),
          lastUpdate: cp.updatedAt ?? 0,
        });
      }
    } catch { /* ignore */ }

    // Detect issues
    if (inFlight > 10) issues.push(`${inFlight} commands stuck in-flight`);
    if (pendingCommands > 100) issues.push(`Command queue backing up: ${pendingCommands} pending`);
    for (const c of consumers) {
      if (c.lagEvents > 1000) issues.push(`Consumer ${c.consumerId} lagging by ${c.lagEvents} events`);
    }

    let currentFileSize = 0;
    try {
      currentFileSize = statSync(this.paths.currentEventsFile()).size;
    } catch { /* ignore */ }

    return {
      status: issues.length === 0 ? "healthy" : issues.length < 3 ? "degraded" : "unhealthy",
      lease: {
        active: leaseActive,
        ownerId: lease?.ownerId ?? null,
        ageMs: lease ? now - lease.startedAt : 0,
      },
      queues: { pendingCommands, inFlight, results },
      journal: {
        currentFileSize,
        rotatedFiles: rotatedLogs,
        lastSeq: this.seq.peek(),
      },
      consumers,
      issues,
    };
  }

  // ============================================================================
  // Garbage Collection
  // ============================================================================

  /**
   * Run garbage collection — delete old results and rotated logs.
   * Returns a report of what was deleted.
   */
  gc(options: { resultTtlMs?: number; logTtlMs?: number } = {}): GCReport {
    const resultTtlMs = options.resultTtlMs ?? 24 * 60 * 60 * 1000; // 24h
    const logTtlMs = options.logTtlMs ?? 7 * 24 * 60 * 60 * 1000; // 7 days
    const report: GCReport = { deletedResults: 0, deletedLogs: 0, errors: [] };
    const now = Date.now();

    // Clean old results
    try {
      const resultFiles = readdirSync(this.paths.resultsDir()).filter((f) => f.endsWith(".json"));
      for (const file of resultFiles) {
        const filePath = join(this.paths.resultsDir(), file);
        try {
          const stat = statSync(filePath);
          if (now - stat.mtimeMs > resultTtlMs) {
            unlinkSync(filePath);
            report.deletedResults++;
          }
        } catch (err) {
          report.errors.push(`result ${file}: ${String(err)}`);
        }
      }
    } catch (err) {
      report.errors.push(`results dir: ${String(err)}`);
    }

    // Clean old rotated logs (NEVER delete events.current.ndjson)
    try {
      const logFiles = readdirSync(this.paths.logsDir())
        .filter((f) => f.startsWith("events.") && f !== "events.current.ndjson" && f.endsWith(".ndjson"));
      for (const file of logFiles) {
        const filePath = join(this.paths.logsDir(), file);
        try {
          const stat = statSync(filePath);
          if (now - stat.mtimeMs > logTtlMs) {
            // Verify no consumer needs this file
            if (!this.isLogNeededByAnyConsumer(file)) {
              unlinkSync(filePath);
              report.deletedLogs++;
            }
          }
        } catch (err) {
          report.errors.push(`log ${file}: ${String(err)}`);
        }
      }
    } catch (err) {
      report.errors.push(`logs dir: ${String(err)}`);
    }

    return report;
  }

  // ============================================================================
  // Internal
  // ============================================================================

  private handleEvent(event: BridgeEvent): void {
    if (
      event.type === "result" ||
      event.type === "command-completed" ||
      event.type === "command-failed"
    ) {
      const id = (event as { id?: string }).id;
      if (id) {
        const pending = this.pendingResults.get(id);
        if (pending) {
          pending.resolve(event as unknown as BridgeResultEnvelope);
          return;
        }
      }
    }

    this.emit(event.type, event);
    this.emit("*", event);
  }

  // ---------------------------------------------------------------------------
  // Lease Management
  // ---------------------------------------------------------------------------

  private acquireLease(): boolean {
    const existing = this.readLease();
    if (existing && !this.isLeaseStale(existing)) {
      if (existing.ownerId === this.ownerId) {
        this.renewLease();
        return true;
      }
      return false; // Another owner is active
    }

    return this.tryAcquireLease();
  }

  private tryAcquireLease(): boolean {
    const lease: BridgeLease = {
      ownerId: this.ownerId,
      pid: process.pid,
      hostname: hostname(),
      startedAt: Date.now(),
      updatedAt: Date.now(),
      expiresAt: Date.now() + this.leaseTtlMs,
      ttlMs: this.leaseTtlMs,
      processTitle: process.title || "node",
      version: "2.0.0",
    };

    atomicWriteFile(this.paths.leaseFile(), JSON.stringify(lease, null, 2));

    // Verify post-write — another instance may have written between our read and write
    const written = this.readLease();
    return written?.ownerId === this.ownerId;
  }

  private renewLease(): void {
    const lease: BridgeLease = {
      ownerId: this.ownerId,
      pid: process.pid,
      hostname: hostname(),
      startedAt: Date.now(),
      updatedAt: Date.now(),
      expiresAt: Date.now() + this.leaseTtlMs,
      ttlMs: this.leaseTtlMs,
      processTitle: process.title || "node",
      version: "2.0.0",
    };

    atomicWriteFile(this.paths.leaseFile(), JSON.stringify(lease, null, 2));
  }

  private releaseLease(): void {
    try {
      const current = this.readLease();
      if (current?.ownerId === this.ownerId) {
        unlinkSync(this.paths.leaseFile());
      }
    } catch { /* ignore */ }
  }

  private readLease(): BridgeLease | null {
    try {
      const content = readFileSync(this.paths.leaseFile(), "utf8");
      return JSON.parse(content) as BridgeLease;
    } catch {
      return null;
    }
  }

  private isLeaseStale(lease: BridgeLease): boolean {
    // Expired by TTL
    if (Date.now() > lease.expiresAt) return true;

    // Process is dead (only check on same hostname)
    if (lease.hostname === hostname()) {
      if (!this.isProcessAlive(lease.pid)) {
        return true;
      }
      // PID recycling check: verify process title matches
      if (process.platform === "linux" && lease.processTitle) {
        try {
          const cmdline = readFileSync(`/proc/${lease.pid}/cmdline`, "utf8").replace(/\0/g, " ");
          if (!cmdline.includes(lease.processTitle)) {
            return true; // PID recycled to different process
          }
        } catch { /* can't verify, trust TTL */ }
      }
    }

    return false;
  }

  private isProcessAlive(pid: number): boolean {
    try {
      process.kill(pid, 0); // Signal 0 = check existence
      return true;
    } catch {
      return false; // ESRCH = process doesn't exist
    }
  }

  // ---------------------------------------------------------------------------
  // Crash Recovery
  // ---------------------------------------------------------------------------

  private recoverInconsistentState(): void {
    try {
      const inFlightFiles = readdirSync(this.paths.inFlightDir()).filter((f) => f.endsWith(".json"));

      for (const file of inFlightFiles) {
        const filePath = join(this.paths.inFlightDir(), file);
        const cmdId = this.extractCmdId(file);
        const resultPath = this.paths.resultFilePath(cmdId);

        if (existsSync(resultPath)) {
          // Result exists but in-flight wasn't cleaned up — just clean up
          try {
            unlinkSync(filePath);
          } catch { /* ignore */ }

          this.eventWriter.append({
            seq: this.seq.next(),
            ts: Date.now(),
            type: "command-recovered",
            id: cmdId,
            note: "result existed but in-flight was not cleaned",
          });
        } else {
          // No result — command was in flight when process crashed
          try {
            const content = readFileSync(filePath, "utf8");
            const cmd = JSON.parse(content);

            if ((cmd.attempt ?? 1) < 3) {
              // Re-queue for retry
              cmd.attempt = (cmd.attempt ?? 1) + 1;
              const newFile = this.paths.commandFilePath(cmd.seq, cmd.type);
              atomicWriteFile(newFile, JSON.stringify(cmd));
              unlinkSync(filePath);

              this.eventWriter.append({
                seq: this.seq.next(),
                ts: Date.now(),
                type: "command-requeued",
                id: cmdId,
                attempt: cmd.attempt,
              });
            } else {
              // Max retries — mark as failed
              const failResult: BridgeResultEnvelope = {
                protocolVersion: 2,
                id: cmdId,
                seq: cmd.seq,
                completedAt: Date.now(),
                status: "failed",
                ok: false,
                error: {
                  code: "MAX_RETRIES",
                  message: `Command failed after ${cmd.attempt} attempts`,
                  phase: "execute",
                },
              };
              atomicWriteFile(resultPath, JSON.stringify(failResult));
              unlinkSync(filePath);

              this.eventWriter.append({
                seq: this.seq.next(),
                ts: Date.now(),
                type: "command-failed",
                id: cmdId,
                note: "max retries exceeded",
              });
            }
          } catch { /* corrupted file — move to dead-letter */ }
        }
      }
    } catch (err) {
      this.emit("recovery-error", err);
    }
  }

  // ---------------------------------------------------------------------------
  // Dead Letter
  // ---------------------------------------------------------------------------

  private moveToDeadLetter(filePath: string, error: unknown): void {
    const basename = `${Date.now()}-${require("node:path").basename(filePath)}`;
    const dstPath = this.paths.deadLetterFile(basename);
    try {
      ensureDir(this.paths.deadLetterDir());
      renameSync(filePath, dstPath);
      require("node:fs").writeFileSync(
        `${dstPath}.error.json`,
        JSON.stringify({ originalFile: require("node:path").basename(filePath), error: String(error), movedAt: Date.now() }),
      );
    } catch { /* ignore — if we can't move to dead-letter, leave it */ }
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private extractCmdId(filename: string): string {
    // Format: 000000000001-addDevice.json → cmd_000000000001
    const seq = filename.replace(".json", "").split("-")[0] ?? "0";
    return `cmd_${seq.padStart(12, "0")}`;
  }

  private isLogNeededByAnyConsumer(logFile: string): boolean {
    try {
      const consumerFiles = readdirSync(this.paths.consumerStateDir()).filter((f) => f.endsWith(".json"));
      for (const cf of consumerFiles) {
        const cp = JSON.parse(readFileSync(join(this.paths.consumerStateDir(), cf), "utf8"));
        if (cp.currentFile === logFile) return true;
      }
    } catch { /* ignore */ }
    return false;
  }
}

// -----------------------------------------------------------------------------
// Diagnostics Types
// -----------------------------------------------------------------------------

export interface BridgeHealth {
  status: "healthy" | "degraded" | "unhealthy";
  lease: {
    active: boolean;
    ownerId: string | null;
    ageMs: number;
  };
  queues: {
    pendingCommands: number;
    inFlight: number;
    results: number;
  };
  journal: {
    currentFileSize: number;
    rotatedFiles: number;
    lastSeq: number;
  };
  consumers: Array<{
    consumerId: string;
    lastSeq: number;
    lagEvents: number;
    lastUpdate: number;
  }>;
  issues: string[];
}

export interface GCReport {
  deletedResults: number;
  deletedLogs: number;
  errors: string[];
}

// -----------------------------------------------------------------------------
// Utilities
// -----------------------------------------------------------------------------

function checksumOf(input: unknown): string {
  return `sha256:${createHash("sha256")
    .update(JSON.stringify(input))
    .digest("hex")}`;
}
