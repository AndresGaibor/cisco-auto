export { createTerminalCommandService } from "./terminal-command-service.js";
export type { TerminalControllerPort, TerminalCommandServiceDeps } from "./terminal-command-service.js";
export { createDeviceKindResolver } from "./device-kind-resolver.js";
export { createTerminalReadinessChecker } from "./terminal-readiness-checker.js";
export type { HeartbeatHealth } from "./terminal-readiness-checker.js";
export { createIosCommandExecutor } from "./ios-command-executor.js";
export { createHostCommandExecutor } from "./host-command-executor.js";
export {
  buildCommandResult,
  createRuntimeUnavailableResult,
  createUnknownDeviceResult,
  extractIosFailureDetails,
  detectIosSemanticFailure,
  isPrivilegedIosCommand,
  firstString,
  normalizeWarnings,
} from "./command-result-mapper.js";
export type { IosFailureDetails } from "./command-result-mapper.js";
export {
  measureServiceAsync,
  measureServiceSync,
  attachTerminalServiceTimings,
  serviceNowMs,
  addServiceTiming,
} from "./command-timing-recorder.js";
export type { TerminalServiceTimingMap } from "./command-timing-recorder.js";