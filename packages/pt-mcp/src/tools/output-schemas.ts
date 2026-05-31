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

// Cmd performance schemas
export const CommandPerformanceSchema = z.object({
  durationMs: z.number().nonnegative().optional(),
  slow: z.boolean(),
  thresholdMs: z.number().nonnegative(),
  dominantTiming: z.string().nullable().optional(),
  dominantTimingMs: z.number().nonnegative().optional(),
  slowestSubcommand: z.object({
    index: z.number().int().nonnegative(),
    command: z.string(),
    durationMs: z.number().nonnegative(),
  }).optional(),
  executionStrategy: z.string().optional(),
  category: z.enum([
    "bridge_wait",
    "queue_latency",
    "execution_latency",
    "sequential_batch",
    "adaptive_batch",
    "poll_sleep",
    "parse",
    "device_resolution",
    "planner_or_submit",
    "retry_or_recovery",
    "pager_fallback",
    "unknown",
  ]),
});

// Cmd run tool schemas
export const CmdRunJobResultSchema = z.object({
  index: z.number().int(),
  device: z.string(),
  commandCount: z.number().int(),
  commands: z.array(z.string()),
  result: z.unknown(),
  performance: CommandPerformanceSchema.optional(),
  warnings: z.array(McpWarningSchema).optional(),
});

export const CmdRunSubResultSchema = z.object({
  index: z.number().int(),
  command: z.string(),
  ok: z.boolean(),
  status: z.number().optional(),
  durationMs: z.number().nonnegative().optional(),
  result: z.unknown(),
  warnings: z.array(McpWarningSchema).optional(),
});

export const CmdRunBatchResultSchema = CmdRunJobResultSchema.extend({
  action: z.literal("ios.exec.batch"),
  executionStrategy: z.enum([
    "sequential-subcommands",
    "optimized-runtime-multistep",
    "optimized-runtime-partial-plus-sequential",
    "adaptive-optimized-chunks",
    "adaptive-optimized-chunks-plus-sequential-recovery",
  ]),
  adaptiveBatchStrategy: z.enum(["auto", "optimized", "sequential"]).optional(),
  adaptiveBatchChunkCount: z.number().int().nonnegative().optional(),
  adaptiveBatchChunks: z.array(z.object({
    index: z.number().int().nonnegative(),
    commandCount: z.number().int().nonnegative(),
    commands: z.array(z.string()).optional(),
    executionStrategy: z.string().optional(),
    ok: z.boolean().optional(),
    durationMs: z.number().nonnegative().optional(),
  })).optional(),
  adaptiveBatchRecoveryAttempted: z.boolean().optional(),
  adaptiveBatchRecoveredCommandCount: z.number().int().nonnegative().optional(),
  adaptiveBatchRecoveryIndexes: z.array(z.number().int().nonnegative()).optional(),
  optimizedRuntimeBatchAttempted: z.boolean().optional(),
  optimizedRuntimeBatchAvailable: z.boolean().optional(),
  optimizedRuntimeBatchPartial: z.boolean().optional(),
  optimizedRuntimeBatchMatchedCommandCount: z.number().int().nonnegative().optional(),
  optimizedRuntimeBatchNextCommandIndex: z.number().int().nonnegative().optional(),
  optimizedRuntimeBatchFallbackReason: z.enum([
    "method_missing",
    "returned_null",
    "incomplete_subResults",
    "no_runtime_terminal",
    "unsafe_command",
    "runtime_exception",
    "missing_stepResults",
    "stepResults_length_mismatch",
    "command_mismatch",
    "partial_stepResults",
  ]).optional(),
  optimizedRuntimeBatchDiagnostics: z.unknown().optional(),
  failedSubcommandCount: z.number().int().nonnegative(),
  subResults: z.array(CmdRunSubResultSchema),
  stoppedEarly: z.boolean().optional(),
  stopReason: z.string().optional(),
  evidence: z.unknown().optional(),
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
      CmdRunBatchResultSchema,
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
