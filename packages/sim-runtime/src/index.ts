/**
 * @cisco-auto/sim-runtime
 * 
 * Estado vivo del runtime de simulación.
 */

// Runtime state types (exclude RouteEntry since it's in protocols/routing)
export type {
  InterfaceRuntime,
  FrameQueueEntry,
  MACEntry,
  ARPEntry,
  DeviceRuntime,
  RuntimeEvent,
  LinkRuntime,
  TransitFrame,
  RuntimeState,
  TraceEntry
} from './runtime';

export { RuntimeFactory } from './runtime';

// Device handlers
export * from './device-handlers';

// L3 Protocols (includes RouteEntry, ARPEntry, etc)
export * from './protocols';