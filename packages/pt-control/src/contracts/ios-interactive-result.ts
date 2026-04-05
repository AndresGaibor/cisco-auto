/**
 * PT Control - IOS Interactive Result Contract
 * 
 * Re-export of ios-interactive-result types from @cisco-auto/types
 * for consistency with other pt-control contracts.
 * 
 * Fase 6: Replaces heuristic-based result handling with explicit state machine tracking.
 */

export {
  CompletionReasonSchema,
  InteractionMetricsSchema,
  SessionInfoSchema,
  DiagnosticsSchema,
  TranscriptEntrySchema,
  IosInteractiveResultSchema,
  createSuccessResult,
  createFailedResult,
  createSyntheticResult,
  type CompletionReason,
  type InteractionMetrics,
  type SessionInfo,
  type Diagnostics,
  type TranscriptEntry,
  type IosInteractiveResult,
} from '@cisco-auto/types/schemas/ios-interactive-result';
