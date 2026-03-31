import { z } from 'zod';

/**
 * PT Control - Event Schemas
 * For events pushed from Packet Tracer to CLI
 */

// ============================================================================
// Base Event
// ============================================================================

export const PTEventBaseSchema = z.object({
  type: z.string(),
  ts: z.number(),
  seq: z.number().optional(),
});

export type PTEventBase = z.infer<typeof PTEventBaseSchema>;

// ============================================================================
// System Events
// ============================================================================

export const InitEventSchema = PTEventBaseSchema.extend({
  type: z.literal('init'),
  version: z.string().optional(),
});

export const RuntimeLoadedEventSchema = PTEventBaseSchema.extend({
  type: z.literal('runtime-loaded'),
  version: z.string().optional(),
});

export const ErrorEventSchema = PTEventBaseSchema.extend({
  type: z.literal('error'),
  id: z.string().optional(),
  message: z.string(),
  stack: z.string().optional(),
});

// ============================================================================
// Result Events (Response to commands)
// ============================================================================

export const ResultEventSchema = PTEventBaseSchema.extend({
  type: z.literal('result'),
  id: z.string(),
  ok: z.boolean(),
  value: z.unknown().optional(),
  output: z.string().optional(),
  parsed: z.unknown().optional(),
});

// ============================================================================
// Topology Events
// ============================================================================

export const DeviceAddedEventSchema = PTEventBaseSchema.extend({
  type: z.literal('device-added'),
  name: z.string(),
  model: z.string(),
  uuid: z.string().optional(),
  x: z.number().optional(),
  y: z.number().optional(),
});

export const DeviceRemovedEventSchema = PTEventBaseSchema.extend({
  type: z.literal('device-removed'),
  name: z.string(),
  uuid: z.string().optional(),
});

export const LinkCreatedEventSchema = PTEventBaseSchema.extend({
  type: z.literal('link-created'),
  device1: z.string(),
  port1: z.string(),
  device2: z.string(),
  port2: z.string(),
  connType: z.number().optional(),
});

export const LinkDeletedEventSchema = PTEventBaseSchema.extend({
  type: z.literal('link-deleted'),
  device1: z.string(),
  port1: z.string(),
  device2: z.string(),
  port2: z.string(),
});

// ============================================================================
// CLI/Command Events
// ============================================================================

export const CliCommandEventSchema = PTEventBaseSchema.extend({
  type: z.literal('cli-command'),
  device: z.string(),
  prompt: z.string(),
  command: z.string(),
  resolvedCommand: z.string().optional(),
});

export const CommandStartedEventSchema = PTEventBaseSchema.extend({
  type: z.literal('command-started'),
  device: z.string(),
  command: z.string(),
});

export const CommandEndedEventSchema = PTEventBaseSchema.extend({
  type: z.literal('command-ended'),
  device: z.string(),
  command: z.string(),
  status: z.enum(['ok', 'ambiguous', 'invalid', 'incomplete', 'not-implemented']),
});

export const OutputWrittenEventSchema = PTEventBaseSchema.extend({
  type: z.literal('output-written'),
  device: z.string(),
  output: z.string(),
  isDebug: z.boolean().optional(),
});

export const PromptChangedEventSchema = PTEventBaseSchema.extend({
  type: z.literal('prompt-changed'),
  device: z.string(),
  prompt: z.string(),
  mode: z.string().optional(),
});

// ============================================================================
// Snapshot Events
// ============================================================================

export const SnapshotEventSchema = PTEventBaseSchema.extend({
  type: z.literal('snapshot'),
  devices: z.number(),
  links: z.number(),
});

// ============================================================================
// Log Events
// ============================================================================

export const LogEventSchema = PTEventBaseSchema.extend({
  type: z.literal('log'),
  level: z.enum(['debug', 'info', 'warn', 'error']),
  message: z.string(),
});

// ============================================================================
// Union Type
// ============================================================================

export const PTEventSchema = z.discriminatedUnion('type', [
  InitEventSchema,
  RuntimeLoadedEventSchema,
  ErrorEventSchema,
  ResultEventSchema,
  DeviceAddedEventSchema,
  DeviceRemovedEventSchema,
  LinkCreatedEventSchema,
  LinkDeletedEventSchema,
  CliCommandEventSchema,
  CommandStartedEventSchema,
  CommandEndedEventSchema,
  OutputWrittenEventSchema,
  PromptChangedEventSchema,
  SnapshotEventSchema,
  LogEventSchema,
]);

export type PTEvent = z.infer<typeof PTEventSchema>;

// Event type map for type-safe event handling
export interface PTEventTypeMap {
  'init': z.infer<typeof InitEventSchema>;
  'runtime-loaded': z.infer<typeof RuntimeLoadedEventSchema>;
  'error': z.infer<typeof ErrorEventSchema>;
  'result': z.infer<typeof ResultEventSchema>;
  'device-added': z.infer<typeof DeviceAddedEventSchema>;
  'device-removed': z.infer<typeof DeviceRemovedEventSchema>;
  'link-created': z.infer<typeof LinkCreatedEventSchema>;
  'link-deleted': z.infer<typeof LinkDeletedEventSchema>;
  'cli-command': z.infer<typeof CliCommandEventSchema>;
  'command-started': z.infer<typeof CommandStartedEventSchema>;
  'command-ended': z.infer<typeof CommandEndedEventSchema>;
  'output-written': z.infer<typeof OutputWrittenEventSchema>;
  'prompt-changed': z.infer<typeof PromptChangedEventSchema>;
  'snapshot': z.infer<typeof SnapshotEventSchema>;
  'log': z.infer<typeof LogEventSchema>;
}

export type PTEventType = keyof PTEventTypeMap;
