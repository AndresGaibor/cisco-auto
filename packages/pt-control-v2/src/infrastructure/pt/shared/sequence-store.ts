/**
 * Persistent sequence number generator.
 * Generates monotonic seq numbers that survive process restarts.
 * Uses atomic write to ensure no seq number is ever lost or duplicated.
 */
import { join } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { atomicWriteFile } from "./fs-atomic";

interface SequenceState {
  nextSeq: number;
}

export class SequenceStore {
  private readonly storeFile: string;

  constructor(private readonly root: string) {
    this.storeFile = join(root, "protocol.seq.json");
  }

  /**
   * Return the next sequence number and advance the counter atomically.
   * Seq numbers start at 1.
   */
  next(): number {
    const current = this.read();
    const seq = current.nextSeq;
    this.write({ nextSeq: seq + 1 });
    return seq;
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
}
