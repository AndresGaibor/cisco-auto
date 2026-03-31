// ============================================================================
// FileBridge Port - Interface for Packet Tracer communication
// ============================================================================
// This port defines the contract for communicating with Packet Tracer.
// Infrastructure implementations (e.g., FileBridge, FileBridgeV2) must satisfy this interface.

import type { PTEvent, PTEventType, CommandPayload } from "../../contracts/index.js";

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
    payload: CommandPayload,
    timeoutMs?: number
  ): Promise<{ event: PTEvent; value: T }>;

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
  ): () => void;

  /**
   * Subscribe to all events
   */
  onAll(handler: EventHandler): () => void;

  /**
   * Load runtime JavaScript code into PT
   */
  loadRuntime(code: string): Promise<void>;

  /**
   * Load runtime from file
   */
  loadRuntimeFromFile(filePath: string): Promise<void>;
}
