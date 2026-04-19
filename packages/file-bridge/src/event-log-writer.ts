/**
 * Append-only NDJSON event log writer.
 *
 * Events are appended line-by-line to events.current.ndjson.
 * When the file exceeds rotateAtBytes, it is rotated to a timestamped file
 * and a new current file is started lazily on the next append.
 *
 * IMPORTANT:
 * - Rotation uses atomic rename for the completed file.
 * - There may be a short window after rename where events.current.ndjson
 *   does not yet exist; the next append recreates it.
 * - The rotation manifest is updated after rotation so consumers can
 *   recover rotated files safely.
 */
import { existsSync, readFileSync, statSync, renameSync } from "node:fs";
import { join } from "node:path";
import type { BridgeEvent } from "./shared/protocol.js";
import type { RotationEntry, RotationManifest } from "./shared/local-types.js";
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
  private rotationCounter = 0;

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

  append(event: BridgeEvent): void {
    this.rotateIfNeeded();
    appendLine(this.currentFile, JSON.stringify(event));

    if (event.seq !== undefined && event.seq > this.lastSeqWritten) {
      this.lastSeqWritten = event.seq;
    }
  }

  getCurrentFile(): string {
    return this.currentFile;
  }

  private rotateIfNeeded(): void {
    let size = 0;
    try {
      size = statSync(this.currentFile).size;
    } catch {
      size = 0;
    }

    if (size < this.rotateAtBytes) return;

    const timestamp = Date.now();
    const counter = this.rotationCounter++;
    const rotatedFileName = `events.${timestamp}-${counter}.ndjson`;
    const rotated = join(this.logsDir, rotatedFileName);

    const sizeAtRotation = size;
    const seqAtRotation = this.lastSeqWritten;

    try {
      renameSync(this.currentFile, rotated);
    } catch {
      return;
    }

    this.appendToManifest({
      file: rotatedFileName,
      rotatedAt: timestamp,
      previousFile: "events.current.ndjson",
      bytesSizeAtRotation: sizeAtRotation,
      lastSeqInFile: seqAtRotation,
    });

    ensureFile(this.currentFile, "");
  }

  private appendToManifest(entry: RotationEntry): void {
    const manifestFile = this.paths.rotationManifestFile();
    let manifest: RotationManifest = { rotations: [] };

    try {
      if (existsSync(manifestFile)) {
        const content = readFileSync(manifestFile, "utf8");
        manifest = JSON.parse(content) as RotationManifest;
      }
    } catch {
      manifest = { rotations: [] };
    }

    manifest.rotations.push(entry);

    if (manifest.rotations.length > 100) {
      manifest.rotations = manifest.rotations.slice(-100);
    }

    atomicWriteFile(manifestFile, JSON.stringify(manifest, null, 2));
  }
}
