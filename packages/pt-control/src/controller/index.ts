/**
 * Controller module - Public API for PTController and related components.
 *
 * This is a thin barrel that re-exports all public types and classes from
 * the controller module. The main PTController class has been split into:
 * - pt-controller.ts: Main PTController class
 * - host-command-service.ts: Host command execution service
 * - factory.ts: Factory functions for creating controllers
 * - topology-controller.ts: Topology management
 * - ios-controller.ts: IOS command execution
 * - snapshot-controller.ts: Snapshot and cache management
 * - runtime-controller.ts: Runtime and diagnostics management
 *
 * Facades (abstractions over services):
 * - device-facade.ts: Device inspection and module management
 * - link-facade.ts: Link management
 * - host-facade.ts: Host (PC/Server-PT) command execution
 * - topology-facade.ts: Topology management
 * - ios-facade.ts: IOS operations and device capabilities
 * - canvas-facade.ts: Canvas (zones) operations
 * - context-facade.ts: Context and health information
 * - inspection-facade.ts: Deep inspection operations
 */

// ============================================================================
// PTController and factories
// ============================================================================

export { PTController } from "./pt-controller.js";
export type { CommandTraceEntry } from "./pt-controller.js";
export { createPTController, createDefaultPTController, type PTControllerConfig } from "./factory.js";

// ============================================================================
// Sub-controllers (for consumers who need direct access)
// ============================================================================

export { TopologyController } from "./topology-controller.js";
export { IosController } from "./ios-controller.js";
export { SnapshotController } from "./snapshot-controller.js";
export { RuntimeController } from "./runtime-controller.js";
export { HostCommandService } from "./host-command-service.js";
export type {
  HostCommandResult,
  PingStats,
  HostHistoryEntry,
  HostHistoryResult,
  PingResult,
} from "./host-command-service.js";

// ============================================================================
// Infrastructure services (used by sub-controllers, exposed for advanced usage)
// ============================================================================

export { BridgeService } from "./bridge-service.js";
export { ControllerContextService } from "./context-service.js";
export { SnapshotService } from "./snapshot-service.js";
export { CommandTraceService } from "./command-trace-service.js";
export { ControllerIosService } from "./ios-service.js";
export { ControllerCanvasService } from "./canvas-service.js";
export { ControllerTopologyService } from "./topology-service.js";

// ============================================================================
// Facades (abstractions over services)
// ============================================================================

export { TopologyFacade } from "./topology-facade.js";
export { IosFacade } from "./ios-facade.js";
export { CanvasFacade } from "./canvas-facade.js";
export { ContextFacade } from "./context-facade.js";
export { DeviceFacade } from "./device-facade.js";
export { LinkFacade } from "./link-facade.js";
export { HostFacade } from "./host-facade.js";
export { InspectionFacade } from "./inspection-facade.js";
