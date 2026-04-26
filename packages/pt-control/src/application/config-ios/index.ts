// ============================================================================
// Config IOS Application Layer
// ============================================================================

// Types
export type {
  ConfigIOSPayload,
  ConfigIOSResult,
  VerificationStep,
  VerificationPlan,
} from "./config-ios-types.js";

// Verification planner (pure functions)
export {
  buildVerificationPlan,
  detectCommandType,
  buildVerificationPlanRich,
} from "./verification-planner.js";

// Use cases
export {
  applyConfigIOS,
  verifyConfigIOS,
  type ConfigIOSControllerPort,
  type ConfigIOSDevice,
  type ConfigIOSApplyResult,
  type ConfigIOSUseCaseResult,
  type ConfigIOSVerification,
  type ConfigIOSVerificationCheck,
} from "./config-ios-use-cases.js";