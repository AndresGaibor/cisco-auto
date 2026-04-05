// ============================================================================
// FileBridge Port - Interface for Packet Tracer communication
// ============================================================================
// This port defines the contract for communicating with Packet Tracer.
// Infrastructure implementations (e.g., FileBridge, FileBridgeV2) must satisfy this interface.

import type { PTEvent, PTEventType } from "../../contracts/index.js";
import type { BridgeResultEnvelope } from "@cisco-auto/file-bridge";

/**
 * Event handler signature for PT events
 */
export type EventHandler<E extends PTEventType = PTEventType> = (
  event: PTEvent
) => void;

/**
 * FileBridge Port - Abstraction for PT communication bridge
 *
 * This port allows application services to interact with Packet Tracer
 * without depending on concrete infrastructure implementations.
 */
export interface FileBridgePort {
  /**
   * Start the bridge
   */
  start(): void;

  /**
   * Stop the bridge gracefully
   */
  stop(): Promise<void>;

  /**
   * Send a command to PT and wait for its result
   */
  sendCommandAndWait<T = unknown>(type: string, payload: unknown, timeoutMs?: number): Promise<BridgeResultEnvelope<T>>;

  /**
   * Read current state from PT
   */
  readState<T = unknown>(): T | null;

  /**
   * Semantic alias for readState - clearer name for consumers
   */
  getStateSnapshot<T = unknown>(): T | null;

  /**
   * Read the raw heartbeat object written by the runtime/bridge
   * Returns parsed JSON or null if missing / unparsable
   */
  getHeartbeat<T = unknown>(): T | null;

  /**
   * Lightweight health summary for the heartbeat file
   */
  getHeartbeatHealth(): {
    state: "ok" | "stale" | "missing" | "unknown";
    ageMs?: number;
    lastSeenTs?: number;
  };

  /**
   * Expose a small set of runtime/bridge status flags and queue stats
   */
  getBridgeStatus(): {
    ready: boolean;
    leaseValid?: boolean;
    queuedCount?: number;
    inFlightCount?: number;
    warnings?: string[];
  };

  /**
   * Minimal aggregated context for CLI/system consumers
   */
  getContext(): {
    bridgeReady: boolean;
    heartbeat: {
      state: "ok" | "stale" | "missing" | "unknown";
      ageMs?: number;
      lastSeenTs?: number;
    };
  };

  /**
   * Subscribe to events of a specific type
   */
  on<E extends PTEventType>(eventType: E, handler: EventHandler<E>): this;

  /**
   * Subscribe to all events
   */
  onAll(handler: (event: any) => void): () => void;

  /**
   * Load runtime JavaScript code into PT
   */
  loadRuntime(code: string): Promise<void>;

  /**
   * Load runtime from file
   */
  loadRuntimeFromFile(filePath: string): Promise<void>;

  /**
   * Check if the bridge is ready to accept commands
   * Bridge is ready when running and holding a valid lease
   */
  isReady(): boolean;
}
