import { describe, expect, test } from "bun:test";
import { SnapshotService } from "./snapshot-service.js";

function createTopologyService() {
  return {
    snapshot: async () => ({ version: "1", timestamp: 1, devices: {}, links: {} }),
  } as any;
}

function createCache(overrides: Partial<{
  isMaterialized: () => boolean;
  getSnapshot: () => { version: string; timestamp: number; devices: Record<string, unknown>; links: Record<string, unknown> };
}> = {}) {
  return {
    isMaterialized: () => true,
    getSnapshot: () => ({ version: "1", timestamp: 1, devices: {}, links: {} }),
    ...overrides,
  } as any;
}

describe("SnapshotService", () => {
  test("snapshot guarda estado y getTwin lo reutiliza", async () => {
    const service = new SnapshotService(createTopologyService(), createCache());

    const snapshot = await service.snapshot();

    expect(snapshot.version).toBe("1");
    expect(service.getCachedSnapshot()?.version).toBe("1");
    expect(service.getTwin()).toBeTruthy();
  });

  test("getCachedSnapshot cae al snapshot en memoria cuando la caché no está materializada", () => {
    const service = new SnapshotService(createTopologyService(), createCache({ isMaterialized: () => false }));

    expect(service.getCachedSnapshot()).toBeNull();
  });
});
