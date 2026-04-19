// ============================================================================
// PT Runtime - Public API
// ============================================================================
// API mínima pública. La lógica CLI fue movida a src/cli.ts

export {
  createRuntimeState,
  bootstrapKernel,
  createDispatchLoop,
  createRuntimeLoader as createPhase6RuntimeLoader,
  createCleanupManager as createPhase6CleanupManager,
  isIdempotentClean,
  safeCleanup,
} from "./kernel";

export { listRuntimeSnapshots, restoreRuntimeSnapshot } from "./runtime-artifacts";

// --------------------------------------------------------------------
// Terminal (nuevo subsistema Phase 2)
// --------------------------------------------------------------------
export {
  createCommandExecutor,
  type CommandExecutionResult,
  type ExecutionOptions,
  type PTCommandLine,
  ensureSession,
  getSession,
  detectModeFromPrompt,
  type TerminalMode,
  type TerminalErrorCode,
} from "./terminal";

// --------------------------------------------------------------------
// Primitives - API pública
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
  type PrimitiveDomain,
  type PrimitiveResult,
  type PrimitiveEntry,
  type PrimitiveContext,
  registerPrimitive,
  getPrimitive,
  listPrimitives,
  getPrimitivesByDomain,
  executePrimitive,
} from "./primitives";

// --------------------------------------------------------------------
// Omni - Funciones públicas de evaluación/adapter
// --------------------------------------------------------------------
export {
  type OmniResult,
  evaluateExpression,
  getAssessmentItem,
  accessGlobal,
  getProcess,
  getEnvironmentInfo,
  serializeDevice,
} from "./omni";

// --------------------------------------------------------------------
// Compat validators
// --------------------------------------------------------------------
export {
  validateES5,
  type ES5ValidationResult,
  type ES5ValidationError,
  validatePTSafe,
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
  renderRuntimeV2Sync as renderRuntimeSource,
  renderMainV2,
  renderMainV2 as renderMainSource,
  renderCatalog,
  RuntimeGenerator,
  type RuntimeGeneratorConfig,
} from "./build/index.js";

export {
  ModularRuntimeGenerator,
  type ModularGeneratorConfig,
  type ModularManifest,
} from "./build/render-runtime-modular.js";

export type {
  RuntimeArtifactManifest,
  RuntimeBuildChangeReport,
  RuntimeBuildReport,
} from "./build/manifest.js";

// --------------------------------------------------------------------
// PT Compatibility Contract - público para pt-control
// --------------------------------------------------------------------
export * from "./contracts/pt-compatibility.js";