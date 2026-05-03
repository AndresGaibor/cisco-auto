// ============================================================================
// IOS Handlers Barrel - Runtime-safe handler exports only
// ============================================================================
//
// IMPORTANTE:
// Este barrel NO debe exportar helpers async, session utils, parsers,
// stabilizers ni terminal engine. runtime.js solo necesita handlers sync.

export { handleExecIos } from "./exec-ios-handler";
export { handleConfigIos } from "./config-ios-handler";
export { handleDeferredPoll } from "./deferred-poll-handler";
export { handlePing } from "./ping-handler";
export { handleExecPc } from "./exec-pc-handler";
export { handleReadTerminal } from "./read-terminal-handler";