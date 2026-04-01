// ============================================================================
// IOS Session Transcript - Command history with metadata for debugging
// ============================================================================

import type { IosMode } from "./prompt-state";

/**
 * A single command execution entry in the transcript
 */
export interface CommandTranscriptEntry {
  /** The command that was executed */
  command: string;
  /** Raw output from the command */
  raw: string;
  /** IOS mode before command execution */
  modeBefore: IosMode;
  /** IOS mode after command execution */
  modeAfter: IosMode;
  /** Classification of the output */
  classification: string;
  /** Whether the command succeeded */
  ok: boolean;
  /** Execution time in milliseconds */
  durationMs: number;
  /** Whether output was truncated */
  truncated?: boolean;
  /** Source of the output */
  source?: "terminal" | "synthetic" | "hybrid";
  /** Batch ID if part of a batch */
  batchId?: string;
  /** Index in batch if part of a batch */
  stepIndex?: number;
  /** Session ID */
  sessionId: string;
  /** Timestamp */
  timestamp: number;
  /** Error message if failed */
  error?: string;
  /** Warnings generated during execution */
  warnings?: string[];
}

/**
 * Complete transcript of a session's command history
 */
export interface SessionTranscript {
  /** Unique session identifier */
  sessionId: string;
  /** Device name */
  device: string;
  /** All command entries in order */
  entries: CommandTranscriptEntry[];
  /** Final IOS mode */
  modeFinal?: IosMode;
  /** Final session state */
  desynced: boolean;
  /** Last error if any */
  lastError?: string;
  /** Aggregation of all warnings */
  warnings: string[];
  /** Session start time */
  startedAt: number;
  /** Session end time (last command) */
  endedAt?: number;
}

/**
 * Summary of session health for monitoring
 */
export interface SessionHealthSummary {
  sessionId: string;
  device: string;
  mode: IosMode;
  desynced: boolean;
  paging: boolean;
  awaitingConfirm: boolean;
  awaitingPassword: boolean;
  awaitingDnsLookup: boolean;
  awaitingCopyDestination: boolean;
  awaitingReloadConfirm: boolean;
  awaitingEraseConfirm: boolean;
  lastCommandAgeMs: number;
  historyEntries: number;
  estimatedBytes: number;
}
