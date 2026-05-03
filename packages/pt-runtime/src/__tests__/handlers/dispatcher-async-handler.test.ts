import { describe, expect, test, vi } from "bun:test";

import { registerHandler, runtimeDispatcher } from "../../handlers/dispatcher.js";

describe("runtimeDispatcher async handlers", () => {
  test("devuelve error explícito si un handler retorna Promise", () => {
    registerHandler(
      "__async_test_handler__",
      (async () => ({ ok: true, raw: "ignored" })) as any,
    );

    const api: any = {
      dprint: vi.fn(),
    };

    const result = runtimeDispatcher({ type: "__async_test_handler__" }, api);

    expect(result.ok).toBe(false);
    expect((result as any).code).toBe("ASYNC_HANDLER_NOT_SUPPORTED");
    expect((result as any).error).toContain("Promise");
  });
});
