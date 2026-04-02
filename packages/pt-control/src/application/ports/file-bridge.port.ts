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
  sendCommandAndWait<T = unknown>(
    type: string,
    payload: unknown,
    timeoutMs?: number
  ): Promise<BridgeResultEnvelope<T>>;

  /**
   * Read current state from PT
   */
  readState<T = unknown>(): T | null;

  /**
   * Subscribe to events of a specific type
   */
  on<E extends PTEventType>(
    eventType: E,
    handler: EventHandler<E>
  ): this;

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
