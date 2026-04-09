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
  readFileSync,
  readdirSync,
  unlinkSync,
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
    } catch (err) {
      const error = err as NodeJS.ErrnoException;
      if (error.code === "ENOENT" && attempt < maxRetries - 1) {
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

/**
 * Safely delete a file, ignoring errors if it doesn't exist.
 * Returns true if deletion succeeded or file didn't exist.
 */
export function safeUnlink(path: string): boolean {
  try {
    unlinkSync(path);
    return true;
  } catch (err) {
    const error = err as NodeJS.ErrnoException;
    if (error.code === "ENOENT") return true;
    return false;
  }
}

/**
 * Safely rename/move a file, creating destination directory if needed.
 * Uses atomic rename which is atomic on POSIX systems.
 * Returns true if rename succeeded.
 */
export function safeRename(src: string, dst: string): boolean {
  try {
    ensureDir(dirname(dst));
    renameSync(src, dst);
    return true;
  } catch {
    return false;
  }
}

/**
 * Read and parse a JSON file safely.
 * Returns null if file doesn't exist or is invalid JSON.
 */
export function readJsonFile<T = unknown>(path: string): T | null {
  try {
    const content = readFileSync(path, "utf8");
    if (!content.trim()) return null;
    return JSON.parse(content) as T;
  } catch (err) {
    const error = err as NodeJS.ErrnoException;
    if (error.code === "ENOENT") return null;
    return null;
  }
}

/**
 * List all .json files in a directory, sorted alphabetically.
 * Returns empty array if directory doesn't exist or can't be read.
 */
export function listJsonFiles(dir: string): string[] {
  try {
    return readdirSync(dir)
      .filter((f) => f.endsWith(".json"))
      .sort();
  } catch {
    return [];
  }
}

/**
 * Alias semántico para safeRename — el lenguaje correcto en el bridge es
 * "mover atómicamente" no "renombrar".
 */
export function atomicMoveFile(src: string, dst: string): boolean {
  return safeRename(src, dst);
}

/**
 * Leer y parsear JSON, lanzando error si el archivo falta o es inválido.
 * Útil cuando la ausencia de un archivo es un error de lógica, no un caso esperado.
 */
export function readJsonFileOrThrow<T = unknown>(path: string): T {
  const value = readJsonFile<T>(path);
  if (value === null) {
    throw new Error(`Invalid or missing JSON file: ${path}`);
  }
  return value;
}
