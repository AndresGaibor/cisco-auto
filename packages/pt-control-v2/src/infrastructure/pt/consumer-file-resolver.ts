/**
 * File Resolver for DurableNdjsonConsumer
 *
 * Handles resolving relative file paths to absolute paths,
 * and finding the next rotated log file.
 */
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
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

    // Fallback to current
    const current = this.paths.currentEventsFile();
    if (existsSync(current)) return current;

    return null;
  }

  /**
   * Find the next rotated file after the current one.
   * Rotated files are named events.<timestamp>.ndjson.
   */
  findNext(currentPath: string): string | null {
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
}
