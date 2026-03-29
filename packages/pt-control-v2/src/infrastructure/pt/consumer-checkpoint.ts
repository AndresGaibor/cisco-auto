/**
 * Checkpoint Manager for DurableNdjsonConsumer
 *
 * Handles reading, writing, and caching of consumer checkpoints.
 * Implements throttled writes to avoid excessive disk I/O during large reads.
 */
import { existsSync, readFileSync } from "node:fs";
import { statSync } from "node:fs";
import { atomicWriteFile } from "./shared/fs-atomic.js";
import type { ConsumerCheckpoint } from "./shared/protocol.js";
import { BridgePathLayout } from "./shared/path-layout.js";

export class CheckpointManager {
  private checkpointCache: ConsumerCheckpoint | null = null;
  private lastCheckpointWrite = 0;
  private readonly CHECKPOINT_WRITE_INTERVAL = 10; // ms

  constructor(
    private readonly paths: BridgePathLayout,
    private readonly consumerId: string,
    private readonly startFromBeginning: boolean,
  ) {}

  /**
   * Read the current checkpoint from disk, or create a fresh one if none exists.
   */
  read(): ConsumerCheckpoint {
    if (!existsSync(this.checkpointFile())) {
      const checkpoint = this.fresh();
      this.write(checkpoint);
      this.checkpointCache = checkpoint;
      this.lastCheckpointWrite = Date.now();
      return checkpoint;
    }

    try {
      const raw = JSON.parse(
        readFileSync(this.checkpointFile(), "utf8"),
      ) as ConsumerCheckpoint;
      this.checkpointCache = raw;
      return { ...raw }; // Return a COPY to avoid same-object reference issues
    } catch {
      return this.fresh();
    }
  }

  /**
   * Write checkpoint to disk. Uses atomic write and avoids redundant writes.
   */
  write(checkpoint: ConsumerCheckpoint): void {
    if (
      this.checkpointCache &&
      this.checkpointCache.byteOffset === checkpoint.byteOffset &&
      this.checkpointCache.lastSeq === checkpoint.lastSeq &&
      this.checkpointCache.currentFile === checkpoint.currentFile
    ) {
      return;
    }

    atomicWriteFile(this.checkpointFile(), JSON.stringify(checkpoint, null, 2));
    this.checkpointCache = checkpoint;
  }

  /**
   * Create a fresh checkpoint based on startFromBeginning setting.
   */
  fresh(): ConsumerCheckpoint {
    const currentFile = this.relativeLogFile(this.paths.currentEventsFile());
    let byteOffset = 0;
    if (!this.startFromBeginning && existsSync(this.paths.currentEventsFile())) {
      byteOffset = statSync(this.paths.currentEventsFile()).size;
    }
    return {
      consumerId: this.consumerId,
      currentFile,
      byteOffset,
      lastSeq: 0,
      updatedAt: Date.now(),
    };
  }

  /**
   * Whether enough time has elapsed to allow a throttled checkpoint write.
   */
  canWriteCheckpoint(): boolean {
    return Date.now() - this.lastCheckpointWrite > this.CHECKPOINT_WRITE_INTERVAL;
  }

  markCheckpointWritten(): void {
    this.lastCheckpointWrite = Date.now();
  }

  getCheckpointFile(): string {
    return this.paths.consumerCheckpointFile(this.consumerId);
  }

  private checkpointFile(): string {
    return this.paths.consumerCheckpointFile(this.consumerId);
  }

  private relativeLogFile(filePath: string): string {
    return filePath.split("/").pop() ?? "events.current.ndjson";
  }
}
