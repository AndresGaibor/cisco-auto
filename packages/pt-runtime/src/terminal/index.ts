// ============================================================================
// Terminal Module - Exports públicos del subsistema terminal
// ============================================================================

// Session State & Registry
export {
  createTerminalSessionState,
  type TerminalSessionState,
  type TerminalMode,
  type TerminalHealth,
  type TerminalSessionKind,
} from "./session-state";

export {
  getSession,
  ensureSession,
  disposeSession,
  disposeAllSessions,
  getAllSessions,
} from "./session-registry";

// Detection
export {
  detectModeFromPrompt,
  detectSessionKind,
  detectWizardFromOutput,
  detectConfirmPrompt,
  detectPager,
  detectBootOutput,
  detectHostBusy,
  normalizePrompt,
  promptMatches,
  isPrivilegedMode,
  isConfigMode,
  isHostMode,
  needsEnable,
  needsConfigTerminal,
  readTerminalOutput,
  readTerminalSnapshot,
  sanitizeTerminalText,
  diffSnapshotStrict,
  stripBaselineOutput,
  detectDnsLookup,
} from "./prompt-detector";

// Pager
export {
  createPagerState,
  detectPager as detectPagerOutput,
  createPagerHandler,
  type PagerState,
} from "./pager-handler";

// Confirm
export {
  createConfirmHandler,
  createConfirmState,
  isConfirmPrompt,
  resolveConfirmType,
  type ConfirmState,
} from "./confirm-handler";

// Sanitizer
export {
  sanitizeCommandOutput,
  sanitizeCommandOutputSimple,
  stripAnsi,
  stripBell,
  stripNonPrintable,
  processBackspaces,
  normalizeWhitespace,
} from "./command-sanitizer";

// Execution
export {
  createCommandExecutor,
  executeTerminalCommand,
  type CommandExecutionResult,
  type ExecutionOptions,
  type PTCommandLine,
} from "./command-executor";

// Output Extractor
export {
  extractCommandOutput,
  sliceAroundCommand,
  finalClean,
  preferCommandSlice,
  type CommandSessionKind,
  type ExtractOptions,
  type ExtractResult,
} from "./command-output-extractor";

// Terminal Ready
export {
  getPromptSafe,
  getModeSafe,
  isTerminalReadyForCommand,
  wakeTerminal,
  ensureTerminalReady,
  ensureTerminalReadySync,
  type TerminalReadyOptions,
} from "./terminal-ready";

export { createModeGuard, type ModeTransitionResult } from "./mode-guard";

// Planning
export {
  createTerminalPlan,
  createCommandStep,
  type TerminalPlan,
  type TerminalPlanStep,
  type TerminalPlanResult,
  type TerminalPlanPolicies,
} from "./terminal-plan";

export { createPlanEngine } from "./plan-engine";

// Standard Plans
export {
  createIosShowPlan,
  createIosConfigPlan,
  createIosEnablePlan,
  createIosSaveConfigPlan,
  createHostPingPlan,
  createHostIpconfigPlan,
  createHostTracertPlan,
  createHostArpPlan,
  createHostRoutePlan,
} from "./standard-plans";

// Evidence & Errors
export {
  buildEvidence,
  hasValidEvidence,
  calculateConfidence,
  type TerminalExecutionEvidence,
} from "./ios-evidence";

export {
  TerminalErrors,
  createTerminalError,
  type TerminalErrorCode,
  type TerminalError,
} from "./terminal-errors";

// Re-export existing pt/terminal where still useful
export { isStatusOk, CommandStatus, type CommandEndedPayload } from "../pt/terminal/terminal-events";
export { createTerminalSession, toSnapshot, type TerminalSessionState as ExistingSessionState } from "../pt/terminal/terminal-session";
export { parsePrompt, type IosMode } from "../pt/terminal/prompt-parser";