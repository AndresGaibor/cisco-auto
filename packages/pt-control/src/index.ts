// ============================================================================
// @cisco-auto/pt-control
// Stable public API
// ============================================================================
//
// Este entrypoint debe mantenerse pequeño.
// No exportar aquí experimental, omni, agent, quality, pt/* ni application services.
// Usar subpaths explícitos:
// - @cisco-auto/pt-control/controller
// - @cisco-auto/pt-control/services
// - @cisco-auto/pt-control/agent
// - @cisco-auto/pt-control/omni
// - @cisco-auto/pt-control/pt/diagnosis
// - etc.
// ============================================================================

// Controller estable
export {
  PTController,
  createPTController,
  createDefaultPTController,
} from "./controller/index.js";

export type { CommandTraceEntry } from "./controller/index.js";

// Contratos públicos estables
export type {
  PTEvent,
  PTEventType,
  TopologySnapshot,
  DeviceState,
  LinkState,
  AddLinkPayload,
  DevicesInRectResult,
  DeviceListResult,
  ConnectionInfo,
  UnresolvedLink,
  NetworkTwin,
} from "./contracts/index.js";

// Evidencia IOS pública
export {
  deriveIosConfidence,
} from "./contracts/ios-execution-evidence.js";

export type {
  IosExecutionEvidence,
  IosExecutionSuccess,
  IosConfigApplyResult,
  IosConfidence,
} from "./contracts/ios-execution-evidence.js";

// Ports públicos
export type {
  RuntimePrimitivePort,
  PrimitivePortOptions,
  PrimitivePortResult,
} from "./ports/index.js";

export type {
  RuntimeTerminalPort,
  TerminalPortOptions,
  TerminalPortResult,
  TerminalPlan,
  TerminalPlanStep,
} from "./ports/index.js";

export type {
  RuntimeOmniPort,
  OmniPortOptions,
  OmniPortResult,
  OmniCapabilityMetadata,
  OmniRisk,
  OmniDomain,
} from "./ports/index.js";

// Adapters estables de runtime
export {
  RuntimePrimitiveAdapter,
} from "./adapters/index.js";

export {
  createRuntimeTerminalAdapter,
} from "./adapters/index.js";

// Logging estable
export {
  LogManager,
  getLogManager,
  resetLogManager,
  redactSensitive,
} from "./logging/index.js";

export type {
  LogEntry,
  LogSession,
  LogConfig,
  LogQueryOptions,
  LogStats,
} from "./logging/index.js";
