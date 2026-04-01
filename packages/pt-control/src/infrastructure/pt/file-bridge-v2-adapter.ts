/**
 * FileBridgeV2Adapter — implements FileBridgePort, wraps FileBridgeV2
 *
 * V2 uses a different protocol surface than V1:
 * - V2.sendCommandAndWait(type, payload) vs V1.sendCommandAndWait(payload)
 * - V2 returns BridgeResultEnvelope, V1 returns { event: PTEvent; value: T }
 *
 * This adapter translates between the two so application services
 * can remain agnostic to which bridge version is in use.
 */
import type { FileBridgePort } from "../../application/ports/file-bridge.port.js";
import type { PTEvent, PTEventType } from "../../contracts/index.js";
import type { CommandPayload } from "../../contracts/commands.js";
import { FileBridgeV2, type FileBridgeV2Options } from "@cisco-auto/file-bridge";

export class FileBridgeV2Adapter implements FileBridgePort {
  constructor(readonly v2: FileBridgeV2) {}

  // ============================================================================
  // FileBridgePort implementation
  // ============================================================================

  async sendCommandAndWait<T = unknown>(
    payload: CommandPayload,
    timeoutMs?: number,
  ): Promise<{ event: PTEvent; value: T }> {
    // V2 separates type from payload; V1 embeds type in payload.type
    const result = await this.v2.sendCommandAndWait<CommandPayload, T>(
      payload.type,
      payload,
      timeoutMs,
    );

    // Translate BridgeResultEnvelope → { event: PTEvent; value: T }
    // The V1 PTEvent shape is { type, ts, id, ok, value, parsed }
    const event: PTEvent = {
      type: result.ok ? "result" : "error",
      ts: result.completedAt,
      id: result.id,
      ok: result.ok,
      value: result.value as T,
      parsed: (result.value as Partial<{ parsed: unknown }>)?.parsed ?? result.value,
    } as PTEvent;

    return { event, value: result.value as T };
  }

  readState<T = unknown>(): T | null {
    // Delegate to V2 readState (reads state.json)
    return this.v2.readState<T>();
  }

  on<E extends PTEventType>(
    eventType: E,
    handler: (event: PTEvent) => void,
  ): () => void {
    this.v2.on(eventType, handler as (event: unknown) => void);
    return () => this.v2.off(eventType, handler as (event: unknown) => void);
  }

  onAll(
    handler: (event: PTEvent) => void,
  ): () => void {
    this.v2.on("*", handler as (event: unknown) => void);
    return () => this.v2.off("*", handler as (event: unknown) => void);
  }

  async loadRuntime(code: string): Promise<void> {
    return this.v2.loadRuntime(code);
  }

  async loadRuntimeFromFile(filePath: string): Promise<void> {
    return this.v2.loadRuntimeFromFile(filePath);
  }

  // ============================================================================
  // Lifecycle (called directly by PTController)
  // ============================================================================

  start(): void {
    this.v2.start();
  }

  async stop(): Promise<void> {
    await this.v2.stop();
  }

  isReady(): boolean {
    return this.v2.isReady();
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createFileBridgeV2Adapter(
  options: FileBridgeV2Options,
): FileBridgeV2Adapter {
  return new FileBridgeV2Adapter(new FileBridgeV2(options));
}
