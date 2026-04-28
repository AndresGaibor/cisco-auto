import { describe, expect, test, vi } from "bun:test";
import { RuntimePrimitiveAdapter } from "./runtime-primitive-adapter.js";
import type { FileBridgePort } from "../application/ports/file-bridge.port.js";

function createBridge() {
  const calls: Array<{ type: string; payload: unknown; timeoutMs?: number }> = [];

  const bridge = {
    calls,
    start: () => undefined,
    stop: async () => undefined,
    sendCommandAndWait: vi.fn(async (type: string, payload: unknown, timeoutMs?: number) => {
      calls.push({ type, payload, timeoutMs });
      return {
        id: "cmd-1",
        ok: true,
        status: 0,
        completedAt: Date.now(),
        timings: {
          sentAt: Date.now() - 5,
          resultSeenAt: Date.now() - 1,
          receivedAt: Date.now(),
          waitMs: 5,
        },
        value: {
          ok: true,
          value: {
            name: "SW1",
            model: "3650-24PS",
            type: "switch_layer3",
            power: true,
            hasCommandLine: true,
          },
        },
      };
    }),
    readState: () => null,
    getStateSnapshot: () => null,
    getHeartbeat: () => null,
    getHeartbeatHealth: () => ({ state: "unknown" as const }),
    getBridgeStatus: () => ({ ready: true }),
    getContext: () => ({ bridgeReady: true, heartbeat: { state: "unknown" as const } }),
    on: () => ({}) as any,
    onAll: () => () => undefined,
    loadRuntime: async () => undefined,
    loadRuntimeFromFile: async () => undefined,
    isReady: () => true,
  } as unknown as FileBridgePort & { calls: typeof calls };

  return bridge;
}

describe("RuntimePrimitiveAdapter", () => {
  test("mapea device.inspect.fast a inspectDeviceFast", async () => {
    const bridge = createBridge();
    const adapter = new RuntimePrimitiveAdapter(bridge);

    const result = await adapter.runPrimitive("device.inspect.fast", { id: "id-1", device: "SW1" });

    expect(result.ok).toBe(true);
    expect(bridge.calls[0]?.type).toBe("inspectDeviceFast");
    expect(result.evidence).toMatchObject({
      timings: expect.any(Object),
    });
  });
});
