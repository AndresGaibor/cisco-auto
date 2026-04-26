import { describe, expect, test } from "bun:test";

import {
  getNetworkAddress,
  subnetMaskToBits,
  validateLanBasic,
  validateGateway,
} from "./check-use-cases.js";
import type { CheckControllerPort, CheckResultItem } from "./check-types.js";

/**
 * Fake controller implementing CheckControllerPort
 */
class FakeCheckController implements CheckControllerPort {
  constructor(
    private readonly devices: Array<{ name: string; type: string | number; model?: string }> = [
      { name: "PC1", type: "pc", model: "PC-PT" },
      { name: "PC2", type: "pc", model: "PC-PT" },
      { name: "Switch1", type: "switch", model: "2960-24TT" },
    ],
    private readonly deviceStates: Record<string, unknown> = {
      PC1: {
        name: "PC1",
        type: "pc",
        model: "PC-PT",
        ip: "192.168.10.10",
        mask: "255.255.255.0",
        ports: [
          {
            name: "FastEthernet0",
            ipAddress: "192.168.10.10",
            subnetMask: "255.255.255.0",
            macAddress: "00AA.BBBB.CCCC",
          },
        ],
      },
      PC2: {
        name: "PC2",
        type: "pc",
        model: "PC-PT",
        ip: "192.168.10.20",
        mask: "255.255.255.0",
        ports: [
          {
            name: "FastEthernet0",
            ipAddress: "192.168.10.20",
            subnetMask: "255.255.255.0",
            macAddress: "00DD.EEEE.FFFF",
          },
        ],
      },
      Switch1: {
        name: "Switch1",
        type: "switch",
        model: "2960-24TT",
        ports: [
          { name: "Fa0/1", macAddress: "00AA.BBBB.CCCC" },
          { name: "Fa0/2", macAddress: "00DD.EEEE.FFFF" },
        ],
      },
    },
    private readonly pingResults: Record<string, boolean> = {},
  ) {}

  async listDevices() {
    return { devices: this.devices };
  }

  async inspectDevice(name: string) {
    return this.deviceStates[name] ?? { name };
  }

  async sendPing(_source: string, _target: string, _timeoutMs?: number) {
    return { success: true, raw: "Success" };
  }
}

describe("check use cases", () => {
  describe("getNetworkAddress", () => {
    test("computes correct network address for /24", () => {
      expect(getNetworkAddress("192.168.10.10", "255.255.255.0")).toBe("192.168.10.0");
    });

    test("computes correct network address for /16", () => {
      expect(getNetworkAddress("172.16.50.100", "255.255.0.0")).toBe("172.16.0.0");
    });

    test("computes correct network address for /8", () => {
      expect(getNetworkAddress("10.200.100.50", "255.0.0.0")).toBe("10.0.0.0");
    });

    test("handles different subnet masks", () => {
      expect(getNetworkAddress("10.0.0.25", "255.255.255.252")).toBe("10.0.0.24");
    });
  });

  describe("subnetMaskToBits", () => {
    test("converts /24 mask to 24 bits", () => {
      expect(subnetMaskToBits("255.255.255.0")).toBe(24);
    });

    test("converts /16 mask to 16 bits", () => {
      expect(subnetMaskToBits("255.255.0.0")).toBe(16);
    });

    test("converts /8 mask to 8 bits", () => {
      expect(subnetMaskToBits("255.0.0.0")).toBe(8);
    });

    test("converts /28 mask to 28 bits", () => {
      expect(subnetMaskToBits("255.255.255.240")).toBe(28);
    });

    test("handles /30 mask", () => {
      expect(subnetMaskToBits("255.255.255.252")).toBe(30);
    });

    test("returns 0 for empty mask", () => {
      expect(subnetMaskToBits("")).toBe(0);
      expect(subnetMaskToBits(undefined)).toBe(0);
    });
  });

  describe("validateLanBasic", () => {
    test("returns pass for min-pcs when 2 PCs available", async () => {
      const controller = new FakeCheckController();
      const checks = await validateLanBasic(controller, "lan-basic", false);
      const minPcs = checks.find((c) => c.name === "min-pcs");
      expect(minPcs?.status).toBe("pass");
    });

    test("returns fail for min-pcs when fewer than 2 PCs", async () => {
      const controller = new FakeCheckController([
        { name: "PC1", type: "pc" },
        { name: "Switch1", type: "switch" },
      ]);
      const checks = await validateLanBasic(controller, "lan-basic", false);
      const minPcs = checks.find((c) => c.name === "min-pcs");
      expect(minPcs?.status).toBe("fail");
    });

    test("returns pass for min-switches when 1+ switches available", async () => {
      const controller = new FakeCheckController();
      const checks = await validateLanBasic(controller, "lan-basic", false);
      const minSwitches = checks.find((c) => c.name === "min-switches");
      expect(minSwitches?.status).toBe("pass");
    });

    test("checks PC IP addresses are configured", async () => {
      const controller = new FakeCheckController();
      const checks = await validateLanBasic(controller, "lan-basic", false);
      const pc1Ip = checks.find((c) => c.name === "pc1-ip");
      const pc2Ip = checks.find((c) => c.name === "pc2-ip");
      expect(pc1Ip?.status).toBe("pass");
      expect(pc2Ip?.status).toBe("pass");
    });

    test("detects same subnet for PCs in same network", async () => {
      const controller = new FakeCheckController();
      const checks = await validateLanBasic(controller, "lan-basic", false);
      const sameSubnet = checks.find((c) => c.name === "same-subnet");
      expect(sameSubnet?.status).toBe("pass");
    });

    test("returns CheckResult with pass/fail items", async () => {
      const controller = new FakeCheckController();
      const checks = await validateLanBasic(controller, "lan-basic", false);

      expect(checks.length).toBeGreaterThan(0);
      expect(checks.every((c) => ["pass", "fail", "warning", "skip"].includes(c.status))).toBe(true);
      expect(checks.every((c) => typeof c.name === "string" && typeof c.message === "string")).toBe(
        true,
      );
    });
  });

  describe("validateGateway", () => {
    test("returns skip for host without IP", async () => {
      const controller = new FakeCheckController(
        [{ name: "PC1", type: "pc" }],
        {},  // empty deviceStates - no IP
      );
      const checks = await validateGateway(controller, "gateway", false);
      const pc1Check = checks.find((c) => c.name === "gateway-PC1");
      expect(pc1Check?.status).toBe("skip");
    });

    test("returns pass for host with IP", async () => {
      const controller = new FakeCheckController();
      const checks = await validateGateway(controller, "gateway", false);
      const pc1Check = checks.find((c) => c.name === "gateway-PC1");
      expect(pc1Check?.status).toBe("pass");
    });

    test("returns CheckResult with items per host", async () => {
      const controller = new FakeCheckController();
      const checks = await validateGateway(controller, "gateway", false);

      expect(checks.length).toBeGreaterThan(0);
      expect(checks.every((c) => c.name.startsWith("gateway-"))).toBe(true);
    });
  });
});