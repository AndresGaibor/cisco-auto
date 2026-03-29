/**
 * Append-only NDJSON event log writer.
 *
 * Events are appended line-by-line to events.current.ndjson.
 * When the file exceeds rotateAtBytes, it is rotated to a timestamped file
 * and a new current file is started.
 *
 * This avoids the v1 pattern of reading the entire file, concatenating,
 * and rewriting — which was neither safe nor scalable.
 */
import { statSync, renameSync } from "node:fs";
import { join } from "node:path";
import type { BridgeEvent } from "./shared/protocol.js";
import { BridgePathLayout } from "./shared/path-layout.js";
import { appendLine, ensureDir, ensureFile } from "./shared/fs-atomic.js";

export interface EventLogWriterOptions {
  /** Max size in bytes before rotating (default: 32MB) */
  rotateAtBytes?: number;
}

export class EventLogWriter {
  private readonly rotateAtBytes: number;
  private readonly currentFile: string;
  private readonly logsDir: string;

  constructor(
    private readonly paths: BridgePathLayout,
    options: EventLogWriterOptions = {},
  ) {
    this.rotateAtBytes = options.rotateAtBytes ?? 32 * 1024 * 1024;
    this.logsDir = paths.logsDir();
    this.currentFile = paths.currentEventsFile();

    ensureDir(this.logsDir);
    ensureFile(this.currentFile, "");
  }

  /**
   * Append an event to the current log file.
   * The event's seq and ts are used as-is; caller is responsible for setting them.
   * If the file exceeds rotateAtBytes, rotation happens automatically.
   */
  append(event: BridgeEvent): void {
    this.rotateIfNeeded();
    appendLine(this.currentFile, JSON.stringify(event));
  }

  /**
   * Check if rotation is needed and perform it atomically.
   * Renames current to a timestamped file and creates a new empty current.
   */
  private rotateIfNeeded(): void {
    let size: number;
    try {
      size = statSync(this.currentFile).size;
    } catch {
      size = 0;
    }

    if (size < this.rotateAtBytes) return;

    const timestamp = Date.now();
    const rotated = join(this.logsDir, `events.${timestamp}.ndjson`);

    // Rotate by renaming current to timestamped file
    renameSync(this.currentFile, rotated);

    // Create a new empty current file
    ensureFile(this.currentFile, "");
  }
}
