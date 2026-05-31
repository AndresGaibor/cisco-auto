// Server
export { createCollabServer } from "./server/start-collab-server.js";
export type { CollabServerHandle, StartCollabServerOptions } from "./server/start-collab-server.js";

// Storage
export { CheckpointStore } from "./storage/checkpoint-store.js";
export type { CheckpointRecord } from "./storage/checkpoint-store.js";
export {
  readClientConfig,
  writeClientConfig,
  updateClientUrl,
  updatePeerId,
  resetClientUrl,
} from "./storage/client-config-store.js";
export type { ClientConfig } from "./storage/client-config-store.js";
export {
  readHostConfig,
  writeHostConfig,
  getOrCreateHostConfig,
  resetSessionSecret,
} from "./storage/host-config-store.js";
export type { HostConfig } from "./storage/host-config-store.js";
export {
  readSessionFile,
  writeSessionFile,
  deleteSessionFile,
  readPidFile,
  writePidFile,
  deletePidFile,
  isSessionActive,
} from "./storage/session-store.js";
export type { SessionInfo } from "./storage/session-store.js";

// Client
export { CollabClient } from "./client/collab-client.js";
export type { CollabClientOptions, CollabClientStatus } from "./client/collab-client.js";

// Protocol types
export type * from "./protocol/messages.js";
export type * from "./protocol/schemas.js";
export type * from "./conflicts/conflict-types.js";

// Multiuser
export {
  createEmptyMultiuserStatus,
} from "./multiuser/multiuser-types.js";
export type * from "./multiuser/multiuser-types.js";
export {
  queryMultiuserIPC,
  multiuserListenIPC,
  multiuserStopIPC,
  multiuserConnectIPC,
} from "./multiuser/pt-multiuser-bridge.js";
export type { PTMultiuserBridge } from "./multiuser/pt-multiuser-bridge.js";

// Detector / Applier / Sync
export {
  diffSnapshots,
  diffToDeltas,
  snapshotFromTopology,
  type TopologySnapshot,
  type DiffResult,
  type DiffDevice,
  type DiffLink,
  type DeviceConfigSnapshot,
} from "./detector/change-detector.js";

export {
  applyDelta,
  type PTControllerPort,
  type DeltaApplyResult,
} from "./applier/delta-applier.js";

export { AutoSyncService } from "./sync/auto-sync.js";
export type { AutoSyncOptions, AutoSyncStatus, SnapshotFetcher } from "./sync/auto-sync.js";

// CLI mode helpers
export {
  startSimpleSession,
} from "./cli-mode/start-simple-session.js";
export type { StartSimpleSessionOptions, StartSimpleSessionResult } from "./cli-mode/start-simple-session.js";

export {
  connectSimpleSession,
  getSavedUrl,
} from "./cli-mode/connect-simple-session.js";
export type { ConnectSimpleSessionOptions, ConnectSimpleSessionResult } from "./cli-mode/connect-simple-session.js";

export {
  stopSimpleSession,
} from "./cli-mode/stop-simple-session.js";
export type { StopSimpleSessionResult } from "./cli-mode/stop-simple-session.js";
