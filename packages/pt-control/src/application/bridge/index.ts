/**
 * Bridge module - Bridge stats and cleaning service for CLI observability.
 */

export type {
  BridgeStats,
  QueueStats,
  BridgeCleanResult,
  RuntimeTraceEntry,
  RuntimeTraceReport,
} from "../bench-types.js";

export { getBridgeStats, cleanBridge, cleanStaleInFlight, getRuntimeTrace } from "./bridge-service.js";