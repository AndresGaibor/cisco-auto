export interface ConsumerCheckpoint {
  consumerId: string;
  currentFile: string;
  byteOffset: number;
  lastSeq: number;
  updatedAt: number;
}

export interface RotationEntry {
  file: string;
  rotatedAt: number;
  previousFile: string;
  bytesSizeAtRotation: number;
  lastSeqInFile: number;
  firstSeqInFile?: number;
  recordCount?: number;
  bytes?: number;
  createdAt?: number;
  closedAt?: number;
}

export interface RotationManifest {
  rotations: RotationEntry[];
}

export interface InFlightRecovery {
  file: string;
  cmdId: string;
  seq: number;
  type: string;
  attempt: number;
  movedAt: number;
  action: "requeued" | "completed" | "dead-letter";
}

export type CommandStatus = "queued" | "picked" | "started" | "completed" | "failed";

export interface CommandFileEnvelope<T = unknown> {
  status: CommandStatus;
  payload: T;
}
