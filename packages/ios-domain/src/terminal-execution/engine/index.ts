// ============================================================================
// Terminal Engine - Componentes modulares del motor de ejecución
// ============================================================================
// Exports públicos de los componentes extraídos de command-executor.ts.
// Estos componentes pueden ser usados individualmente o en conjunto.

// Event Collection
export {
  createTerminalEventCollector,
  pushEvent,
  compactTerminalEvents,
  type TerminalEventCollector,
} from "./event-collector.js";

// Completion Controller
export {
  shouldFinalizeCommand,
  checkCommandFinished,
  COMMAND_END_GRACE_MS,
  COMMAND_END_MAX_WAIT_MS,
  HOST_COMMAND_END_GRACE_MS,
  type CompletionState,
} from "./completion-controller.js";

// Output Pipeline
export {
  buildFinalOutput,
  normalizeSessionKind,
  type OutputPipelineInput,
  type OutputPipelineResult,
} from "./output-pipeline.js";

// Error Resolver
export {
  resolveTerminalError,
  guessFailureStatus,
  isOnlyPrompt,
  normalizeStatus,
  type ErrorResolution,
} from "./error-resolver.js";

// Observability
export {
  computeConfidenceString,
  computeConfidenceFromFactors,
  detectAnomalies,
  type ConfidenceLevel,
  type AnomalyReport,
} from "./observability.js";
