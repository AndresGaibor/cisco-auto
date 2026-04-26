import { describe, expect, test } from "bun:test";
import {
  LabOperationTypeSchema,
  LabOperationStatusSchema,
  type LabOperation,
  type LabPlan,
  type LabDiff,
  type LabDiffItem,
} from "./index";

describe("network-intent scenarios", () => {
  describe("LabOperationTypeSchema", () => {
    test("accepts valid operation types", () => {
      expect(LabOperationTypeSchema.parse("create-device")).toBe("create-device");
      expect(LabOperationTypeSchema.parse("configure-vlan")).toBe("configure-vlan");
      expect(LabOperationTypeSchema.parse("configure-dhcp-pool")).toBe("configure-dhcp-pool");
    });

    test("rejects invalid operation types", () => {
      expect(() => LabOperationTypeSchema.parse("invalid-type")).toThrow();
    });
  });

  describe("LabOperationStatusSchema", () => {
    test("accepts valid status values", () => {
      expect(LabOperationStatusSchema.parse("pending")).toBe("pending");
      expect(LabOperationStatusSchema.parse("in-progress")).toBe("in-progress");
      expect(LabOperationStatusSchema.parse("completed")).toBe("completed");
      expect(LabOperationStatusSchema.parse("failed")).toBe("failed");
      expect(LabOperationStatusSchema.parse("skipped")).toBe("skipped");
    });

    test("rejects invalid status values", () => {
      expect(() => LabOperationStatusSchema.parse("unknown")).toThrow();
    });
  });

  describe("LabPlan structure", () => {
    test("creates valid lab plan", () => {
      const plan: LabPlan = {
        labId: "lab-1",
        planId: "plan-1",
        createdAt: Date.now(),
        operations: [],
        summary: {
          total: 0,
          byType: {},
          byStatus: {},
        },
        metadata: {
          desiredVersion: "1.0",
          mode: "incremental",
        },
      };

      expect(plan.labId).toBe("lab-1");
      expect(plan.metadata.mode).toBe("incremental");
    });

    test("supports rebuild mode", () => {
      const plan: LabPlan = {
        labId: "lab-1",
        planId: "plan-1",
        createdAt: Date.now(),
        operations: [],
        summary: {
          total: 0,
          byType: {},
          byStatus: {},
        },
        metadata: {
          desiredVersion: "1.0",
          mode: "rebuild",
        },
      };

      expect(plan.metadata.mode).toBe("rebuild");
    });
  });

  describe("LabDiff structure", () => {
    test("creates valid lab diff", () => {
      const diff: LabDiff = {
        labId: "lab-1",
        generatedAt: Date.now(),
        items: [
          {
            resourceType: "device",
            resourceId: "Router1",
            status: "missing",
            confidence: 1.0,
          },
        ],
        summary: {
          missing: 1,
          extra: 0,
          drift: 0,
          ok: 0,
          unsupported: 0,
          unreliable: 0,
        },
      };

      expect(diff.items).toHaveLength(1);
      expect(diff.summary.missing).toBe(1);
    });

    test("handles various diff statuses", () => {
      const diff: LabDiff = {
        labId: "lab-1",
        generatedAt: Date.now(),
        items: [
          { resourceType: "device", resourceId: "R1", status: "missing", confidence: 1.0 },
          { resourceType: "device", resourceId: "R2", status: "extra", confidence: 1.0 },
          { resourceType: "vlan", resourceId: "VLAN10", status: "drift", confidence: 0.8, diff: {} },
          { resourceType: "link", resourceId: "link1", status: "ok", confidence: 1.0 },
        ] as LabDiffItem[],
        summary: {
          missing: 1,
          extra: 1,
          drift: 1,
          ok: 1,
          unsupported: 0,
          unreliable: 0,
        },
      };

      expect(diff.items).toHaveLength(4);
      expect(diff.summary.missing).toBe(1);
      expect(diff.summary.extra).toBe(1);
    });
  });

  describe("LabOperation", () => {
    test("creates valid operation with dependencies", () => {
      const operation: LabOperation = {
        id: "op-1",
        type: "create-link",
        resourceType: "link",
        resourceId: "link-1",
        description: "Create link between R1 and S1",
        device: "R1",
        params: {
          fromDevice: "R1",
          toDevice: "S1",
        },
        dependsOn: ["op-device-r1", "op-device-s1"],
        status: "pending",
      };

      expect(operation.dependsOn).toHaveLength(2);
      expect(operation.params.fromDevice).toBe("R1");
    });

    test("handles completed operation with timing", () => {
      const now = Date.now();
      const operation: LabOperation = {
        id: "op-1",
        type: "configure-vlan",
        resourceType: "vlan",
        resourceId: "vlan-10",
        description: "Configure VLAN 10",
        params: {},
        status: "completed",
        executedAt: now - 1000,
        completedAt: now,
      };

      expect(operation.status).toBe("completed");
      expect(operation.executedAt).toBeLessThan(operation.completedAt!);
    });

    test("handles failed operation with error", () => {
      const operation: LabOperation = {
        id: "op-1",
        type: "configure-dhcp-pool",
        resourceType: "dhcp-pool",
        resourceId: "dhcp-pool-1",
        description: "Configure DHCP pool",
        params: {},
        status: "failed",
        error: "Device not found",
        retries: 3,
      };

      expect(operation.status).toBe("failed");
      expect(operation.error).toBe("Device not found");
      expect(operation.retries).toBe(3);
    });
  });
});
