import { describe, expect, test, vi } from "bun:test";

import { createOmniAdapter } from "../../adapters/runtime-omni-adapter.js";

describe("runtime omni adapter", () => {
  test("eval capability uses omni.evaluate.raw command", async () => {
    const bridge = {
      sendCommandAndWait: vi.fn().mockResolvedValue({
        ok: true,
        value: { result: 123 },
        error: undefined,
        completedAt: Date.now(),
      }),
    } as any;

    const adapter = createOmniAdapter({ bridge });

    const result = await adapter.runOmniCapability("omni.evaluate.raw", { code: "return 123;" });

    expect(bridge.sendCommandAndWait).toHaveBeenCalledTimes(1);
    expect(bridge.sendCommandAndWait).toHaveBeenCalledWith(
      "omni.evaluate.raw",
      { code: "return 123;" },
      expect.any(Number),
    );
    expect(result.ok).toBe(true);
    expect(result.value).toBe(123);
  });
});
