import { describe, it, expect } from "bun:test";
import { VlanDhcpResolver } from "../src/intent/vlan-dhcp-resolver.js";
import { DHCPBuilder } from "../src/intent/dhcp-builder.js";

describe("VlanDhcpResolver", () => {
  const resolver = new VlanDhcpResolver();

  describe("derivePoolConfig", () => {
    it("derives pool config from SVI IP /24", () => {
      const result = resolver.derivePoolConfig(10, "192.168.10.1", 24);

      expect(result.poolName).toBe("VLAN10_POOL");
      expect(result.network).toBe("192.168.10.0");
      expect(result.mask).toBe("255.255.255.0");
      expect(result.defaultRouter).toBe("192.168.10.1");
    });

    it("derives pool config from SVI IP /16", () => {
      const result = resolver.derivePoolConfig(100, "10.0.0.1", 16);

      expect(result.poolName).toBe("VLAN100_POOL");
      expect(result.network).toBe("10.0.0.0");
      expect(result.mask).toBe("255.255.0.0");
      expect(result.defaultRouter).toBe("10.0.0.1");
    });

    it("uses custom pool name when provided", () => {
      const result = resolver.derivePoolConfig(10, "192.168.10.1", 24, {
        poolName: "CUSTOM_POOL",
      });

      expect(result.poolName).toBe("CUSTOM_POOL");
    });

    it("includes dnsServer when provided", () => {
      const result = resolver.derivePoolConfig(10, "192.168.10.1", 24, {
        dnsServer: "8.8.8.8",
      });

      expect(result.dnsServer).toBe("8.8.8.8");
    });

    it("calculates network correctly for /28", () => {
      // 192.168.10.16/28 -> network should be 192.168.10.16 (already aligned)
      const result = resolver.derivePoolConfig(20, "192.168.10.17", 28);

      expect(result.network).toBe("192.168.10.16");
      expect(result.mask).toBe("255.255.255.240");
      expect(result.defaultRouter).toBe("192.168.10.17");
    });

    it("calculates network for non-aligned IP /26", () => {
      // 192.168.1.50/26 -> network should be 192.168.1.0
      const result = resolver.derivePoolConfig(5, "192.168.1.50", 26);

      expect(result.network).toBe("192.168.1.0");
      expect(result.mask).toBe("255.255.255.192");
    });
  });
});

describe("DHCPBuilder", () => {
  const builder = new DHCPBuilder();

  describe("buildDHCPPoolFromVlan", () => {
    it("builds correct IOS commands for VLAN DHCP pool", () => {
      const commands = builder.buildDHCPPoolFromVlan(10, "192.168.10.1", 24);

      expect(commands).toContain("ip dhcp pool VLAN10_POOL");
      expect(commands).toContain("network 192.168.10.0 255.255.255.0");
      expect(commands).toContain("default-router 192.168.10.1");
    });

    it("uses custom pool name when provided", () => {
      const commands = builder.buildDHCPPoolFromVlan(10, "192.168.10.1", 24, {
        poolName: "SERVERS_POOL",
      });

      expect(commands).toContain("ip dhcp pool SERVERS_POOL");
    });

    it("includes dns-server when provided", () => {
      const commands = builder.buildDHCPPoolFromVlan(10, "192.168.10.1", 24, {
        dnsServer: "8.8.8.8",
      });

      expect(commands).toContain("dns-server 8.8.8.8");
    });

    it("includes excluded addresses", () => {
      const commands = builder.buildDHCPPoolFromVlan(10, "192.168.10.1", 24, {
        excluded: ["192.168.10.1 192.168.10.10"],
      });

      expect(commands).toContain("ip dhcp excluded-address 192.168.10.1 192.168.10.10");
    });

    it("includes lease time when provided", () => {
      // 1 day = 86400 seconds
      const commands = builder.buildDHCPPoolFromVlan(10, "192.168.10.1", 24, {
        leaseTime: 86400,
      });

      expect(commands).toContain("lease 1 0 0");
    });
  });

  describe("buildDHCPPool", () => {
    it("builds basic pool commands", () => {
      const commands = builder.buildDHCPPool({
        name: "TEST_POOL",
        network: "10.0.0.0",
        mask: "255.255.255.0",
        gateway: "10.0.0.1",
      });

      expect(commands).toContain("ip dhcp pool TEST_POOL");
      expect(commands).toContain("network 10.0.0.0 255.255.255.0");
      expect(commands).toContain("default-router 10.0.0.1");
      expect(commands).toContain("exit");
    });

    it("builds pool with multiple DNS servers", () => {
      const commands = builder.buildDHCPPool({
        name: "TEST_POOL",
        network: "10.0.0.0",
        mask: "255.255.255.0",
        dnsServers: ["8.8.8.8", "8.8.4.4"],
      });

      expect(commands).toContain("dns-server 8.8.8.8 8.8.4.4");
    });

    it("builds pool with excluded addresses", () => {
      const commands = builder.buildDHCPPool({
        name: "TEST_POOL",
        network: "10.0.0.0",
        mask: "255.255.255.0",
        excluded: ["10.0.0.1 10.0.0.10"],
      });

      // Check excluded addresses appear
      const hasExcluded = commands.some(c => c.includes("ip dhcp excluded-address 10.0.0.1 10.0.0.10"));
      expect(hasExcluded).toBe(true);
      // Check order: excluded before pool
      const excludedIdx = commands.findIndex(c => c.includes("ip dhcp excluded-address"));
      const poolIdx = commands.findIndex(c => c.includes("ip dhcp pool"));
      expect(excludedIdx).toBeLessThan(poolIdx);
    });
  });
});