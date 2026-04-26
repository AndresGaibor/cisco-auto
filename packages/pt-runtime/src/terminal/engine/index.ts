// ============================================================================
// Terminal Engine - Componentes modulares del motor de ejecución
// ============================================================================
// Exports públicos de los componentes extraídos de command-executor.ts.
// Estos componentes pueden ser usados individualmente o en conjunto.

// Command State Machine
export {
  CommandStateMachine,
  type CommandStateMachineConfig,
  type SendPagerAdvanceFn,
} from "./command-state-machine";

// Command Executor (orchestration)
export {
  executeTerminalCommand,
  type PTCommandLine,
  type ExecutionOptions,
  type CommandExecutionResult,
} from "./command-executor";

// Event Collection
export {
  createTerminalEventCollector,
  pushEvent,
  compactTerminalEvents,
  type TerminalEventCollector,
} from "./terminal-event-collector";

// Completion Controller
export {
  shouldFinalizeCommand,
  checkCommandFinished,
  COMMAND_END_GRACE_MS,
  COMMAND_END_MAX_WAIT_MS,
  HOST_COMMAND_END_GRACE_MS,
  type CompletionState,
} from "./terminal-completion-controller";

// Output Pipeline
export {
  buildFinalOutput,
  normalizeSessionKind,
  type OutputPipelineInput,
  type OutputPipelineResult,
} from "./terminal-output-pipeline";

// Error Resolver
export {
  resolveTerminalError,
  guessFailureStatus,
  isOnlyPrompt,
  normalizeStatus,
  type ErrorResolution,
} from "./terminal-error-resolver";

// Recovery Controller
export {
  detectDnsHangup,
  recover,
  shouldRetry,
  createRecoveryController,
  isRecoverableError,
  type TerminalRecoveryController,
} from "./terminal-recovery-controller";

// Observability
export {
  computeConfidenceString,
  computeConfidenceFromFactors,
  detectAnomalies,
  type ConfidenceLevel,
  type AnomalyReport,
} from "./terminal-observability";