// ============================================================================
// IOS Execution Handlers - Thin barrel re-export
// ============================================================================
// Este archivo existe unicamente para backward compatibility.
// Los handlers reales viven en handlers/ios/

export {
  handleExecIos,
  handleConfigIos,
  handleDeferredPoll,
  handlePing,
  handleExecPc,
  handleReadTerminal,
} from "./ios/index.js";
