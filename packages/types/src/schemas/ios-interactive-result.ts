import { z } from 'zod';
import { IosModeSchema, OutputClassificationSchema } from './ios-results';

/**
 * IOS Interactive Result Contract (Fase 6)
 * 
 * A rich, event-based result for interactive IOS terminal execution.
 * Replaces heuristic-based success detection with explicit state machine tracking.
 * 
 * This is the foundation for:
 * - execInteractive real implementation
 * - configIos improvements
 * - comprehensive transcript tracking
 * - formal error classification
 */

// ============================================================================
// Completion Reasons
// ============================================================================

export const CompletionReasonSchema = z.enum([
  'command-ended',           // Real commandEnded event received
  'prompt-stabilized',       // Stable prompt detected (fallback)
  'timeout',                 // Timeout waiting for completion
  'confirm-timeout',         // Timeout waiting for confirm answer
  'password-timeout',        // Timeout waiting for password
  'filename-timeout',        // Timeout waiting for destination filename
  'paging-timeout',          // Timeout handling paging
  'desync',                  // Session lost synchronization
  'user-cancelled',          // User cancelled execution
  'unknown',                 // Unknown completion reason
]);

export type CompletionReason = z.infer<typeof CompletionReasonSchema>;

// ============================================================================
// Interaction Metrics
// ============================================================================

export const InteractionMetricsSchema = z.object({
  pagesAdvanced: z.number().int().min(0).default(0),
  confirmsAnswered: z.number().int().min(0).default(0),
  passwordsRequested: z.number().int().min(0).default(0),
  destinationFilenameAnswered: z.number().int().min(0).default(0),
  modesChanged: z.number().int().min(0).default(0),
});

export type InteractionMetrics = z.infer<typeof InteractionMetricsSchema>;

// ============================================================================
// Session Info (from terminal state machine)
// ============================================================================

export const SessionInfoSchema = z.object({
  mode: IosModeSchema,
  paging: z.boolean().default(false),
  awaitingConfirm: z.boolean().default(false),
  awaitingPassword: z.boolean().default(false),
  awaitingDestinationFilename: z.boolean().default(false),
  awaitingDnsLookup: z.boolean().default(false),
  prompt: z.string().optional(),
  deviceName: z.string().optional(),
});

export type SessionInfo = z.infer<typeof SessionInfoSchema>;

// ============================================================================
// Diagnostics (source, reliability, errors)
// ============================================================================

export const DiagnosticsSchema = z.object({
  // Where did this result come from?
  source: z.enum(['terminal', 'synthetic', 'hybrid']).describe(
    'terminal: from real device CLI events, synthetic: from heuristics, hybrid: mixed'
  ),
  
  // Why did execution complete?
  completionReason: CompletionReasonSchema,
  
  // Command exit code (if available)
  commandStatus: z.number().int().optional().describe(
    'Exit status of the command (0=success, non-zero=error if available)'
  ),
  
  // Errors encountered during execution
  errors: z.array(z.string()).default([]),
  
  // Warnings (execution completed but with anomalies)
  warnings: z.array(z.string()).default([]),
  
  // Reliability indicator (0-100)
  reliabilityScore: z.number().int().min(0).max(100).optional(),
});

export type Diagnostics = z.infer<typeof DiagnosticsSchema>;

// ============================================================================
// Transcript Entry
// ============================================================================

export const TranscriptEntrySchema = z.object({
  timestamp: z.number().describe('Unix timestamp'),
  type: z.enum([
    'command-sent',
    'output',
    'prompt-changed',
    'mode-changed',
    'paging-advanced',
    'confirm-answered',
    'password-requested',
    'destination-filename-answered',
    'command-ended',
    'event',
  ]),
  payload: z.record(z.string(), z.unknown()).describe('Event-specific data'),
});

export type TranscriptEntry = z.infer<typeof TranscriptEntrySchema>;

// ============================================================================
// IosInteractiveResult (Main Contract)
// ============================================================================

export const IosInteractiveResultSchema = z.object({
  // Core result
  ok: z.boolean().describe('Command execution succeeded (based on completionReason, not heuristics)'),
  raw: z.string().describe('Full raw output from device'),
  
  // Parsed output (if applicable)
  parsed: z.record(z.string(), z.unknown()).optional().describe('Parsed structured data from output'),
  parseError: z.string().optional().describe('Error message if parsing failed'),
  
  // Session state after execution
  session: SessionInfoSchema.describe('Terminal session state after command'),
  
  // Interaction tracking
  interaction: InteractionMetricsSchema.describe('Metrics of interactive prompts handled'),
  
  // Comprehensive diagnostics
  diagnostics: DiagnosticsSchema.describe('Execution source, completion reason, errors, warnings'),
  
  // Execution details
  command: z.string().optional().describe('The command that was executed'),
  executionTimeMs: z.number().int().min(0).optional().describe('Total execution time in milliseconds'),
  
  // Transcript of the session (summarized for Fase 6, full in later phases)
  transcriptSummary: z.array(TranscriptEntrySchema).optional().describe(
    'Key events during execution (paging, confirms, mode changes, etc)'
  ),
  
  // Classification for high-level interpretation
  classification: OutputClassificationSchema.optional(),
});

export type IosInteractiveResult = z.infer<typeof IosInteractiveResultSchema>;

// ============================================================================
// Helpers for construction
// ============================================================================

/**
 * Factory for creating a successful IosInteractiveResult
 */
export function createSuccessResult(opts: {
  raw: string;
  command?: string;
  session: SessionInfo;
  interaction?: Partial<InteractionMetrics>;
  executionTimeMs?: number;
  parsed?: Record<string, unknown>;
  transcriptSummary?: TranscriptEntry[];
}): IosInteractiveResult {
  return {
    ok: true,
    raw: opts.raw,
    command: opts.command,
    session: opts.session,
    interaction: {
      pagesAdvanced: opts.interaction?.pagesAdvanced ?? 0,
      confirmsAnswered: opts.interaction?.confirmsAnswered ?? 0,
      passwordsRequested: opts.interaction?.passwordsRequested ?? 0,
      destinationFilenameAnswered: opts.interaction?.destinationFilenameAnswered ?? 0,
      modesChanged: opts.interaction?.modesChanged ?? 0,
    },
    diagnostics: {
      source: 'terminal',
      completionReason: 'command-ended',
      errors: [],
      warnings: [],
    },
    executionTimeMs: opts.executionTimeMs,
    parsed: opts.parsed,
    transcriptSummary: opts.transcriptSummary,
  };
}

/**
 * Factory for creating a failed/problematic IosInteractiveResult
 */
export function createFailedResult(opts: {
  raw: string;
  command?: string;
  session: SessionInfo;
  completionReason: CompletionReason;
  errors: string[];
  warnings?: string[];
  executionTimeMs?: number;
  transcriptSummary?: TranscriptEntry[];
}): IosInteractiveResult {
  return {
    ok: false,
    raw: opts.raw,
    command: opts.command,
    session: opts.session,
    interaction: {
      pagesAdvanced: 0,
      confirmsAnswered: 0,
      passwordsRequested: 0,
      destinationFilenameAnswered: 0,
      modesChanged: 0,
    },
    diagnostics: {
      source: 'terminal',
      completionReason: opts.completionReason,
      errors: opts.errors,
      warnings: opts.warnings ?? [],
    },
    executionTimeMs: opts.executionTimeMs,
    transcriptSummary: opts.transcriptSummary,
  };
}

/**
 * Factory for synthetic results (fallback, not from real device)
 */
export function createSyntheticResult(opts: {
  raw: string;
  ok: boolean;
  command?: string;
  session: SessionInfo;
  warnings: string[];
  executionTimeMs?: number;
}): IosInteractiveResult {
  return {
    ok: opts.ok,
    raw: opts.raw,
    command: opts.command,
    session: opts.session,
    interaction: {
      pagesAdvanced: 0,
      confirmsAnswered: 0,
      passwordsRequested: 0,
      destinationFilenameAnswered: 0,
      modesChanged: 0,
    },
    diagnostics: {
      source: 'synthetic',
      completionReason: 'unknown',
      errors: [],
      warnings: opts.warnings,
      reliabilityScore: 30, // Low confidence for synthetic
    },
    executionTimeMs: opts.executionTimeMs,
  };
}
