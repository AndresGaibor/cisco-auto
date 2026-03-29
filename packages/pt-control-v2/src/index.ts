// ============================================================================
// PT Control V2 - Main Entry Point
// ============================================================================

// Controller - High-level API for controlling Packet Tracer
export { 
  PTController, 
  FileBridge, 
  createPTController, 
  createDefaultPTController 
} from "./controller/index.js";
export type { FileBridgeConfig } from "./infrastructure/pt/file-bridge.js";

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
} from "./domain/ios/parsers/index.js";

// Runtime Generator - Generate PT runtime files
export { 
  RuntimeGenerator, 
  runGenerator,
  renderMainSource,
  renderRuntimeSource,
  MAIN_JS_TEMPLATE, 
  RUNTIME_JS_TEMPLATE 
} from "./runtime-generator/index.js";
export type { RuntimeGeneratorConfig } from "./runtime-generator/index.js";

// Logging - NDJSON logging with session tracking
export { LogManager, getLogManager, resetLogManager } from "./logging/index.js";
export type { LogEntry, LogSession, LogConfig, LogQueryOptions, LogStats } from "./logging/index.js";

// IOS Command Utilities
export {
  buildVlanCommands,
  buildTrunkCommands,
  buildSshCommands,
} from "./utils/ios-commands.js";

// IOS Session - Stateful IOS CLI session management
export {
  CliSession,
  createCliSession,
  type CommandHandler,
  type CommandHistoryEntry,
  type CliSessionState,
} from "./domain/ios/session/cli-session.js";

export {
  inferPromptState,
  type IosMode,
  type PromptState,
} from "./domain/ios/session/prompt-state.js";

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
} from "./domain/ios/session/command-result.js";

// IOS Capabilities - Device capability resolution
export {
  resolveCapabilities,
  type DeviceCapabilities,
} from "./domain/ios/capabilities/pt-capability-resolver.js";

export {
  IOSFamily,
  type IosDeviceModel,
} from "./domain/ios/capabilities/device-capabilities.js";
