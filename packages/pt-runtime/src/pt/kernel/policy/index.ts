export { isIosPrompt, inferIosModeFromPrompt, isConfigPromptText, normalizeIosMode } from "./prompt-detect.js";
export { normalizeEol, lastNonEmptyLine, appendStepOutput } from "./output-block.js";
export { isPagerOnlyLine, outputHasPager, nativeOutputTailHasActivePager } from "./pager-detect.js";
export { lineContainsCommandEcho, stripCommandEchoFromLine, blockHasCommandEcho } from "./echo-handlers.js";
export { extractLatestCommandBlock, extractCurrentCommandBlockStrict } from "./command-blocks.js";
export {
  isEndCommand,
  isPromptOnlyTransitionCommand,
  nativeEndCommandLooksComplete,
  nativePromptOnlyTransitionLooksComplete,
  nativeConfigCommandEchoAndPromptLooksComplete,
  nativeFallbackBlockLooksComplete,
  outputLooksComplete,
} from "./completion-checkers.js";
export {
  normalizeCommandForFallback,
  isLongOutputReadOnlyIosCommand,
  firstMeaningfulNativeOutputLine,
  lineLooksLikeNativeInterfaceHeader,
  nativeLongOutputLooksPartial,
  PARTIAL_LONG_OUTPUT_WARNING,
  buildNativeLongOutputWarnings,
  nativeLongOutputCanCompleteWithoutEcho,
  nativeLongOutputHasCommandEvidence,
} from "./long-output.js";
export {
  detectIosSemanticErrorFromOutput,
  isIosConfigPromptText,
  isIosConfigModeText,
  nativeSnapshotIsStillInConfigMode,
  inferModeFromPrompt,
} from "./semantic-errors.js";
export { isConfigMode, inferPromptFromTerminalText } from "./prompt-detect.js";
