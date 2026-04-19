/**
 * File Resolver for DurableNdjsonConsumer
 *
 * Handles resolving relative file paths to absolute paths,
 * and finding the next rotated log file.
 * Supports the rotation manifest to recover events from rotated files.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import type { ConsumerCheckpoint, RotationManifest } from "./shared/local-types.js";
import { BridgePathLayout } from "./shared/path-layout.js";

export class FileResolver {
  constructor(private readonly paths: BridgePathLayout) {}

  /**
   * Resolve a relative filename to an absolute path.
   * Falls back to currentEventsFile if the relative file doesn't exist.
   */
  resolve(relativeName: string): string | null {
    const full = join(this.paths.logsDir(), relativeName);
    if (existsSync(full)) return full;

    const current = this.paths.currentEventsFile();
    if (existsSync(current)) return current;

    return null;
  }

  /**
   * Resolve a checkpoint to its file path and offset, handling rotation.
   * If the checkpoint points to a rotated file (no longer at current size),
   * looks up the rotation manifest to find the correct file.
   * Returns null if no readable file can be found.
   */
  resolveWithRotation(
    checkpoint: ConsumerCheckpoint,
    onDataLoss?: (info: { reason: string; lostFromOffset: number; checkpoint: ConsumerCheckpoint }) => void,
  ): { filePath: string; offset: number } | null {
    const currentFilePath = join(this.paths.logsDir(), checkpoint.currentFile);
    let currentSize: number;

    try {
      currentSize = statSync(currentFilePath).size;
    } catch {
      // File doesn't exist — fall back to events.current.ndjson
      const fallback = this.paths.currentEventsFile();
      if (existsSync(fallback)) {
        return { filePath: fallback, offset: 0 };
      }
      return null;
    }

    // Normal case: checkpoint offset is within current file size
    if (checkpoint.byteOffset <= currentSize) {
      return { filePath: currentFilePath, offset: checkpoint.byteOffset };
    }

    // Offset is beyond current file size — file may have been rotated.
    // Look up the rotation manifest to find the rotated file.
    const manifest = this.readManifest();
    if (!manifest) {
      // No manifest — data loss, reset
      onDataLoss?.({
        reason: "no rotation manifest found",
        lostFromOffset: checkpoint.byteOffset,
        checkpoint,
      });
      return { filePath: currentFilePath, offset: 0 };
    }

    // Find a rotation entry where the checkpoint file matches and it was rotated after the checkpoint
    const rotated = manifest.rotations.find(
      (r) =>
        r.previousFile === checkpoint.currentFile &&
        r.rotatedAt > checkpoint.updatedAt,
    );

    if (rotated) {
      const rotatedPath = join(this.paths.logsDir(), rotated.file);
      if (existsSync(rotatedPath)) {
        return { filePath: rotatedPath, offset: checkpoint.byteOffset };
      }
    }

    // Rotated file not found — data loss
    onDataLoss?.({
      reason: "rotated file not found in manifest",
      lostFromOffset: checkpoint.byteOffset,
      checkpoint,
    });
    return { filePath: currentFilePath, offset: 0 };
  }

  /**
   * Find the next rotated file after the current one.
   * Rotated files are named events.<timestamp>.ndjson.
   */
  findNextRotatedFile(currentPath: string): string | null {
    let files: string[];
    try {
      files = readdirSync(this.paths.logsDir())
        .filter((f) => f.startsWith("events.") && f.endsWith(".ndjson"))
        .sort();
    } catch {
      return null;
    }

    const current = this.toRelative(currentPath);
    const idx = files.indexOf(current);
    if (idx >= 0 && idx + 1 < files.length) {
      return join(this.paths.logsDir(), files[idx + 1]!);
    }

    return null;
  }

  /**
   * Convert an absolute path to a relative filename within the logs directory.
   */
  toRelative(absolutePath: string): string {
    return absolutePath.split("/").pop() ?? "events.current.ndjson";
  }

  private readManifest(): RotationManifest | null {
    const manifestFile = this.paths.rotationManifestFile();
    if (!existsSync(manifestFile)) return null;

    try {
      const content = readFileSync(manifestFile, "utf8");
      return JSON.parse(content) as RotationManifest;
    } catch {
      return null;
    }
  }
}
