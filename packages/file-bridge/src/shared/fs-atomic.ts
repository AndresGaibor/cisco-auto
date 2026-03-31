/**
 * Filesystem utilities with atomic write guarantees.
 * Never write directly to the final path — always use atomicWriteFile.
 */
import {
  mkdirSync,
  openSync,
  writeSync,
  fsyncSync,
  closeSync,
  renameSync,
  appendFileSync,
  existsSync,
} from "node:fs";
import { dirname } from "node:path";

/**
 * Ensure a directory exists, creating it recursively if needed.
 */
export function ensureDir(path: string): void {
  mkdirSync(path, { recursive: true });
}

/**
 * Atomically write content to a file using tmp+fsync+rename pattern.
 * This guarantees readers never see a partial write.
 */
export function atomicWriteFile(path: string, content: string): void {
  ensureDir(dirname(path));
  const tmp = `${path}.tmp`;
  const fd = openSync(tmp, "w");

  try {
    writeSync(fd, content, 0, "utf8");
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }

  renameSync(tmp, path);
}

/**
 * Append a single line to a file (no trailing newline assumed).
 * The line parameter should NOT include the trailing newline — this function adds it.
 * Does NOT use atomic write since appends are inherently safer than overwrites.
 * Retries on ENOENT to handle file rotation window.
 */
export function appendLine(path: string, line: string): void {
  ensureDir(dirname(path));
  const content = line.endsWith("\n") ? line : `${line}\n`;
  
  // Simple retry logic for rotation window
  // Don't use atomicWriteFile for retry - just let appendFileSync create the file
  const maxRetries = 3;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      appendFileSync(path, content, "utf8");
      return;
    } catch (err: any) {
      if (err.code === "ENOENT" && attempt < maxRetries - 1) {
        // File was rotated — appendFileSync will create it on next retry
        continue;
      }
      throw err;
    }
  }
}

/**
 * Ensure a file exists, creating it with initial content if it doesn't.
 * Uses atomic write so the file is never observed in a partial state.
 */
export function ensureFile(path: string, initial = ""): void {
  if (!existsSync(path)) {
    atomicWriteFile(path, initial);
  }
}
