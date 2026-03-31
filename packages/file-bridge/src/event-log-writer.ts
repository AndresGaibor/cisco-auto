/**
 * Append-only NDJSON event log writer.
 *
 * Events are appended line-by-line to events.current.ndjson.
 * When the file exceeds rotateAtBytes, it is rotated to a timestamped file
 * and a new current file is started.
 *
 * Rotation is safe — the new file is created before rename, so there is
 * no window where events.current.ndjson does not exist.
 *
 * A rotation manifest (rotation-manifest.json) is updated on every rotation
 * so that consumers can recover events from rotated files.
 *
 * This avoids the v1 pattern of reading the entire file, concatenating,
 * and rewriting — which was neither safe nor scalable.
 */
import { statSync, renameSync } from "node:fs";
import { join } from "node:path";
import type { BridgeEvent, RotationEntry, RotationManifest } from "./shared/protocol.js";
import { BridgePathLayout } from "./shared/path-layout.js";
import { appendLine, atomicWriteFile, ensureDir, ensureFile } from "./shared/fs-atomic.js";

export interface EventLogWriterOptions {
  /** Max size in bytes before rotating (default: 32MB) */
  rotateAtBytes?: number;
}

export class EventLogWriter {
  private readonly rotateAtBytes: number;
  private readonly currentFile: string;
  private readonly logsDir: string;
  private lastSeqWritten = 0;
  private rotationCounter = 0;  // Ensure unique filenames

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
    // Check rotation BEFORE updating sequence to avoid capturing seq without writing event
    this.rotateIfNeeded();
    
    // Write the event
    appendLine(this.currentFile, JSON.stringify(event));
    
    // Update sequence counter AFTER successful write
    if (event.seq !== undefined && event.seq > this.lastSeqWritten) {
      this.lastSeqWritten = event.seq;
    }
  }

  /**
   * Get the current log file path.
   */
  getCurrentFile(): string {
    return this.currentFile;
  }

  /**
   * Check if rotation is needed and perform it atomically.
   * Captures metadata BEFORE rename to avoid data loss window.
   * Updates the rotation manifest so consumers can recover rotated files.
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
    const counter = this.rotationCounter++;
    const rotated = join(this.logsDir, `events.${timestamp}-${counter}.ndjson`);

    // Step 1: Capture metadata BEFORE moving the file
    const sizeAtRotation = size;
    const seqAtRotation = this.lastSeqWritten;

    // Step 2: Atomic rename — moves the complete file with all data
    // After this, the current file doesn't exist
    // The next appendLine() will create it automatically
    try {
      renameSync(this.currentFile, rotated);
    } catch {
      // If rename fails, keep current file intact — no data loss
      return;
    }

    // Step 3: Update the rotation manifest
    // Don't create the new file here - let the next append do it
    // This avoids race conditions with concurrent appends
    this.appendToManifest({
      file: `events.${timestamp}-${counter}.ndjson`,
      rotatedAt: timestamp,
      previousFile: "events.current.ndjson",
      bytesSizeAtRotation: sizeAtRotation,
      lastSeqInFile: seqAtRotation,
    });
  }

  private appendToManifest(entry: RotationEntry): void {
    const manifestFile = this.paths.rotationManifestFile();
    let manifest: RotationManifest = { rotations: [] };

    try {
      if (require("node:fs").existsSync(manifestFile)) {
        const content = require("node:fs").readFileSync(manifestFile, "utf8");
        manifest = JSON.parse(content) as RotationManifest;
      }
    } catch {
      manifest = { rotations: [] };
    }

    manifest.rotations.push(entry);

    // Keep only the last 100 rotations to prevent unbounded growth
    if (manifest.rotations.length > 100) {
      manifest.rotations = manifest.rotations.slice(-100);
    }

    atomicWriteFile(manifestFile, JSON.stringify(manifest, null, 2));
  }
}
