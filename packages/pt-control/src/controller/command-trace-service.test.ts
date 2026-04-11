import { describe, expect, test } from "bun:test";
import { CommandTraceService } from "./command-trace-service.js";

function createBridge() {
  let handler: ((event: unknown) => void) | null = null;
  return {
    onAll: (fn: (event: unknown) => void) => {
      handler = fn;
      return () => {};
    },
    emit: (event: unknown) => handler?.(event),
  } as any;
}

describe("CommandTraceService", () => {
  test("registra y drena eventos de comando", () => {
    const bridge = createBridge();
    const service = new CommandTraceService(bridge);

    bridge.emit({ id: "1", type: "command-finished", ts: 10, ok: true });
    bridge.emit({ id: "2", type: "other-event" });

    expect(service.drainCommandTrace()).toEqual([
      { id: "1", type: "command-finished", completedAt: 10, ok: true, ts: 10, status: undefined, commandType: undefined },
    ]);
    expect(service.drainCommandTrace()).toEqual([]);
  });
});
