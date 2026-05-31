export type CollabRole = "coordinator" | "peer";

export type PeerCapability =
  | "project.snapshot"
  | "project.openFromBytes"
  | "topology.events"
  | "topology.apply"
  | "ios.readConfig"
  | "ios.applyConfig"
  | "xml.read"
  | "xml.patch.experimental"
  | "multiuser.server"
  | "multiuser.remoteNetwork";

export interface CollabHashes {
  projectSha256?: string;
  topologyHash?: string;
  linkHash?: string;
  canvasHash?: string;
  deviceHashes: Record<string, DeviceHashes>;
}

export interface DeviceHashes {
  identityHash?: string;
  runningConfigHash?: string;
  startupConfigHash?: string;
  xmlHash?: string;
  portsHash?: string;
  modulesHash?: string;
}

export type CollabScope =
  | "project"
  | "topology"
  | `device:${string}`
  | `device:${string}:running-config`
  | `device:${string}:startup-config`
  | `device:${string}:xml`
  | `link:${string}`
  | `canvas:${string}`
  | `multiuser:${string}`;

export type CollabDeltaKind =
  | "topology.device.added"
  | "topology.device.removed"
  | "topology.device.moved"
  | "topology.device.renamed"
  | "topology.link.created"
  | "topology.link.deleted"
  | "device.cli.runningConfig.changed"
  | "device.xml.changed"
  | "project.checkpoint.created"
  | "multiuser.peer.connected"
  | "multiuser.peer.disconnected";

export interface CollabDelta {
  id: string;
  roomId: string;
  peerId: string;
  seq: number;
  lamport: number;
  createdAt: string;
  baseVector: Record<string, number>;
  scope: CollabScope;
  kind: CollabDeltaKind;
  beforeHash?: string;
  afterHash?: string;
  payload: unknown;
}

export interface PeerState {
  peerId: string;
  displayName: string;
  role: CollabRole;
  connectedAt: string;
  lastSeenAt: string;
  capabilities: PeerCapability[];
  packetTracerVersion?: string;
  activeFile?: string;
  vector: Record<string, number>;
  hashes: CollabHashes;
}

export interface CollabRoomState {
  roomId: string;
  createdAt: string;
  currentEpoch: string;
  peers: Record<string, PeerState>;
  vector: Record<string, number>;
  latestCheckpointId?: string;
  semanticHashes: Record<string, string>;
}

export interface HelloMessage {
  type: "hello";
  protocolVersion: 1;
  roomId?: string;
  peerId: string;
  displayName: string;
  token?: string;
  packetTracerVersion?: string;
  capabilities: PeerCapability[];
  activeFile?: string;
  hashes?: CollabHashes;
}

export interface WelcomeMessage {
  type: "welcome";
  roomId: string;
  assignedPeerId: string;
  serverTime: string;
  currentVector: Record<string, number>;
  latestCheckpointId?: string;
  peers: PeerState[];
}

export interface PeerJoinedMessage {
  type: "peer.joined";
  peer: PeerState;
  timestamp: string;
}

export interface PeerLeftMessage {
  type: "peer.left";
  peerId: string;
  timestamp: string;
}

export interface DeltaSubmitMessage {
  type: "delta.submit";
  delta: CollabDelta;
  timestamp: string;
}

export interface DeltaCommitMessage {
  type: "delta.commit";
  delta: CollabDelta;
  committedAt: string;
}

export interface DeltaAckMessage {
  type: "delta.ack";
  deltaId: string;
  peerId: string;
  accepted: boolean;
  reason?: string;
}

export interface DriftDetectedMessage {
  type: "drift.detected";
  peerId: string;
  scope: CollabScope;
  expectedHash: string;
  actualHash: string;
  timestamp: string;
}

export interface CheckpointOfferMessage {
  type: "checkpoint.offer";
  checkpointId: string;
  peerId: string;
  roomId: string;
  sha256: string;
  byteSize: number;
  chunkCount: number;
  createdAt: string;
}

export interface CheckpointRequestMessage {
  type: "checkpoint.request";
  checkpointId: string;
  peerId: string;
}

export interface CheckpointChunkMessage {
  type: "checkpoint.chunk";
  checkpointId: string;
  offset: number;
  total: number;
  data: number[];
}

export interface ConflictCreatedMessage {
  type: "conflict.created";
  conflictId: string;
  roomId: string;
  scope: CollabScope;
  peerIds: string[];
  description: string;
  createdAt: string;
}

export interface ConflictResolvedMessage {
  type: "conflict.resolved";
  conflictId: string;
  resolvedBy: string;
  resolution: "take_local" | "take_remote" | "checkpoint";
  checkpointId?: string;
  timestamp: string;
}

export interface HeartbeatMessage {
  type: "heartbeat";
  peerId: string;
  timestamp: string;
  vector: Record<string, number>;
}

export interface ErrorMessage {
  type: "error";
  code: string;
  message: string;
  originalType?: string;
  timestamp: string;
}

export type CollabWireMessage =
  | HelloMessage
  | WelcomeMessage
  | PeerJoinedMessage
  | PeerLeftMessage
  | DeltaSubmitMessage
  | DeltaCommitMessage
  | DeltaAckMessage
  | DriftDetectedMessage
  | CheckpointOfferMessage
  | CheckpointRequestMessage
  | CheckpointChunkMessage
  | ConflictCreatedMessage
  | ConflictResolvedMessage
  | HeartbeatMessage
  | ErrorMessage;
