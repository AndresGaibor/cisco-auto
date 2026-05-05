import { describe, expect, test } from "bun:test";
import { BridgeStatusService } from "./bridge-status-service.js";

describe("BridgeStatusService", () => {
  test("reporta estado nominal sin warnings de cola", () => {
    const service = new BridgeStatusService({
      lifecycle: { state: "running" } as any,
      leaseManager: {
        hasValidLease: () => true,
        isLeaseValid: () => true,
      } as any,
      backpressure: {
        getDetailedStats: () => ({
          queuedCount: 0,
          inFlightCount: 0,
        }),
      } as any,
      diagnostics: {
        collectHealth: () => ({
          queues: {
            queueIndexDrift: false,
            queueIndexMissingEntries: 0,
            queueIndexExtraEntries: 0,
          },
        }),
      } as any,
      isReady: () => true,
    });

    expect(service.getBridgeStatus()).toMatchObject({
      ready: true,
      state: "running",
      leaseValid: true,
      queuedCount: 0,
      inFlightCount: 0,
      queueIndexDrift: false,
      warnings: [],
    });
  });

  test("agrega warning cuando hay queue index drift", () => {
    const service = new BridgeStatusService({
      lifecycle: { state: "running" } as any,
      leaseManager: {
        hasValidLease: () => true,
        isLeaseValid: () => true,
      } as any,
      backpressure: {
        getDetailedStats: () => ({
          queuedCount: 1,
          inFlightCount: 2,
        }),
      } as any,
      diagnostics: {
        collectHealth: () => ({
          queues: {
            queueIndexDrift: true,
            queueIndexMissingEntries: 1,
            queueIndexExtraEntries: 2,
          },
        }),
      } as any,
      isReady: () => true,
    });

    const status = service.getBridgeStatus();

    expect(status.queueIndexDrift).toBe(true);
    expect(status.warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Queue index drift detected"),
      ]),
    );
  });
});