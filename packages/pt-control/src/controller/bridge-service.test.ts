import { describe, expect, test } from "bun:test";
import { BridgeService } from "./bridge-service.js";

function createBridge() {
  return {
    startCalled: 0,
    stopCalled: 0,
    start() {
      this.startCalled += 1;
    },
    stop: async function () {
      this.stopCalled += 1;
    },
    readState: () => ({ ok: true }),
    loadRuntime: async () => undefined,
    loadRuntimeFromFile: async () => undefined,
    on: () => ({}),
    onAll: () => ({}),
  } as any;
}

function createCache() {
  return {
    startCalled: 0,
    stopCalled: 0,
    start() {
      this.startCalled += 1;
    },
    stop() {
      this.stopCalled += 1;
    },
  } as any;
}

describe("BridgeService", () => {
  test("encapsula ciclo de vida y passthrough de bridge", async () => {
    const bridge = createBridge();
    const cache = createCache();
    const service = new BridgeService(bridge, cache);

    service.start();
    await service.stop();

    expect(bridge.startCalled).toBe(1);
    expect(bridge.stopCalled).toBe(1);
    expect(cache.startCalled).toBe(1);
    expect(cache.stopCalled).toBe(1);
    expect(service.readState()).toEqual({ ok: true });
  });
});
