import { describe, expect, test } from "bun:test";
import { ControllerContextService } from "./context-service";

function createBridge(overrides: Partial<any> = {}) {
  return {
    isReady: () => false,
    getBridgeStatus: () => ({ ready: false, warnings: [] }),
    getHeartbeatHealth: () => ({ state: "ok" as const, ageMs: 1000, lastSeenTs: Date.now() }),
    getStateSnapshot: () => null,
    readState: () => null,
    ...overrides,
  };
}

function createTopologyCache(overrides: Partial<any> = {}) {
  return {
    isMaterialized: () => false,
    getSnapshot: () => null,
    ...overrides,
  };
}

describe("ControllerContextService operational readiness", () => {
  test("considera bridgeReady=true cuando heartbeat está ok aunque isReady sea false", () => {
    const service = new ControllerContextService(
      createBridge({
        isReady: () => false,
        getBridgeStatus: () => ({ ready: false, warnings: [] }),
        getHeartbeatHealth: () => ({ state: "ok" as const, ageMs: 500 }),
      }),
      createTopologyCache(),
    );

    expect(service.getContextSummary().bridgeReady).toBe(true);
    expect(service.getBridgeStatus().ready).toBe(true);
  });

  test("considera topología materializada si hay devices en state snapshot", () => {
    const service = new ControllerContextService(
      createBridge({
        getStateSnapshot: () => ({
          devices: [{ name: "SW-SRV-DIST" }, { name: "R-GYE-2811" }],
          links: [{ id: "l1" }],
        }),
      }),
      createTopologyCache({
        isMaterialized: () => false,
      }),
    );

    expect(service.getContextSummary()).toMatchObject({
      bridgeReady: true,
      topologyMaterialized: true,
      deviceCount: 2,
      linkCount: 1,
    });
  });

  test("mantiene warning si no hay heartbeat ok ni devices", () => {
    const service = new ControllerContextService(
      createBridge({
        isReady: () => false,
        getBridgeStatus: () => ({ ready: false, warnings: [] }),
        getHeartbeatHealth: () => ({ state: "missing" as const }),
      }),
      createTopologyCache({
        isMaterialized: () => false,
      }),
    );

    expect(service.getContextSummary()).toMatchObject({
      bridgeReady: false,
      topologyMaterialized: false,
      deviceCount: 0,
      linkCount: 0,
    });
  });

  test("expone getHeartbeat por compatibilidad con PtController", () => {
    const service = new ControllerContextService(
      createBridge({
        getHeartbeatHealth: () => ({
          state: "ok" as const,
          ageMs: 123,
          lastSeenTs: 1777532378000,
        }),
      }),
      createTopologyCache(),
    );

    expect(service.getHeartbeat()).toMatchObject({
      state: "ok",
      running: true,
      ageMs: 123,
      lastSeenTs: 1777532378000,
      ts: 1777532378000,
    });
  });
});
