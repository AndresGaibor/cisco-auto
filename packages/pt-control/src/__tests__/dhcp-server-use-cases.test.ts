import { describe, expect, test } from "bun:test";

import {
  parsePool,
  parsePools,
  applyDhcpServerConfig,
  inspectDhcpServer,
  type DhcpServerPort,
  type DhcpServerInspectRaw,
} from "../application/dhcp-server/index.js";

class FakeDhcpServerController implements DhcpServerPort {
  readonly configureCalls: Array<{
    device: string;
    options: any;
  }> = [];

  readonly inspectCalls: Array<{ device: string; port?: string }> = [];

  configureDhcpServerResult = Promise.resolve();
  inspectDhcpServerResult: DhcpServerInspectRaw = {
    ok: true,
    device: "R1",
    enabled: true,
    pools: [],
    excludedAddresses: [],
  };

  async configureDhcpServer(device: string, options: any) {
    this.configureCalls.push({ device, options });
    return this.configureDhcpServerResult;
  }

  async inspectDhcpServer(device: string, port?: string) {
    this.inspectCalls.push({ device, port });
    return this.inspectDhcpServerResult;
  }
}

describe("dhcp-server use cases", () => {
  describe("parsePool", () => {
    test("parses valid pool string correctly", () => {
      const result = parsePool("LAN,192.168.1.0,255.255.255.0,192.168.1.1");

      expect(result).toEqual({
        name: "LAN",
        network: "192.168.1.0",
        mask: "255.255.255.0",
        router: "192.168.1.1",
      });
    });

    test("trims whitespace from pool components", () => {
      const result = parsePool(
        "  LAN  ,  192.168.1.0  ,  255.255.255.0  ,  192.168.1.1  ",
      );

      expect(result.name).toBe("LAN");
      expect(result.network).toBe("192.168.1.0");
      expect(result.mask).toBe("255.255.255.0");
      expect(result.router).toBe("192.168.1.1");
    });

    test("throws error for invalid format (not enough parts)", () => {
      expect(() => parsePool("LAN,192.168.1.0,255.255.255.0")).toThrow(
        "Pool inválido",
      );
    });

    test("throws error for too many parts", () => {
      expect(() => parsePool("LAN,192.168.1.0,255.255.255.0,192.168.1.1,extra")).toThrow(
        "Pool inválido",
      );
    });
  });

  describe("parsePools", () => {
    test("parses multiple pool strings correctly", () => {
      const pools = parsePools([
        "LAN,192.168.1.0,255.255.255.0,192.168.1.1",
        "WIFI,192.168.2.0,255.255.255.0,192.168.2.1",
      ]);

      expect(pools).toHaveLength(2);
      expect(pools[0]!.name).toBe("LAN");
      expect(pools[1]!.name).toBe("WIFI");
    });

    test("handles empty array", () => {
      const pools = parsePools([]);
      expect(pools).toHaveLength(0);
    });
  });

  describe("applyDhcpServerConfig", () => {
    test("applies DHCP configuration with correct structure", async () => {
      const controller = new FakeDhcpServerController();

      const result = await applyDhcpServerConfig(
        controller,
        "R1",
        true,
        "FastEthernet0",
        [{ name: "LAN", network: "192.168.1.0", mask: "255.255.255.0", router: "192.168.1.1" }],
        ["192.168.1.1-192.168.1.10"],
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.device).toBe("R1");
        expect(result.data.enabled).toBe(true);
        expect(result.data.port).toBe("FastEthernet0");
        expect(result.data.pools).toHaveLength(1);
        expect(result.data.excludedRanges).toEqual(["192.168.1.1-192.168.1.10"]);
      }

      expect(controller.configureCalls).toHaveLength(1);
      expect(controller.configureCalls[0]!.device).toBe("R1");
      expect(controller.configureCalls[0]!.options.enabled).toBe(true);
      expect(controller.configureCalls[0]!.options.pools).toHaveLength(1);
    });

    test("returns error when controller throws", async () => {
      const controller = new FakeDhcpServerController();
      controller.configureDhcpServerResult = Promise.reject(
        new Error("Device not found"),
      );

      const result = await applyDhcpServerConfig(
        controller,
        "R1",
        true,
        "FastEthernet0",
        [],
        [],
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toBe("Device not found");
      }
    });

    test("maps excluded ranges correctly", async () => {
      const controller = new FakeDhcpServerController();

      await applyDhcpServerConfig(
        controller,
        "R1",
        true,
        "FastEthernet0",
        [],
        ["192.168.1.1-192.168.1.10", "192.168.1.100-192.168.1.150"],
      );

      expect(controller.configureCalls[0]!.options.excluded).toEqual([
        { start: "192.168.1.1", end: "192.168.1.10" },
        { start: "192.168.1.100", end: "192.168.1.150" },
      ]);
    });
  });

  describe("inspectDhcpServer", () => {
    test("returns structured inspection data", async () => {
      const controller = new FakeDhcpServerController();
      controller.inspectDhcpServerResult = {
        ok: true,
        device: "R1",
        enabled: true,
        pools: [
          {
            name: "LAN",
            network: "192.168.1.0",
            mask: "255.255.255.0",
            defaultRouter: "192.168.1.1",
            leaseCount: 5,
            leases: [],
          },
        ],
        excludedAddresses: [{ start: "192.168.1.1", end: "192.168.1.10" }],
      };

      const result = await inspectDhcpServer(controller, "R1", "FastEthernet0");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.device).toBe("R1");
        expect(result.data.port).toBe("FastEthernet0");
        expect(result.data.enabled).toBe(true);
        expect(result.data.pools).toHaveLength(1);
        expect(result.data.pools[0]!.name).toBe("LAN");
        expect(result.data.pools[0]!.router).toBe("192.168.1.1");
        expect(result.data.excludedRanges).toEqual(["192.168.1.1-192.168.1.10"]);
      }
    });

    test("returns error when inspection fails", async () => {
      const controller = new FakeDhcpServerController();
      controller.inspectDhcpServerResult = {
        ok: false,
        device: "R1",
        enabled: false,
        pools: [],
        excludedAddresses: [],
      };

      const result = await inspectDhcpServer(controller, "R1", "FastEthernet0");

      expect(result.ok).toBe(false);
    });

    test("handles missing optional fields gracefully", async () => {
      const controller = new FakeDhcpServerController();
      controller.inspectDhcpServerResult = {
        ok: true,
        device: "R1",
        enabled: true,
        pools: [
          {
            name: "LAN",
            network: "192.168.1.0",
            mask: "",
            defaultRouter: "",
            leaseCount: 0,
            leases: [],
          },
        ],
        excludedAddresses: [],
      };

      const result = await inspectDhcpServer(controller, "R1", "FastEthernet0");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.pools[0]!.mask).toBe("");
        expect(result.data.pools[0]!.router).toBe("");
      }
    });
  });
});
