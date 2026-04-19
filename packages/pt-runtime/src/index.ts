// ============================================================================
// PT Runtime - Public API
// ============================================================================
// API pública mínima y deliberada.
// Sin lógica CLI.
// Sin promoción de superficies legacy innecesarias.

export {
  createRuntimeState,
  bootstrapKernel,
  createDispatchLoop,
  createRuntimeLoader,
  createCleanupManager,
  isIdempotentClean,
  safeCleanup,
} from "./kernel";

export { listRuntimeSnapshots, restoreRuntimeSnapshot } from "./runtime-artifacts";

// --------------------------------------------------------------------
// Terminal - solo subsistema nuevo público
// --------------------------------------------------------------------
export {
  createTerminalSessionState,
  getSession,
  ensureSession,
  disposeSession,
  disposeAllSessions,
  detectModeFromPrompt,
  detectWizardFromOutput,
  detectConfirmPrompt,
  normalizePrompt,
  promptMatches,
  createPagerState,
  detectPagerOutput,
  createPagerHandler,
  createCommandExecutor,
  createModeGuard,
  createTerminalPlan,
  createCommandStep,
  createPlanEngine,
  buildEvidence,
  hasValidEvidence,
  calculateConfidence,
  TerminalErrors,
  createTerminalError,
  type TerminalSessionState,
  type TerminalMode,
  type TerminalHealth,
  type PagerState,
  type CommandExecutionResult,
  type ExecutionOptions,
  type PTCommandLine,
  type ModeTransitionResult,
  type TerminalPlan,
  type TerminalPlanStep,
  type TerminalPlanResult,
  type TerminalPlanPolicies,
  type TerminalExecutionEvidence,
  type TerminalErrorCode,
  type TerminalError,
} from "./terminal";

// --------------------------------------------------------------------
// Primitives - API pública aprobada
// --------------------------------------------------------------------
export {
  addDevice,
  removeDevice,
  renameDevice,
  moveDevice,
  listDevices,
  addLink,
  removeLink,
  addModule,
  removeModule,
  inspectModuleSlots,
  setIp,
  setGateway,
  setDns,
  setDhcp,
  topologySnapshot,
  hardwareInfo,
  processInfo,
  registerPrimitive,
  getPrimitive,
  listPrimitives,
  getPrimitivesByDomain,
  executePrimitive,
  type PrimitiveDomain,
  type PrimitiveResult,
  type PrimitiveEntry,
  type PrimitiveContext,
} from "./primitives";

// --------------------------------------------------------------------
// Omni adapters - API pública aprobada
// --------------------------------------------------------------------
export {
  evaluateExpression,
  getAssessmentItem,
  accessGlobal,
  getProcess,
  getEnvironmentInfo,
  serializeDevice,
  type OmniResult,
} from "./omni";

// --------------------------------------------------------------------
// Compat validators
// --------------------------------------------------------------------
export {
  validateES5,
  validatePTSafe,
  type ES5ValidationResult,
  type ES5ValidationError,
  type PTSafeValidationResult,
  type PTSafeValidationError,
  type PTSafeOptions,
} from "./compat";

// --------------------------------------------------------------------
// Build system - API pública mínima
// --------------------------------------------------------------------
export {
  validatePtSafe,
  formatValidationResult,
  computeChecksum,
  normalizeArtifactForChecksum,
  renderRuntimeV2,
  renderRuntimeV2Sync,
  renderMainV2,
  renderCatalog,
  RuntimeGenerator,
  ModularRuntimeGenerator,
  type RuntimeGeneratorConfig,
  type ModularGeneratorConfig,
  type ModularManifest,
} from "./build/index.js";

export type {
  RuntimeArtifactManifest,
  RuntimeBuildChangeReport,
  RuntimeBuildReport,
} from "./build/manifest.js";

// --------------------------------------------------------------------
// PT compatibility contract - público para pt-control
// --------------------------------------------------------------------
export * from "./contracts/pt-compatibility.js";
