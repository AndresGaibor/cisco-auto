import * as z from "zod/v4";

export const McpMetaSchema = z.object({
  schemaVersion: z.literal("1.0"),
  timestamp: z.string().datetime(),
  requestId: z.string().regex(/^mcp-[a-f0-9]{8}$/),
  durationMs: z.number().nonnegative().optional(),
});

export const McpErrorDetailSchema = z.object({
  code: z.string(),
  message: z.string(),
  hint: z.string().optional(),
  retryable: z.boolean().optional(),
  details: z.record(z.string(), z.unknown()).optional(),
});

export const McpErrorOutputSchema = McpMetaSchema.extend({
  ok: z.literal(false),
  action: z.string().optional(),
  error: McpErrorDetailSchema,
  nextActions: z.array(z.string()).optional(),
});

export const UnknownRecordSchema = z.record(z.string(), z.unknown());

export const StructuredStatusWarningSchema = z.object({
  code: z.string(),
  severity: z.enum(["info", "warning", "error"]),
  message: z.string(),
  actionable: z.boolean().optional(),
});

export const McpWarningSchema = z.union([
  z.string(),
  StructuredStatusWarningSchema,
]);

export const ReconciledStatusSchema = z.object({
  appReady: z.boolean(),
  projectReady: z.boolean(),
  inventoryReady: z.boolean(),
  commandReady: z.boolean(),
  topologyUsable: z.boolean(),
  activeFile: z.string().nullable().optional(),
  projectDeviceCount: z.number().int().nonnegative(),
  projectLinkCount: z.number().int().nonnegative(),
  inventoryDeviceCount: z.number().int().nonnegative(),
  queue: z.unknown().optional(),
});

export const McpOkBaseSchema = McpMetaSchema.extend({
  ok: z.literal(true),
  action: z.string(),
  warnings: z.array(McpWarningSchema).optional(),
  nextActions: z.array(z.string()).optional(),
});

// Schema genérico para tools con múltiples variantes
export const GenericToolOutputSchema = z.discriminatedUnion("ok", [
  McpOkBaseSchema.passthrough(),
  McpErrorOutputSchema,
]);

// Status tool schemas
export const StatusSummaryOutputSchema = z.discriminatedUnion("ok", [
  McpOkBaseSchema.extend({
    action: z.literal("status.summary"),
    health: z.unknown(),
    heartbeat: z.unknown(),
    bridge: z.unknown(),
    context: z.unknown(),
    reconciled: ReconciledStatusSchema.optional(),
    warnings: z.array(McpWarningSchema).optional(),
    nextActions: z.array(z.string()).optional(),
  }),
  McpErrorOutputSchema,
]);

export const StatusDoctorOutputSchema = z.discriminatedUnion("ok", [
  McpOkBaseSchema.extend({
    action: z.literal("status.doctor"),
    health: z.unknown(),
    heartbeat: z.unknown(),
    bridge: z.unknown(),
    healthy: z.boolean(),
  }),
  McpErrorOutputSchema,
]);

export const StatusRuntimeOutputSchema = z.discriminatedUnion("ok", [
  McpOkBaseSchema.extend({
    action: z.literal("status.runtime"),
    health: z.unknown(),
    heartbeat: z.unknown(),
  }),
  McpErrorOutputSchema,
]);

export const StatusBridgeOutputSchema = z.discriminatedUnion("ok", [
  McpOkBaseSchema.extend({
    action: z.literal("status.bridge"),
    bridge: z.unknown(),
    heartbeat: z.unknown(),
  }),
  McpErrorOutputSchema,
]);

export const StatusOutputSchema = z.discriminatedUnion("ok", [
  McpOkBaseSchema.extend({
    action: z.enum([
      "status.summary",
      "status.doctor",
      "status.runtime",
      "status.bridge",
    ]),
  }).passthrough(),
  McpErrorOutputSchema,
]);

// App tool schemas
export const AppOutputSchema = GenericToolOutputSchema;

// Project tool schemas
export const ProjectOutputSchema = GenericToolOutputSchema;

// Device tool schemas
export const DeviceOutputSchema = GenericToolOutputSchema;

// Link tool schemas
export const LinkOutputSchema = GenericToolOutputSchema;

// Cmd run tool schemas
export const CmdRunJobResultSchema = z.object({
  index: z.number().int(),
  device: z.string(),
  commandCount: z.number().int(),
  commands: z.array(z.string()),
  result: z.unknown(),
});

export const CmdRunSkippedResultSchema = z.object({
  index: z.number().int(),
  device: z.string(),
  skipped: z.literal(true),
  reason: z.string(),
});

export const CmdRunOutputSchema = z.discriminatedUnion("ok", [
  McpOkBaseSchema.extend({
    action: z.literal("cmd.run"),
    jobCount: z.number().int(),
    failedCount: z.number().int(),
    results: z.array(z.union([
      CmdRunJobResultSchema,
      CmdRunSkippedResultSchema,
      z.unknown(),
    ])),
    queue: z.unknown(),
  }),
  McpErrorOutputSchema,
]);

export const CmdQueueOutputSchema = z.discriminatedUnion("ok", [
  McpOkBaseSchema.extend({
    action: z.enum(["cmd.queue.status", "cmd.queue.clear_finished"]),
  }).passthrough(),
  McpErrorOutputSchema,
]);

// Omni tool schemas
export const OmniOutputSchema = GenericToolOutputSchema;

// CLI fallback schemas
export const CliFallbackOutputSchema = GenericToolOutputSchema;
