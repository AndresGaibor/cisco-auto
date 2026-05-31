import { readFileSync, writeFileSync } from "node:fs";
import { getCheckpointsDir, getCheckpointIndexPath } from "../storage/collab-paths.js";
import { CheckpointStore, type CheckpointRecord } from "../storage/checkpoint-store.js";

export interface HostCheckpointServiceOptions {
  roomId: string;
}

export class HostCheckpointService {
  private readonly store: CheckpointStore;

  constructor(private readonly opts: HostCheckpointServiceOptions) {
    this.store = new CheckpointStore(opts.roomId);
  }

  latest(): CheckpointRecord | null {
    return this.store.latest() ?? null;
  }

  saveBytes(bytes: Uint8Array, record: CheckpointRecord): CheckpointRecord {
    this.store.writePktData(record.checkpointId, bytes);
    this.store.save(record);
    return record;
  }

  readBytes(checkpointId: string): Uint8Array | null {
    return this.store.readPktData(checkpointId) ?? null;
  }

  list(): CheckpointRecord[] {
    return this.store.list();
  }
}
