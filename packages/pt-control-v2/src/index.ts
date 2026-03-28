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
export type { FileBridgeConfig } from "./controller/file-bridge.js";

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
} from "./parsers/index.js";

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
