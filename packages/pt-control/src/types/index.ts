import { z } from "zod";

/**
 * PT Event Types
 */

// Event stream types
export const PTEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("init"),
    ts: z.number(),
  }),
  z.object({
    type: z.literal("runtime-loaded"),
    ts: z.number(),
  }),
  z.object({
    type: z.literal("log"),
    ts: z.number(),
    level: z.enum(["info", "warn", "error", "debug"]),
    message: z.string(),
  }),
  z.object({
    type: z.literal("result"),
    ts: z.number(),
    id: z.string(),
    ok: z.boolean(),
    value: z.unknown(),
    snapshot: z.optional(z.unknown()),
  }),
  z.object({
    type: z.literal("error"),
    ts: z.number(),
    id: z.string().optional(),
    message: z.string(),
    stack: z.string().optional(),
  }),
  z.object({
    type: z.literal("cmdlog"),
    ts: z.number(),
    index: z.number(),
    device: z.string(),
    prompt: z.string(),
    command: z.string(),
    resolved: z.string().optional(),
  }),
  z.object({
    type: z.literal("device-added"),
    ts: z.number(),
    name: z.string(),
    model: z.string(),
    uuid: z.string(),
  }),
  z.object({
    type: z.literal("device-removed"),
    ts: z.number(),
    name: z.string(),
    uuid: z.string(),
  }),
  z.object({
    type: z.literal("link-created"),
    ts: z.number(),
    dev1: z.string(),
    port1: z.string(),
    dev2: z.string(),
    port2: z.string(),
    connType: z.number(),
  }),
  z.object({
    type: z.literal("link-deleted"),
    ts: z.number(),
    dev1: z.string(),
    port1: z.string(),
    dev2: z.string(),
    port2: z.string(),
  }),
]);

export type PTEvent = z.infer<typeof PTEventSchema>;

/**
 * Operation Log (OpLog) - Reproducible operations
 */

export const OpSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("addDevice"),
    name: z.string(),
    model: z.string(),
    x: z.number(),
    y: z.number(),
  }),
  z.object({
    kind: z.literal("addModule"),
    device: z.string(),
    slot: z.number(),
    module: z.string(),
  }),
  z.object({
    kind: z.literal("createLink"),
    dev1: z.string(),
    port1: z.string(),
    dev2: z.string(),
    port2: z.string(),
    type: z.number(),
  }),
  z.object({
    kind: z.literal("configIos"),
    device: z.string(),
    commands: z.array(z.string()),
  }),
  z.object({
    kind: z.literal("configHost"),
    device: z.string(),
    ip: z.string().optional(),
    mask: z.string().optional(),
    gateway: z.string().optional(),
    dns: z.string().optional(),
    dhcp: z.boolean().optional(),
  }),
  z.object({
    kind: z.literal("removeDevice"),
    device: z.string(),
  }),
  z.object({
    kind: z.literal("deleteLink"),
    device: z.string(),
    port: z.string(),
  }),
  z.object({
    kind: z.literal("moveDevice"),
    device: z.string(),
    x: z.number(),
    y: z.number(),
  }),
  z.object({
    kind: z.literal("renameDevice"),
    oldName: z.string(),
    newName: z.string(),
  }),
]);

export type Op = z.infer<typeof OpSchema>;

export const OpLogEntrySchema = OpSchema.and(
  z.object({
    ts: z.number(),
    id: z.string(),
  })
);

export type OpLogEntry = z.infer<typeof OpLogEntrySchema>;

export const OpLogSchema = z.object({
  version: z.literal("1.0"),
  timestamp: z.number(),
  operations: z.array(OpLogEntrySchema),
});

export type OpLog = z.infer<typeof OpLogSchema>;

/**
 * Command payloads for PT runtime
 */

export const CommandPayloadSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("addDevice"),
    name: z.string(),
    model: z.string(),
    x: z.number(),
    y: z.number(),
  }),
  z.object({
    kind: z.literal("removeDevice"),
    name: z.string(),
  }),
  z.object({
    kind: z.literal("listDevices"),
    filter: z.string().optional(),
  }),
  z.object({
    kind: z.literal("addLink"),
    dev1: z.string(),
    port1: z.string(),
    dev2: z.string(),
    port2: z.string(),
    cableType: z.string(),
  }),
  z.object({
    kind: z.literal("removeLink"),
    device: z.string(),
    port: z.string(),
  }),
  z.object({
    kind: z.literal("configHost"),
    device: z.string(),
    ip: z.string().optional(),
    mask: z.string().optional(),
    gateway: z.string().optional(),
    dns: z.string().optional(),
    dhcp: z.boolean().optional(),
  }),
  z.object({
    kind: z.literal("configIos"),
    device: z.string(),
    commands: z.array(z.string()),
  }),
  z.object({
    kind: z.literal("snapshot"),
  }),
  z.object({
    kind: z.literal("inspect"),
    device: z.string(),
  }),
]);

export type CommandPayload = z.infer<typeof CommandPayloadSchema>;

/**
 * Snapshot types
 */

export const DeviceSnapshotSchema = z.object({
  name: z.string(),
  model: z.string(),
  type: z.number(),
  power: z.boolean(),
  ports: z.array(z.string()),
  portCount: z.number(),
  xml: z.string().optional(),
});

export type DeviceSnapshot = z.infer<typeof DeviceSnapshotSchema>;

export const TopologySnapshotSchema = z.object({
  deviceCount: z.number(),
  linkCount: z.number().nullable(),
  devices: z.array(DeviceSnapshotSchema),
  timestamp: z.number(),
});

export type TopologySnapshot = z.infer<typeof TopologySnapshotSchema>;

/**
 * CLI Tracking (para telemetría)
 */

export const CliSpanSchema = z.object({
  id: z.string(),
  device: z.string(),
  startedAt: z.number(),
  endedAt: z.number().optional(),
  inputCommand: z.string(),
  completeCommand: z.string().optional(),
  mode: z.string().optional(),
  prompt: z.string().optional(),
  status: z.number().optional(), // 0=Ok, 1=Ambiguous, 2=Invalid, 3=Incomplete, 4=NotImplemented
  stdout: z.array(z.string()),
  errors: z.array(z.string()),
});

export type CliSpan = z.infer<typeof CliSpanSchema>;
