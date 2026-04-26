// ============================================================================
// PT Control - Main Entry Point (Arquitectura Ports & Adapters)
// ============================================================================

// ============================================================================
// PORTS - Contratos (interfaces)
// ============================================================================

export type {
  RuntimePrimitivePort,
  PrimitivePortOptions,
  PrimitivePortResult,
} from "./ports/runtime-primitive-port.js";

export type {
  RuntimeTerminalPort,
  TerminalPortOptions,
  TerminalPortResult,
  TerminalPlan,
  TerminalPlanStep,
} from "./ports/runtime-terminal-port.js";

export type {
  RuntimeOmniPort,
  OmniPortOptions,
  OmniPortResult,
  OmniCapabilityMetadata,
  OmniRisk,
  OmniDomain,
} from "./ports/runtime-omni-port.js";

// ============================================================================
// ADAPTERS - Implementaciones concretas
// ============================================================================

export { RuntimePrimitiveAdapter } from "./adapters/runtime-primitive-adapter.js";
export { createRuntimeTerminalAdapter } from "./adapters/runtime-terminal-adapter.js";
export { RuntimeOmniAdapter, createOmniAdapter } from "./adapters/runtime-omni-adapter.js";

// ============================================================================
// ORCHESTRATOR
// ============================================================================

export { createOrchestrator, executeIntent } from "./application/orchestration/index.js";
export type { OrchestratorConfig, OrchestratorContext } from "./application/orchestration/index.js";

// ============================================================================
// COMPOSITION ROOT (pendiente)
// ============================================================================

// TODO: Implementar controlComposition que injectable los ports y orchestrator
// export { controlComposition } from "./application/bootstrap/control-composition";

// ============================================================================
// CONTRACTS (contratos de negocio)
// ============================================================================

export * from "./contracts/omniscience.js";
export * from "./contracts/ios-execution-evidence.js";

// ============================================================================
// OMNI (Capability Harness)
// ============================================================================

export * from "./omni/index.js";

// ============================================================================
// AGENT (workflows de agentes)
// ============================================================================

export * from "./agent/index.js";

// ============================================================================
// QUALITY GATES
// ============================================================================

export * from "./quality/index.js";

// ============================================================================
// PT FEATURE MODULES
// ============================================================================

export * from "./pt/terminal/index.js";
export * from "./pt/topology/index.js";
export * from "./pt/server/index.js";
export * from "./pt/planner/index.js";
export * from "./pt/ledger/index.js";
export * from "./pt/diagnosis/index.js";

// ============================================================================
// LEGACY EXPORTS (mantenidos por compatibilidad)
// ============================================================================

// Controller - API de alto nivel
export {
  PTController,
  createPTController,
  createDefaultPTController,
} from "./controller/index.js";

// Virtual DOM
export { VirtualTopology, createVirtualTopology } from "./vdom/index.js";

// Parsers IOS
export {
  parseShowIpInterfaceBrief,
  parseShowVlan,
  parseShowIpRoute,
  parseShowRunningConfig,
  parseShowInterfaces,
  parseShowIpArp,
  parseShowMacAddressTable,
  parseShowSpanningTree,
  parseShowVersion,
  parseShowCdpNeighbors,
  getParser,
  PARSERS,
} from "@cisco-auto/ios-domain";

// Logging
export { LogManager, getLogManager, resetLogManager } from "./logging/index.js";
export type {
  LogEntry,
  LogSession,
  LogConfig,
  LogQueryOptions,
  LogStats,
} from "./logging/index.js";
export { redactSensitive } from "./logging/index.js";
export type { CommandTraceEntry } from "./controller/index.js";

// IOS Session
export {
  CliSession,
  createCliSession,
  type CommandHandler,
  type CommandHistoryEntry,
  type CliSessionState,
} from "@cisco-auto/ios-domain";

export { inferPromptState, type IosMode, type PromptState } from "@cisco-auto/ios-domain";

export {
  type CommandResult,
  createSuccessResult,
  createErrorResult,
  isSuccessResult,
  isErrorResult,
  isPagingResult,
  isConfirmPrompt,
  isPasswordPrompt,
  classifyOutput,
  type OutputClassificationType,
} from "@cisco-auto/ios-domain";

// IOS Capabilities
export {
  resolveCapabilities,
  type DeviceCapabilities,
} from "./domain/ios/capabilities/pt-capability-resolver.js";

export { IOSFamily, type IosDeviceModel } from "@cisco-auto/ios-domain";

// Device Validation
export { validatePTModel, resolveModel } from "./shared/utils/helpers.js";

// Device Builder
export * from "./verification/builders/device-builder.js";

// PT Compatibility Contract
export {
  assertCatalogLoaded,
  assertCatalogHealth,
  getContractSummary,
  type PTCatalogHealth,
} from "@cisco-auto/pt-runtime";

// Application Services
export {
  LayoutPlannerService,
  PortPlannerService,
  LinkFeasibilityService,
  OmniscienceService,
  ScenarioService,
  WlcService,
  createTerminalCommandService,
} from "./application/services/index.js";

// Capability Matrix
export * from "@cisco-auto/kernel/domain/ios/capability-matrix";

// Types
export * from "./types/index.js";

// Commands
export {
  runBridgeDoctor,
  printBridgeDoctorReport,
  type BridgeDoctorReport,
} from "./commands/bridge-doctor-command.js";
