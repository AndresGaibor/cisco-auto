/**
 * Generador persistente de números de secuencia.
 *
 * Genera seq numbers monotonic que sobreviven a restarts del proceso.
 * Usa file locking advisory para prevenir race conditions en next().
 *
 * El lock se adquiere con O_EXCL (creación atómica) y tiene retry
 * con exponential backoff. Lock files stale se limpian automáticamente.
 */
import { join } from "node:path";
import {
  closeSync,
  existsSync,
  openSync,
  readFileSync,
  unlinkSync,
  writeSync,
} from "node:fs";
import { atomicWriteFile } from "./fs-atomic.js";
import { CommandSeq } from "./command-seq.js";

interface SequenceState {
  nextSeq: number;
}

const LOCK_RETRIES = 50;
const LOCK_RETRY_BASE_MS = 10;
const LOCK_MAX_MS = 500;
const LOCK_STALE_THRESHOLD_MS = 10_000;

/**
 * Store persistente de secuencias con locking para entornos multi-proceso.
 */
export class SequenceStore {
  private readonly storeFile: string;
  private readonly lockFile: string;

  /**
   * @param root - Directorio raíz del bridge
   */
  constructor(private readonly root: string) {
    this.storeFile = join(root, "protocol.seq.json");
    this.lockFile = `${this.storeFile}.lock`;
  }

  /**
   * Obtiene el siguiente número de secuencia de forma atómica.
   * Usa advisory file locking para prevenir que múltiples procesos
   * generen el mismo número.
   *
   * @returns El siguiente seq number (empieza en 1)
   * @throws Error si no puede adquirir lock tras máximo de reintentos
   */
  next(): number {
    const lockFd = this.acquireLock();
    try {
      const current = this.read();
      const seq = current.nextSeq;
      this.write({ nextSeq: seq + 1 });
      return seq;
    } catch (err) {
      const error = err as Error;
      throw new Error(`SequenceStore: failed to increment sequence: ${error.message}`);
    } finally {
      this.releaseLock(lockFd);
    }
  }

  /**
   * Lee el estado actual sin incrementar.
   * @returns El próximo seq que se asignaría
   */
  peek(): number {
    return this.read().nextSeq;
  }

  /**
   * Lee el seq actual como value object CommandSeq.
   * @returns CommandSeq con el seq actual
   */
  peekAsSeq(): CommandSeq {
    return new CommandSeq(this.peek());
  }

  private read(): SequenceState {
    if (!existsSync(this.storeFile)) {
      return { nextSeq: 1 };
    }

    try {
      return JSON.parse(readFileSync(this.storeFile, "utf8")) as SequenceState;
    } catch {
      return { nextSeq: 1 };
    }
  }

  private write(state: SequenceState): void {
    atomicWriteFile(this.storeFile, JSON.stringify(state, null, 2));
  }

  /**
   * Acquire an exclusive advisory lock using O_EXCL (atomic create).
   * Retries with exponential backoff on EEXIST.
   * Removes stale lock files older than LOCK_STALE_THRESHOLD_MS.
   */
  private acquireLock(): number {
    for (let attempt = 0; attempt < LOCK_RETRIES; attempt++) {
      try {
        // O_EXCL + O_CREAT = fails if exists, creates atomically
        const fd = openSync(this.lockFile, "wx");
        writeSync(fd, `${process.pid}\n`);
        return fd;
      } catch (err) {
        const error = err as NodeJS.ErrnoException;
        if (error.code !== "EEXIST") throw err;

        // Lock exists — check if it's stale and remove it
        if (this.isLockStale()) {
          try {
            unlinkSync(this.lockFile);
          } catch {
            // Someone else removed it, retry
          }
        }

        // Exponential backoff with cap
        const wait = Math.min(LOCK_RETRY_BASE_MS * (attempt + 1), LOCK_MAX_MS);
        this.sleep(wait);
      }
    }
    throw new Error("SequenceStore: could not acquire lock after maximum retries");
  }

  private releaseLock(fd: number): void {
    try {
      closeSync(fd);
    } catch {
      // ignore close errors
    }
    try {
      unlinkSync(this.lockFile);
    } catch {
      // ignore — lock file may have been removed by another process
    }
  }

  private isLockStale(): boolean {
    try {
      const fs = require("node:fs");
      const stat = fs.statSync(this.lockFile);
      return Date.now() - stat.mtimeMs > LOCK_STALE_THRESHOLD_MS;
    } catch {
      return true;
    }
  }

  private sleep(ms: number): void {
    const deadline = Date.now() + ms;
    while (Date.now() < deadline) {
      // busy wait for precise timing
    }
  }
}
