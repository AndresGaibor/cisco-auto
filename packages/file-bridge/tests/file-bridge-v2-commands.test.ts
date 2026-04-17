import { describe, it, expect } from "bun:test";
import { waitForBridgeReady } from "../src/file-bridge-v2-commands.js";

describe("waitForBridgeReady", () => {
  it("espera hasta que el bridge quede listo", async () => {
    let calls = 0;
    const bridge = {
      isReady() {
        calls += 1;
        return calls >= 3;
      },
    };

    const inicio = Date.now();
    const ready = await waitForBridgeReady(bridge, 200, 10);
    const duracion = Date.now() - inicio;

    expect(ready).toBe(true);
    expect(calls).toBeGreaterThanOrEqual(3);
    expect(duracion).toBeGreaterThanOrEqual(20);
  });
});
