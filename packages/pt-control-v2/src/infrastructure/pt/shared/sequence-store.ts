/**
 * Persistent sequence number generator.
 * Generates monotonic seq numbers that survive process restarts.
 * Uses advisory file locking to prevent race conditions on next().
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

interface SequenceState {
  nextSeq: number;
}

const LOCK_RETRIES = 50;
const LOCK_RETRY_BASE_MS = 10;
const LOCK_MAX_MS = 500;
const LOCK_STALE_THRESHOLD_MS = 10_000;

export class SequenceStore {
  private readonly storeFile: string;
  private readonly lockFile: string;

  constructor(private readonly root: string) {
    this.storeFile = join(root, "protocol.seq.json");
    this.lockFile = `${this.storeFile}.lock`;
  }

  /**
   * Return the next sequence number and advance the counter atomically.
   * Uses advisory file locking to prevent concurrent processes from
   * generating the same sequence number.
   * Seq numbers start at 1.
   */
  next(): number {
    const lockFd = this.acquireLock();
    try {
      const current = this.read();
      const seq = current.nextSeq;
      this.write({ nextSeq: seq + 1 });
      return seq;
    } finally {
      this.releaseLock(lockFd);
    }
  }

  /**
   * Read the current state without incrementing.
   */
  peek(): number {
    return this.read().nextSeq;
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
      } catch (err: any) {
        if (err.code !== "EEXIST") throw err;

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
      const { mtimeMs } = { mtimeMs: Date.now() - LOCK_STALE_THRESHOLD_MS - 1 };
      // Use stat directly since we need actual mtime
      const stat = { mtimeMs: 0 };
      try {
        const fs = require("node:fs");
        const s = fs.statSync(this.lockFile);
        stat.mtimeMs = s.mtimeMs;
      } catch {
        return true; // File doesn't exist, not stale
      }
      return Date.now() - stat.mtimeMs > LOCK_STALE_THRESHOLD_MS;
    } catch {
      return true;
    }
  }

  private sleep(ms: number): void {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      // busy wait for precise timing
    }
  }
}
