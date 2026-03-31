/**
 * Durable NDJSON Consumer
 *
 * Reads NDJSON events from the log directory without losing data.
 * Key features:
 * - Persists byteOffset + lastSeq checkpoint to disk
 * - Handles file truncation and rotation
 * - Uses watcher + poll for resilience
 * - Maintains leftover buffer for partial lines
 * - Detects sequence gaps
 * - Uses StringDecoder for proper UTF-8 multibyte handling
 * - Supports rotation manifest to recover events from rotated files
 *
 * This replaces the v1 FastEventStream which had no checkpointing
 * and relied solely on tail-from-end behavior.
 */
import {
  closeSync,
  existsSync,
  openSync,
  readSync,
  statSync,
  watch,
  type FSWatcher,
} from "node:fs";
import { StringDecoder } from "string_decoder";
import { EventEmitter } from "node:events";
import { ensureDir, ensureFile } from "./shared/fs-atomic.js";
import type {
  BridgeEvent,
  ConsumerCheckpoint,
  RotationManifest,
} from "./shared/protocol.js";
import { BridgeEventSchema } from "./shared/protocol.js";
import { BridgePathLayout } from "./shared/path-layout.js";
import { CheckpointManager } from "./consumer-checkpoint.js";
import { FileResolver } from "./consumer-file-resolver.js";

export interface DurableNdjsonConsumerOptions {
  consumerId: string;
  /** Polling interval in ms (default: 300ms) */
  pollIntervalMs?: number;
  /** Read buffer size in bytes (default: 64KB) */
  bufferSize?: number;
  /** If true, start from beginning of file; if false, start from end (default: false) */
  startFromBeginning?: boolean;
  /** Called for each successfully parsed event */
  onEvent?: (event: BridgeEvent) => void;
  /** Called when a sequence gap is detected */
  onGap?: (expected: number, actual: number) => void;
  /** Called when a line fails to parse */
  onParseError?: (line: string, error: unknown) => void;
  /** Called when data loss is detected (e.g., rotated file not found) */
  onDataLoss?: (info: { reason: string; lostFromOffset: number; checkpoint: ConsumerCheckpoint }) => void;
}

export class DurableNdjsonConsumer extends EventEmitter {
  private readonly pollIntervalMs: number;
  private readonly bufferSize: number;

  private watcher: FSWatcher | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private fd: number | null = null;
  private currentFilePath: string | null = null;
  private leftover = "";
  private running = false;
  private consecutiveParseErrors = 0;

  private readonly checkpointManager: CheckpointManager;
  private readonly fileResolver: FileResolver;
  private decoder = new StringDecoder("utf8");

  private static readonly MAX_CONSECUTIVE_ERRORS = 50;

  constructor(
    private readonly paths: BridgePathLayout,
    private readonly options: DurableNdjsonConsumerOptions,
  ) {
    super();
    this.pollIntervalMs = options.pollIntervalMs ?? 300;
    this.bufferSize = options.bufferSize ?? 64 * 1024;

    this.checkpointManager = new CheckpointManager(
      paths,
      options.consumerId,
      options.startFromBeginning ?? false,
    );
    this.fileResolver = new FileResolver(paths);
  }

  /** Start consuming events */
  start(): void {
    if (this.running) return;
    this.running = true;

    ensureDir(this.paths.consumerStateDir());
    ensureDir(this.paths.logsDir());
    ensureFile(this.paths.currentEventsFile(), "");

    this.reopenFromCheckpoint();

    this.watcher = watch(this.paths.logsDir(), () => {
      this.poll();
    });

    this.timer = setInterval(() => {
      this.poll();
    }, this.pollIntervalMs);

    this.poll();
  }

  /** Stop consuming and release resources */
  stop(): void {
    this.running = false;

    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }

    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    if (this.fd !== null) {
      try {
        closeSync(this.fd);
      } catch {
        // ignore
      }
      this.fd = null;
    }

    this.currentFilePath = null;
    this.leftover = "";
  }

  /** Trigger a poll manually */
  poll(): void {
    if (!this.running) return;

    const checkpoint = this.checkpointManager.read();
    const resolved = this.fileResolver.resolveWithRotation(checkpoint, (info) => {
      this.emit("data-loss", info);
      this.options.onDataLoss?.(info);
    });

    if (!resolved) {
      ensureFile(this.paths.currentEventsFile(), "");
      return;
    }

    // If file changed (rotated or recreated) or fd is stale, reopen it
    if (this.currentFilePath !== resolved.filePath || this.fd === null) {
      this.reopenFile(resolved.filePath);
      // Reset decoder when switching files to avoid carryover of incomplete multibyte chars
      this.decoder = new StringDecoder("utf8");
    }

    if (this.fd === null || this.currentFilePath === null) return;

    let stats: ReturnType<typeof statSync>;
    try {
      stats = statSync(this.currentFilePath);
    } catch {
      return;
    }

    // Handle truncation: if file shrunk, reset to beginning
    let offset = resolved.offset;
    if (offset > stats.size) {
      offset = 0;
      this.leftover = "";
      this.decoder = new StringDecoder("utf8");
    }

    // Nothing new to read
    if (offset >= stats.size) {
      const nextFile = this.fileResolver.findNextRotatedFile(this.currentFilePath);
      if (nextFile) {
        this.reopenFile(nextFile);
        this.poll();
      }
      return;
    }

    const buffer = Buffer.alloc(this.bufferSize);

    while (true) {
      const previousLeftover = this.leftover;
      this.leftover = "";

      const bytesRead = readSync(this.fd, buffer, 0, buffer.length, offset);
      if (bytesRead <= 0) {
        this.leftover = previousLeftover;
        break;
      }

      // StringDecoder handles incomplete multibyte characters correctly —
      // it buffers bytes that don't form a complete character until the next write()
      const chunk = previousLeftover + this.decoder.write(buffer.subarray(0, bytesRead));
      const lines = chunk.split("\n");
      this.leftover = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.trim()) continue;

        try {
          const raw = JSON.parse(line);
          const result = BridgeEventSchema.safeParse(raw);

          // Reset error counter on successful parse
          this.consecutiveParseErrors = 0;

          let event: BridgeEvent;
          if (result.success) {
            event = result.data as BridgeEvent;
          } else {
            event = raw as BridgeEvent;
            this.emit("parse-error", {
              type: "parse-error" as const,
              raw,
              line,
              error: "Validation failed",
              issues: result.error.issues.map((issue) => ({
                path: issue.path,
                message: issue.message,
              })),
            });
            this.options.onParseError?.(line, result.error);
          }

          if (event.seq !== undefined) {
            this.validateSequence(checkpoint.lastSeq, event.seq);
          }

          this.emit("event", event);
          this.options.onEvent?.(event);

          if (event.seq !== undefined) {
            checkpoint.lastSeq = event.seq;
          }
        } catch (err) {
          // JSON parse error — increment error counter
          this.consecutiveParseErrors++;

          const parseError = {
            type: "parse-error" as const,
            raw: null,
            line,
            error: String(err),
            recoverable: true,
            consecutiveErrors: this.consecutiveParseErrors,
          };
          this.emit("parse-error", parseError);
          this.options.onParseError?.(line, err);

          // If too many consecutive errors, the file is likely corrupted
          if (this.consecutiveParseErrors >= DurableNdjsonConsumer.MAX_CONSECUTIVE_ERRORS) {
            this.emit("data-loss", {
              reason: "too many consecutive parse errors",
              errorCount: this.consecutiveParseErrors,
              lastError: String(err),
              lostFromOffset: checkpoint.byteOffset,
              checkpoint,
            });

            // Skip to end of file to avoid infinite loop
            this.consecutiveParseErrors = 0;
            offset = stats.size;
            checkpoint.byteOffset = offset;
            break;
          }

          // Skip this corrupted line and continue with next line
          continue;
        }
      }

      offset += bytesRead;
      checkpoint.byteOffset = offset;
      checkpoint.currentFile = this.fileResolver.toRelative(this.currentFilePath);
      checkpoint.updatedAt = Date.now();

      // Throttle checkpoint writes during the loop
      if (this.checkpointManager.canWriteCheckpoint()) {
        this.checkpointManager.write(checkpoint);
        this.checkpointManager.markCheckpointWritten();
      }

      if (bytesRead < buffer.length) break;
    }

    // Flush any remaining incomplete multibyte characters from the decoder
    const remaining = this.decoder.end();
    if (remaining) {
      this.leftover = remaining;
    }

    // Final checkpoint write — ALWAYS write at end of poll
    checkpoint.byteOffset = offset;
    this.checkpointManager.write(checkpoint);
    this.checkpointManager.markCheckpointWritten();
  }

  private validateSequence(lastSeq: number, currentSeq: number): void {
    if (lastSeq === 0) return;
    const expected = lastSeq + 1;
    if (currentSeq !== expected) {
      this.emit("gap", { expected, actual: currentSeq });
      this.options.onGap?.(expected, currentSeq);
    }
  }

  private reopenFromCheckpoint(): void {
    const checkpoint = this.checkpointManager.read();
    const resolved = this.fileResolver.resolveWithRotation(checkpoint);
    if (resolved) {
      this.reopenFile(resolved.filePath);
    }
  }

  private reopenFile(filePath: string): void {
    if (this.fd !== null) {
      try {
        closeSync(this.fd);
      } catch {
        // ignore
      }
      this.fd = null;
    }

    this.fd = openSync(filePath, "r");
    this.currentFilePath = filePath;
    this.leftover = "";
    this.decoder = new StringDecoder("utf8");
  }
}
