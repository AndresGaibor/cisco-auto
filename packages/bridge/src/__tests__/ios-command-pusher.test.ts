import { test, expect, beforeEach, afterEach } from "bun:test";
import { pushCommands } from "../ios-command-pusher";

// Guardar y restaurar fetch global
let originalFetch: typeof fetch | undefined;

beforeEach(() => {
  // @ts-ignore
  originalFetch = globalThis.fetch;
});

afterEach(() => {
  // @ts-ignore
  globalThis.fetch = originalFetch;
});

test("pushCommands should succeed on first try", async () => {
  // Mock fetch que responde OK a la primera
  // @ts-ignore
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({ success: true, commandId: "cmd-1" }),
  });

  const res = await pushCommands("dev1", ["interface Gig0/1", "no shutdown"]);
  expect(res.success).toBe(true);
  expect(res.commandId).toBe("cmd-1");
});

test("pushCommands retries on failure and eventually succeeds", async () => {
  let calls = 0;
  // @ts-ignore
  globalThis.fetch = async () => {
    calls++;
    if (calls < 3) throw new Error("temporary network");
    return {
      ok: true,
      json: async () => ({ success: true, commandId: "cmd-2" }),
    };
  };

  const res = await pushCommands("dev2", ["hostname R2"]);
  expect(res.success).toBe(true);
  expect(res.commandId).toBe("cmd-2");
  expect(calls).toBeGreaterThanOrEqual(3);
});

test(
  "pushCommands returns error after retries exhausted",
  async () => {
    // Mock fetch que siempre falla
    // @ts-ignore
    globalThis.fetch = async () => {
      throw new Error("network down");
    };

    const res = await pushCommands("dev3", ["show run"]);
    expect(res.success).toBe(false);
    expect(res.error).toEqual(expect.any(String));
    expect((res.error || "").toLowerCase()).toContain("network");
  },
  { timeout: 20000 },
);
