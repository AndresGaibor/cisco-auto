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
          performance: {
            averageClaimMs: 2,
            averageReaddirMs: 1,
            averageJsonParseMs: 1,
            averageQueueAppendMs: 1,
            readdirCacheHitRate: 0.9,
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
          performance: {
            averageClaimMs: 14,
            averageReaddirMs: 10,
            averageJsonParseMs: 5,
            averageQueueAppendMs: 8,
            readdirCacheHitRate: 0.1,
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

  test("adjunta un resumen de rendimiento al estado del bridge", () => {
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
      getPerformanceSnapshot: () => ({
        averageClaimMs: 11,
        averageReaddirMs: 4,
        averageJsonParseMs: 3,
        averageQueueAppendMs: 2,
        readdirCacheHitRate: 0.7,
      }),
      isReady: () => true,
    });

    const status = service.getBridgeStatus();

    expect(status.performance).toMatchObject({
      averageClaimMs: 11,
      averageReaddirMs: 4,
      averageJsonParseMs: 3,
      averageQueueAppendMs: 2,
      readdirCacheHitRate: 0.7,
    });
  });
});
