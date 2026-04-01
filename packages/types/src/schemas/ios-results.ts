import { z } from 'zod';

/**
 * IOS Command Result Schemas
 * Shared types for IOS command execution results
 * Single Source of Truth for pt-control and pt-runtime
 */

// ============================================================================
// Output Classification
// ============================================================================

export const OutputClassificationSchema = z.enum([
  'success',
  'invalid',
  'incomplete',
  'ambiguous',
  'error',
  'paging',
  'dns-lookup',
  'dns-lookup-timeout',
  'confirmation-required',
  'copy-destination',
  'reload-confirm',
  'erase-confirm',
  'unsupported-command',
  'unsupported-platform',
  'interface-not-found',
  'vlan-not-found',
  'mask-invalid',
  'ip-conflict',
  'permission-denied',
  'session-desync',
  'truncated-output',
  'warning',
  'save-failed',
]);

export type OutputClassification = z.infer<typeof OutputClassificationSchema>;

// ============================================================================
// IOS Mode
// ============================================================================

export const IosModeSchema = z.enum([
  'user-exec',
  'priv-exec',
  'config',
  'config-if',
  'config-line',
  'config-router',
  'config-subif',
  'config-vlan',
  'config-router-af',
  'config-route-map',
  'config-class-map',
  'config-policy-map',
  'config-dhcp',
  'config-crypto-map',
  'config-keychain',
  'config-std-nacl',
  'config-ext-nacl',
  'awaiting-password',
  'awaiting-confirm',
  'resolving-hostname',
  'copy-destination',
  'copy-progress',
  'reload-confirm',
  'erase-confirm',
  'username-prompt',
  'login-prompt',
  'desynced',
  'paging',
  'unknown',
]);

export type IosMode = z.infer<typeof IosModeSchema>;

// ============================================================================
// Session State
// ============================================================================

export const SessionStateSchema = z.object({
  mode: IosModeSchema,
  paging: z.boolean().optional(),
  awaitingConfirm: z.boolean().optional(),
  awaitingPassword: z.boolean().optional(),
  awaitingDnsLookup: z.boolean().optional(),
  desynced: z.boolean().optional(),
  deviceName: z.string().optional(),
});

export type SessionState = z.infer<typeof SessionStateSchema>;

// ============================================================================
// Command Result (Single Command)
// ============================================================================

export const CommandResultSchema = z.object({
  ok: z.boolean(),
  raw: z.string(),
  status: z.number(),
  parsed: z.record(z.string(), z.unknown()).optional(),
  error: z.string().optional(),
  parseError: z.string().optional(),
  paging: z.boolean().optional(),
  awaitingConfirm: z.boolean().optional(),
  awaitingDnsLookup: z.boolean().optional(),
  truncated: z.boolean().optional(),
  classification: OutputClassificationSchema.optional(),
  modeBefore: IosModeSchema.optional(),
  modeAfter: IosModeSchema.optional(),
  failedCommand: z.string().optional(),
  retryable: z.boolean().optional(),
  warnings: z.array(z.string()).optional(),
});

export type CommandResult = z.infer<typeof CommandResultSchema>;

// ============================================================================
// Config IOS Result (Batch Configuration)
// ============================================================================

export const ConfigIosResultSchema = z.object({
  ok: z.boolean(),
  device: z.string(),
  executed: z.number().optional(),
  skipped: z.boolean().optional(),
  modeFinal: IosModeSchema.optional(),

  // Results array
  results: z.array(z.object({
    command: z.string(),
    status: z.number(),
    output: z.string(),
    classification: z.string(),
  })).optional(),

  // Error details (when ok: false)
  error: z.string().optional(),
  failedAtIndex: z.number().optional(),
  failedCommand: z.string().optional(),
  failedOutput: z.string().optional(),
  failedClassification: z.string().optional(),

  // Save status
  saveAttempted: z.boolean().optional(),
  saveOk: z.boolean().optional(),
  saveOutput: z.string().optional(),
});

export type ConfigIosResult = z.infer<typeof ConfigIosResultSchema>;

// ============================================================================
// Exec IOS Result
// ============================================================================

export const ExecIosResultSchema = z.object({
  ok: z.boolean(),
  raw: z.string(),
  status: z.number().optional(),
  parsed: z.record(z.string(), z.unknown()).optional(),
  parseError: z.string().optional(),
  classification: z.string().optional(),
  session: SessionStateSchema.optional(),
  error: z.string().optional(),
});

export type ExecIosResult = z.infer<typeof ExecIosResultSchema>;

// ============================================================================
// Exec Interactive Result
// ============================================================================

export const ExecInteractiveResultSchema = z.object({
  raw: z.string(),
  parsed: z.record(z.string(), z.unknown()).optional(),
  session: SessionStateSchema.optional(),
  classification: z.string().optional(),
  modeBefore: z.string().optional(),
  modeAfter: z.string().optional(),
  source: z.enum(['terminal', 'synthetic', 'hybrid']).optional(),
});

export type ExecInteractiveResult = z.infer<typeof ExecInteractiveResultSchema>;

// ============================================================================
// Output Source (real, synthetic, hybrid)
// ============================================================================

export const OutputSourceSchema = z.enum(['terminal', 'synthetic', 'hybrid']);
export type OutputSource = z.infer<typeof OutputSourceSchema>;

// ============================================================================
// Error Codes
// ============================================================================

export const IosErrorCodeSchema = z.enum([
  'IOS_INVALID_INPUT',
  'IOS_INCOMPLETE_COMMAND',
  'IOS_AMBIGUOUS_COMMAND',
  'IOS_PASSWORD_REQUIRED',
  'IOS_CONFIRMATION_REQUIRED',
  'IOS_PAGING_TIMEOUT',
  'IOS_SAVE_FAILED',
  'IOS_UNSUPPORTED_DEVICE',
  'IOS_DEVICE_NOT_FOUND',
  'IOS_NO_CLI',
  'IOS_TIMEOUT',
  'IOS_UNKNOWN_ERROR',
  'IOS_INTERFACE_NOT_FOUND',
  'IOS_VLAN_NOT_FOUND',
  'IOS_MASK_INVALID',
  'IOS_IP_CONFLICT',
  'IOS_PERMISSION_DENIED',
  'IOS_DNS_LOOKUP_TIMEOUT',
  'IOS_SESSION_DESYNC',
  'IOS_TRUNCATED_OUTPUT',
]);

export type IosErrorCode = z.infer<typeof IosErrorCodeSchema>;

// ============================================================================
// Structured Error
// ============================================================================

export const IosErrorSchema = z.object({
  code: IosErrorCodeSchema,
  message: z.string(),
  device: z.string().optional(),
  command: z.string().optional(),
  output: z.string().optional(),
  classification: OutputClassificationSchema.optional(),
  modeBefore: IosModeSchema.optional(),
  modeAfter: IosModeSchema.optional(),
  retryable: z.boolean().optional(),
});

export type IosError = z.infer<typeof IosErrorSchema>;
