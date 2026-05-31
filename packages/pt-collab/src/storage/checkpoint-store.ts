import { join } from "node:path";
import { existsSync, mkdirSync, writeFileSync, readFileSync, unlinkSync } from "node:fs";
import { getCheckpointsDir, getCheckpointIndexPath } from "./collab-paths.js";

export interface CheckpointRecord {
  checkpointId: string;
  roomId: string;
  peerId: string;
  sha256: string;
  byteSize: number;
  chunkCount: number;
  createdAt: string;
}

export class CheckpointStore {
  private checkpointsDir: string;
  private indexPath: string;
  private records: CheckpointRecord[];

  constructor(roomId: string) {
    this.checkpointsDir = getCheckpointsDir(roomId);
    this.indexPath = getCheckpointIndexPath(roomId);
    this.records = this.loadIndex();
  }

  save(record: CheckpointRecord): void {
    const existing = this.records.findIndex((r) => r.checkpointId === record.checkpointId);
    if (existing !== -1) {
      this.records[existing] = record;
    } else {
      this.records.push(record);
    }
    this.persistIndex();
  }

  get(checkpointId: string): CheckpointRecord | undefined {
    return this.records.find((r) => r.checkpointId === checkpointId);
  }

  list(): CheckpointRecord[] {
    return [...this.records].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  latest(): CheckpointRecord | undefined {
    if (this.records.length === 0) return undefined;
    return [...this.records].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )[0];
  }

  remove(checkpointId: string): boolean {
    const idx = this.records.findIndex((r) => r.checkpointId === checkpointId);
    if (idx === -1) return false;
    this.records.splice(idx, 1);
    this.persistIndex();
    const pktPath = join(this.checkpointsDir, `${checkpointId}.pkt`);
    if (existsSync(pktPath)) {
      unlinkSync(pktPath);
    }
    return true;
  }

  prune(keep: number): CheckpointRecord[] {
    if (this.records.length <= keep) return [];
    const sorted = [...this.records].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    const toRemove = sorted.slice(keep);
    for (const record of toRemove) {
      this.remove(record.checkpointId);
    }
    return toRemove;
  }

  writePktData(checkpointId: string, data: Uint8Array): void {
    if (!existsSync(this.checkpointsDir)) {
      mkdirSync(this.checkpointsDir, { recursive: true });
    }
    writeFileSync(join(this.checkpointsDir, `${checkpointId}.pkt`), data);
  }

  readPktData(checkpointId: string): Uint8Array | undefined {
    const pktPath = join(this.checkpointsDir, `${checkpointId}.pkt`);
    if (!existsSync(pktPath)) return undefined;
    return readFileSync(pktPath);
  }

  count(): number {
    return this.records.length;
  }

  private loadIndex(): CheckpointRecord[] {
    if (!existsSync(this.indexPath)) return [];
    try {
      const raw = readFileSync(this.indexPath, "utf-8").trim();
      if (!raw) return [];
      return JSON.parse(raw) as CheckpointRecord[];
    } catch {
      return [];
    }
  }

  private persistIndex(): void {
    if (!existsSync(this.checkpointsDir)) {
      mkdirSync(this.checkpointsDir, { recursive: true });
    }
    writeFileSync(this.indexPath, JSON.stringify(this.records, null, 2), "utf-8");
  }
}
