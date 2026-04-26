// ============================================================================
// IOS Handlers Barrel - Re-exports all IOS handler functions
// ============================================================================

// Session utilities
export {
  withTimeout,
  getTerminalDevice,
  inferExpectedModeAfterCommand,
  DEFAULT_COMMAND_TIMEOUT,
  DEFAULT_STALL_TIMEOUT,
  type PTTerminal,
} from "./ios-session-utils";

// Host stabilization utilities
export { stabilizeHostPrompt, hostEchoLooksTruncated } from "./host-stabilize";

// Result mapping utilities
export { mapTerminalResultToPtResult, mapExecResultToTerminalResult } from "./ios-result-mapper";

// Handler functions
export { handleExecIos } from "./exec-ios-handler";
export { handleConfigIos } from "./config-ios-handler";
export { handleDeferredPoll } from "./deferred-poll-handler";
export { handlePing } from "./ping-handler";
export { handleExecPc } from "./exec-pc-handler";
export { handleReadTerminal } from "./read-terminal-handler";
