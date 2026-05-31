import { z } from "zod";

export const CollabRoleSchema = z.enum(["coordinator", "peer"]);

export const PeerCapabilitySchema = z.enum([
  "project.snapshot",
  "project.openFromBytes",
  "topology.events",
  "topology.apply",
  "ios.readConfig",
  "ios.applyConfig",
  "xml.read",
  "xml.patch.experimental",
  "multiuser.server",
  "multiuser.remoteNetwork",
]);

export const DeviceHashesSchema = z.object({
  identityHash: z.string().optional(),
  runningConfigHash: z.string().optional(),
  startupConfigHash: z.string().optional(),
  xmlHash: z.string().optional(),
  portsHash: z.string().optional(),
  modulesHash: z.string().optional(),
});

export const CollabHashesSchema = z.object({
  projectSha256: z.string().optional(),
  topologyHash: z.string().optional(),
  linkHash: z.string().optional(),
  canvasHash: z.string().optional(),
  deviceHashes: z.record(z.string(), DeviceHashesSchema),
});

export const CollabScopeSchema = z.string();
export const CollabDeltaKindSchema = z.enum([
  "topology.device.added",
  "topology.device.removed",
  "topology.device.moved",
  "topology.device.renamed",
  "topology.link.created",
  "topology.link.deleted",
  "device.cli.runningConfig.changed",
  "device.xml.changed",
  "project.checkpoint.created",
  "multiuser.peer.connected",
  "multiuser.peer.disconnected",
]);

export const CollabDeltaSchema = z.object({
  id: z.string(),
  roomId: z.string(),
  peerId: z.string(),
  seq: z.number(),
  lamport: z.number(),
  createdAt: z.string(),
  baseVector: z.record(z.string(), z.number()),
  scope: CollabScopeSchema,
  kind: CollabDeltaKindSchema,
  beforeHash: z.string().optional(),
  afterHash: z.string().optional(),
  payload: z.unknown(),
});

export const PeerStateSchema = z.object({
  peerId: z.string(),
  displayName: z.string(),
  role: CollabRoleSchema,
  connectedAt: z.string(),
  lastSeenAt: z.string(),
  capabilities: z.array(PeerCapabilitySchema),
  packetTracerVersion: z.string().optional(),
  activeFile: z.string().optional(),
  vector: z.record(z.string(), z.number()),
  hashes: CollabHashesSchema,
});

export const HelloMessageSchema = z.object({
  type: z.literal("hello"),
  protocolVersion: z.literal(1),
  roomId: z.string(),
  peerId: z.string(),
  displayName: z.string(),
  token: z.string(),
  packetTracerVersion: z.string().optional(),
  capabilities: z.array(PeerCapabilitySchema),
  activeFile: z.string().optional(),
  hashes: CollabHashesSchema.optional(),
});

export const WelcomeMessageSchema = z.object({
  type: z.literal("welcome"),
  roomId: z.string(),
  assignedPeerId: z.string(),
  serverTime: z.string(),
  currentVector: z.record(z.string(), z.number()),
  latestCheckpointId: z.string().optional(),
  peers: z.array(PeerStateSchema),
});

export const HeartbeatMessageSchema = z.object({
  type: z.literal("heartbeat"),
  peerId: z.string(),
  timestamp: z.string(),
  vector: z.record(z.string(), z.number()),
});

export const ErrorMessageSchema = z.object({
  type: z.literal("error"),
  code: z.string(),
  message: z.string(),
  originalType: z.string().optional(),
  timestamp: z.string(),
});

export const CollabWireMessageSchema = z.discriminatedUnion("type", [
  HelloMessageSchema,
  WelcomeMessageSchema,
  HeartbeatMessageSchema,
  ErrorMessageSchema,
]);
