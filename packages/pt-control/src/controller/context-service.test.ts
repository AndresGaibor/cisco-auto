import { describe, expect, test } from "bun:test";
import { ControllerContextService } from "./context-service.js";

function createBridge(overrides: Partial<{
  isReady: () => boolean;
  getHeartbeatHealth: () => { state: "ok" | "stale" | "missing" | "unknown"; ageMs?: number; lastSeenTs?: number };
  getBridgeStatus: () => { ready: boolean; warnings?: string[] };
  getHeartbeat: <T>() => T | null;
}> = {}) {
  return {
    isReady: () => true,
    getHeartbeatHealth: () => ({ state: "ok" }),
    getBridgeStatus: () => ({ ready: true, warnings: [] }),
    getHeartbeat: <T>() => null as T | null,
    ...overrides,
  } as any;
}

function createCache(overrides: Partial<{
  getSnapshot: () => { version: string; timestamp: number; devices: Record<string, unknown>; links: Record<string, unknown> };
  isMaterialized: () => boolean;
}> = {}) {
  return {
    getSnapshot: () => ({ version: "1", timestamp: 1, devices: {}, links: {} }),
    isMaterialized: () => true,
    ...overrides,
  } as any;
}

describe("ControllerContextService", () => {
  test("resume contexto y salud base", async () => {
    const service = new ControllerContextService(createBridge(), createCache());

    expect(service.getContextSummary()).toEqual({
      bridgeReady: true,
      topologyMaterialized: true,
      deviceCount: 0,
      linkCount: 0,
    });

    await expect(service.getHealthSummary()).resolves.toEqual({
      bridgeReady: true,
      topologyHealth: "warming",
      heartbeatState: "ok",
      warnings: [],
    });
  });

  test("fusiona advertencias del bridge y heartbeat", () => {
    const service = new ControllerContextService(
      createBridge({
        isReady: () => false,
        getHeartbeatHealth: () => ({ state: "stale", ageMs: 5 }),
        getBridgeStatus: () => ({ ready: false, warnings: ["bridge warning"] }),
      }),
      createCache({
        getSnapshot: () => ({ version: "1", timestamp: 1, devices: { R1: {} }, links: {} }),
      }),
    );

    expect(service.getSystemContext()).toEqual({
      bridgeReady: false,
      topologyMaterialized: true,
      deviceCount: 1,
      linkCount: 0,
      heartbeat: { state: "stale", ageMs: 5 },
      warnings: [
        "Heartbeat stale - PT podría no estar respondiendo",
        "Bridge no está listo",
        "bridge warning",
      ],
    });
  });
});
