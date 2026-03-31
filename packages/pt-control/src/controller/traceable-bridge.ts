import type { FileBridgePort, EventHandler } from "../application/ports/file-bridge.port.js";
import type { CommandPayload } from "../contracts/commands.js";
import type { PTEvent, PTEventType } from "../contracts/index.js";

export interface CommandTraceEntry {
  id: string;
  type: CommandPayload["type"];
  completedAt: number;
  ok?: boolean;
}

export class TraceableBridgePort implements FileBridgePort {
  constructor(
    private readonly inner: FileBridgePort,
    private readonly record: (entry: CommandTraceEntry) => void,
  ) {}

  start(): void {
    this.inner.start();
  }

  stop(): Promise<void> {
    return this.inner.stop();
  }

  async sendCommandAndWait<T = unknown>(
    payload: CommandPayload,
    timeoutMs?: number,
  ): Promise<{ event: PTEvent; value: T }> {
    const result = await this.inner.sendCommandAndWait<T>(payload, timeoutMs);
    const event = result.event as PTEvent & { id?: string; ok?: boolean };

    if (event?.id) {
      this.record({
        id: event.id,
        type: payload.type,
        completedAt: typeof event.ts === "number" ? event.ts : Date.now(),
        ok: event.ok,
      });
    }

    return result;
  }

  readState<T = unknown>(): T | null {
    return this.inner.readState<T>();
  }

  on<E extends PTEventType>(eventType: E, handler: EventHandler<E>): () => void {
    return this.inner.on(eventType, handler);
  }

  onAll(handler: EventHandler): () => void {
    return this.inner.onAll(handler);
  }

  loadRuntime(code: string): Promise<void> {
    return this.inner.loadRuntime(code);
  }

  loadRuntimeFromFile(filePath: string): Promise<void> {
    return this.inner.loadRuntimeFromFile(filePath);
  }
}
