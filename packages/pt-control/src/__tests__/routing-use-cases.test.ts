import { describe, expect, test } from "bun:test";

import {
  validarIPv4,
  validarCIDR,
  cidrToSubnetMask,
  buildStaticRouteCommands,
  buildOspfEnableCommands,
  buildOspfAddNetworkCommands,
  buildEigrpEnableCommands,
  buildBgpEnableCommands,
  executeStaticRoute,
  executeOspfEnable,
  executeOspfAddNetwork,
  executeEigrpEnable,
  executeBgpEnable,
} from "../application/routing/index.js";

describe("routing IOS builders", () => {
  describe("validarIPv4", () => {
    test("accepts valid IPv4 addresses", () => {
      expect(validarIPv4("192.168.1.1")).toBe(true);
      expect(validarIPv4("10.0.0.1")).toBe(true);
      expect(validarIPv4("255.255.255.255")).toBe(true);
      expect(validarIPv4("0.0.0.0")).toBe(true);
    });

    test("rejects invalid IPv4 addresses", () => {
      expect(validarIPv4("256.1.1.1")).toBe(false);
      expect(validarIPv4("192.168.1")).toBe(false);
      expect(validarIPv4("192.168.1.1.1")).toBe(false);
      expect(validarIPv4("")).toBe(false);
      expect(validarIPv4("abc.def.ghi.jkl")).toBe(false);
    });
  });

  describe("validarCIDR", () => {
    test("accepts valid CIDR notation", () => {
      expect(validarCIDR("192.168.1.0/24")).toBe(true);
      expect(validarCIDR("10.0.0.0/8")).toBe(true);
      expect(validarCIDR("172.16.0.0/16")).toBe(true);
      expect(validarCIDR("192.168.1.1/32")).toBe(true);
    });

    test("rejects invalid CIDR notation", () => {
      expect(validarCIDR("192.168.1.0/33")).toBe(false);
      expect(validarCIDR("256.1.1.1/24")).toBe(false);
      expect(validarCIDR("192.168.1.0")).toBe(false);
      expect(validarCIDR("192.168.1.0/24/25")).toBe(false);
    });
  });

  describe("cidrToSubnetMask", () => {
    test("converts CIDR to subnet mask", () => {
      expect(cidrToSubnetMask("192.168.1.0/24")).toBe("255.255.255.0");
      expect(cidrToSubnetMask("10.0.0.0/8")).toBe("255.0.0.0");
      expect(cidrToSubnetMask("172.16.0.0/16")).toBe("255.255.0.0");
      expect(cidrToSubnetMask("192.168.1.0/32")).toBe("255.255.255.255");
      expect(cidrToSubnetMask("0.0.0.0/0")).toBe("0.0.0.0");
    });

    test("returns default for invalid CIDR", () => {
      expect(cidrToSubnetMask("invalid")).toBe("255.255.255.0");
      expect(cidrToSubnetMask("192.168.1.0/99")).toBe("255.255.255.0");
    });
  });

  describe("buildStaticRouteCommands", () => {
    test("generates static route commands", () => {
      const commands = buildStaticRouteCommands("R1", "192.168.10.0/24", "10.0.0.1");
      expect(commands).toContain("! Rutas estáticas");
      expect(commands).toContain("ip route 192.168.10.0 255.255.255.0 10.0.0.1");
    });


    test("extracts network from CIDR", () => {
      const commands = buildStaticRouteCommands("R1", "192.168.10.0/24", "10.0.0.1");
      expect(commands).toContain("ip route 192.168.10.0 255.255.255.0 10.0.0.1");
    });
  });

  describe("buildOspfEnableCommands", () => {
    test("generates OSPF enable commands", () => {
      const commands = buildOspfEnableCommands("R1", 1);
      expect(commands).toEqual(["router ospf 1", " exit"]);
    });

    test("generates OSPF enable commands with custom process ID", () => {
      const commands = buildOspfEnableCommands("R1", 100);
      expect(commands).toEqual(["router ospf 100", " exit"]);
    });
  });

  describe("buildOspfAddNetworkCommands", () => {
    test("generates OSPF add network commands with CIDR", () => {
      const commands = buildOspfAddNetworkCommands("R1", 1, "192.168.1.0/24", 0);
      expect(commands.join("")).toContain("router ospf 1");
      expect(commands.join("")).toContain("network 192.168.1.0 0.0.0.255 area 0");
    });

    test("generates OSPF add network commands with network and wildcard", () => {
      const commands = buildOspfAddNetworkCommands("R1", 1, "192.168.1.0/24", "0");
      expect(commands.join("")).toContain("network 192.168.1.0 0.0.0.255 area 0");
    });
  });

  describe("buildEigrpEnableCommands", () => {
    test("generates EIGRP enable commands", () => {
      const commands = buildEigrpEnableCommands("R1", 100);
      expect(commands).toEqual(["router eigrp 100", " no auto-summary", " exit"]);
    });
  });

  describe("buildBgpEnableCommands", () => {
    test("generates BGP enable commands", () => {
      const commands = buildBgpEnableCommands("R1", 65001);
      expect(commands).toEqual(["router bgp 65001", " bgp log-neighbor-changes", " exit"]);
    });
  });
});

describe("routing use cases", () => {
  describe("executeStaticRoute", () => {
    test("returns success with valid input", () => {
      const result = executeStaticRoute({
        deviceName: "R1",
        network: "192.168.10.0/24",
        nextHop: "10.0.0.1",
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.device).toBe("R1");
        expect(result.data.network).toBe("192.168.10.0/24");
        expect(result.data.nextHop).toBe("10.0.0.1");
        expect(result.data.commands.length).toBeGreaterThan(0);
        expect(result.advice).toContain("Usa pt show ip-route R1 para verificar");
      }
    });

    test("returns error with invalid CIDR", () => {
      const result = executeStaticRoute({
        deviceName: "R1",
        network: "invalid",
        nextHop: "10.0.0.1",
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain("CIDR válido");
      }
    });

    test("returns error with invalid next-hop", () => {
      const result = executeStaticRoute({
        deviceName: "R1",
        network: "192.168.10.0/24",
        nextHop: "invalid",
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain("IPv4 válida o null0");
      }
    });

  });

  describe("executeOspfEnable", () => {
    test("returns success with valid input", () => {
      const result = executeOspfEnable({
        deviceName: "R1",
        processId: 1,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.device).toBe("R1");
        expect(result.data.processId).toBe(1);
        expect(result.data.commands).toEqual(["router ospf 1", " exit"]);
      }
    });
  });

  describe("executeOspfAddNetwork", () => {
    test("returns success with valid CIDR network", () => {
      const result = executeOspfAddNetwork({
        deviceName: "R1",
        network: "192.168.1.0/24",
        area: 0,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.device).toBe("R1");
        expect(result.data.network).toBe("192.168.1.0/24");
        expect(result.data.area).toBe("0");
      }
    });

    test("returns error with invalid CIDR", () => {
      const result = executeOspfAddNetwork({
        deviceName: "R1",
        network: "invalid",
        area: 0,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain("CIDR válido");
      }
    });
  });

  describe("executeEigrpEnable", () => {
    test("returns success with valid input", () => {
      const result = executeEigrpEnable({
        deviceName: "R1",
        asn: 100,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.device).toBe("R1");
        expect(result.data.asn).toBe(100);
        expect(result.data.commands).toEqual(["router eigrp 100", " no auto-summary", " exit"]);
      }
    });
  });

  describe("executeBgpEnable", () => {
    test("returns success with valid input", () => {
      const result = executeBgpEnable({
        deviceName: "R1",
        asn: 65001,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.device).toBe("R1");
        expect(result.data.asn).toBe(65001);
        expect(result.data.commands).toEqual(["router bgp 65001", " bgp log-neighbor-changes", " exit"]);
      }
    });
  });
});
