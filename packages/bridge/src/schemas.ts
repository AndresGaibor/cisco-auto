import { z } from "zod";

/**
 * Esquema para un dispositivo en el snapshot de Packet Tracer
 */
export const DeviceSnapshotSchema = z.object({
  name: z.string(),
  model: z.string(),
  type: z.number(),
  ports: z.array(z.string()),
});

/**
 * Esquema para el snapshot completo de la topología
 */
export const SnapshotSchema = z.object({
  deviceCount: z.number(),
  linkCount: z.number().nullable(),
  devices: z.array(DeviceSnapshotSchema),
});

/**
 * Esquemas para los paquetes que el servidor encola (QueuePackets)
 */
export const QueuePacketKindSchema = z.enum([
  "hello",
  "set-runtime",
  "run-runtime",
  "eval",
  "snapshot",
]);

export const QueuePacketSchema = z.object({
  id: z.string().optional(),
  kind: QueuePacketKindSchema,
  code: z.string().optional(),
  payload: z.unknown().optional(),
  withSnapshot: z.boolean().optional(),
});

/**
 * Esquemas para los eventos que Packet Tracer reporta (PTEvents)
 */
export const PTEventKindSchema = z.enum([
  "hello",
  "log",
  "cmdlog",
  "result",
  "error",
]);

export const BaseEventSchema = z.object({
  type: PTEventKindSchema,
  ts: z.number(),
  id: z.string().nullable().optional(),
});

export const HelloEventSchema = BaseEventSchema.extend({
  type: z.literal("hello"),
  source: z.string(),
  snapshot: SnapshotSchema.optional(),
});

export const LogEventSchema = BaseEventSchema.extend({
  type: z.literal("log"),
  level: z.enum(["info", "warn", "error", "debug"]),
  message: z.string(),
});

export const CmdLogEventSchema = BaseEventSchema.extend({
  type: z.literal("cmdlog"),
  index: z.number(),
  time: z.string(),
  device: z.string(),
  prompt: z.string(),
  command: z.string(),
  resolved: z.string(),
});

export const ResultEventSchema = BaseEventSchema.extend({
  type: z.literal("result"),
  ok: z.boolean(),
  value: z.unknown(),
  snapshot: SnapshotSchema.optional(),
});

export const ErrorEventSchema = BaseEventSchema.extend({
  type: z.literal("error"),
  message: z.string(),
  stack: z.string().optional(),
});

export const PTEventSchema = z.discriminatedUnion("type", [
  HelloEventSchema,
  LogEventSchema,
  CmdLogEventSchema,
  ResultEventSchema,
  ErrorEventSchema,
]);

export type DeviceSnapshot = z.infer<typeof DeviceSnapshotSchema>;
export type Snapshot = z.infer<typeof SnapshotSchema>;
export type QueuePacketKind = z.infer<typeof QueuePacketKindSchema>;
export type QueuePacket = z.infer<typeof QueuePacketSchema>;
export type PTEventKind = z.infer<typeof PTEventKindSchema>;
export type PTEvent = z.infer<typeof PTEventSchema>;
