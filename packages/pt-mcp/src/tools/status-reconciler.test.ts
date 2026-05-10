import { describe, expect, test } from "bun:test";
import { buildReconciledStatusFromParts } from "./status-reconciler.js";

describe("status reconciler", () => {
  test("marca topology usable cuando project status e inventario tienen datos", () => {
    const result = buildReconciledStatusFromParts({
      health: {
        bridgeReady: true,
        topologyHealth: "warming",
        heartbeatState: "ok",
        warnings: ["Topology not materialized"],
      },
      heartbeat: { state: "ok" },
      bridge: { ready: true, leaseValid: false },
      context: {
        topologyMaterialized: false,
        deviceCount: 0,
        linkCount: 0,
      },
      projectStatus: {
        ok: true,
        activeFile: "/tmp/lab.pkt",
        deviceCount: 47,
        linkCount: 61,
      },
      deviceInventory: {
        count: 45,
        devices: new Array(45).fill(null),
      },
      queue: {
        pending: [],
        running: [],
        done: [],
        done_with_errors: [],
        failed: [],
      },
    });

    expect(result.health.topologyHealth).toBe("usable");
    expect(result.context.topologyMaterialized).toBe(true);
    expect(result.context.deviceCount).toBe(45);
    expect(result.context.linkCount).toBe(61);
    expect(result.context.projectDeviceCount).toBe(47);
    expect(result.context.projectLinkCount).toBe(61);
    expect(result.reconciled.topologyUsable).toBe(true);
    expect(result.reconciled.commandReady).toBe(true);
    expect(result.warnings).toContainEqual(
      expect.objectContaining({
        code: "TOPOLOGY_CACHE_NOT_MATERIALIZED",
        severity: "info",
        actionable: false,
      }),
    );
    expect(result.warnings).toContainEqual(
      expect.objectContaining({
        code: "LEASE_NOT_HELD",
        severity: "info",
        actionable: false,
      }),
    );
    expect(result.nextActions.join(" ")).toContain("pt_cmd_run");
  });

  test("mantiene warning accionable cuando no hay proyecto ni inventario", () => {
    const result = buildReconciledStatusFromParts({
      health: {
        bridgeReady: true,
        topologyHealth: "warming",
        heartbeatState: "ok",
        warnings: ["Topology not materialized"],
      },
      heartbeat: { state: "ok" },
      bridge: { ready: true, leaseValid: false },
      context: {
        topologyMaterialized: false,
        deviceCount: 0,
        linkCount: 0,
      },
      projectStatus: { ok: false },
      deviceInventory: { count: 0, devices: [] },
      queue: null,
    });

    expect(result.health.topologyHealth).toBe("warming");
    expect(result.context.topologyMaterialized).toBe(false);
    expect(result.reconciled.topologyUsable).toBe(false);
    expect(result.warnings).toContainEqual(
      expect.objectContaining({
        code: "TOPOLOGY_NOT_READY",
        severity: "warning",
        actionable: true,
      }),
    );
    expect(result.nextActions.join(" ")).toContain("pt_app");
  });
});
