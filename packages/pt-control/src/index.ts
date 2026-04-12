// ============================================================================
// PT Control - Main Entry Point
// ============================================================================

// Controller - High-level API for controlling Packet Tracer
export {
  PTController,
  createPTController,
  createDefaultPTController,
  type PTControllerConfig,
} from "./controller/index.js";

// Types - All type definitions
export * from "./types/index.js";

// Virtual DOM - Event-driven topology state
export { VirtualTopology, createVirtualTopology } from "./vdom/index.js";

// Parsers - IOS output parsers
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

// Logging - NDJSON logging with session tracking
export { LogManager, getLogManager, resetLogManager } from "./logging/index.js";
export type { LogEntry, LogSession, LogConfig, LogQueryOptions, LogStats } from "./logging/index.js";
export { redactSensitive } from "./logging/index.js";
export type { CommandTraceEntry } from "./controller/index.js";

// IOS Session - Stateful IOS CLI session management
export {
  CliSession,
  createCliSession,
  type CommandHandler,
  type CommandHistoryEntry,
  type CliSessionState,
} from "@cisco-auto/ios-domain";

export {
  inferPromptState,
  type IosMode,
  type PromptState,
} from "@cisco-auto/ios-domain";

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

// IOS Capabilities - Device capability resolution
export {
  resolveCapabilities,
  type DeviceCapabilities,
} from "./domain/ios/capabilities/pt-capability-resolver.js";

export {
  IOSFamily,
  type IosDeviceModel,
} from "@cisco-auto/ios-domain";

// Device Validation - Validate devices against core catalog
export {
  validatePTModel,
  resolveModel,
} from "./shared/utils/helpers.js";
