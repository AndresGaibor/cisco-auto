import { test, expect, describe } from "bun:test";
import {
  buildVerificationPlan,
  detectCommandType,
  buildVerificationPlanRich,
} from "../application/config-ios/verification-planner.js";

describe("buildVerificationPlan", () => {
  describe("VLAN commands", () => {
    test("returns vlan verification step for vlan creation commands", () => {
      const commands = ["vlan 10", "vlan 20", "vlan 30"];
      const plan = buildVerificationPlan(commands);

      expect(plan).toHaveLength(1);
      expect(plan[0]!.kind).toBe("vlan");
      expect(plan[0]!.verifyCommand).toBe("show vlan brief");
    });

    test("assert checks that VLAN IDs appear in output", () => {
      const commands = ["vlan 10", "vlan 20"];
      const plan = buildVerificationPlan(commands);
      const step = plan[0]!;

      expect(step.assert("VLAN 10 is active\nVLAN 20 is active", null, commands)).toBe(true);
      expect(step.assert("VLAN 10 is active", null, commands)).toBe(false);
    });

    test("handles case insensitivity for vlan keyword", () => {
      const commands = ["VLAN 10", "vlan 20"];
      const plan = buildVerificationPlan(commands);

      expect(plan).toHaveLength(1);
      expect(plan[0]!.kind).toBe("vlan");
    });
  });

  describe("interface commands", () => {
    test("returns interface verification step for interface config commands", () => {
      const commands = ["interface GigabitEthernet0/0"];
      const plan = buildVerificationPlan(commands);

      expect(plan).toHaveLength(1);
      expect(plan[0]!.kind).toBe("interface");
      expect(plan[0]!.verifyCommand).toBe("show ip interface brief");
    });

    test("returns interface step for ip address commands", () => {
      const commands = ["ip address 192.168.1.1 255.255.255.0"];
      const plan = buildVerificationPlan(commands);

      expect(plan).toHaveLength(1);
      expect(plan[0]!.kind).toBe("interface");
    });

    test("assert passes when output has content", () => {
      const commands = ["interface GigabitEthernet0/0"];
      const plan = buildVerificationPlan(commands);
      const step = plan[0]!;

      expect(step.assert("output exists", null, commands)).toBe(true);
      expect(step.assert("", null, commands)).toBe(false);
    });
  });

  describe("routing commands", () => {
    test("returns routing verification step for ip route commands", () => {
      const commands = ["ip route 0.0.0.0 0.0.0.0 192.168.1.254"];
      const plan = buildVerificationPlan(commands);

      expect(plan).toHaveLength(1);
      expect(plan[0]!.kind).toBe("routing");
      expect(plan[0]!.verifyCommand).toBe("show ip route");
    });

    test("returns routing step for router ospf commands", () => {
      const commands = ["router ospf 1", "network 192.168.1.0 0.0.0.255 area 0"];
      const plan = buildVerificationPlan(commands);

      expect(plan.some((s) => s.kind === "routing")).toBe(true);
    });

    test("returns routing step for EIGRP commands", () => {
      const commands = ["router eigrp 100"];
      const plan = buildVerificationPlan(commands);

      expect(plan.some((s) => s.kind === "routing")).toBe(true);
    });

    test("returns routing step for RIP commands", () => {
      const commands = ["router rip"];
      const plan = buildVerificationPlan(commands);

      expect(plan.some((s) => s.kind === "routing")).toBe(true);
    });
  });

  describe("ACL commands", () => {
    test("returns acl verification step for access-list commands", () => {
      const commands = ["access-list 100 permit tcp any any eq 80"];
      const plan = buildVerificationPlan(commands);

      expect(plan).toHaveLength(1);
      expect(plan[0]!.kind).toBe("acl");
      expect(plan[0]!.verifyCommand).toBe("show access-lists");
    });
  });

  describe("STP commands", () => {
    test("returns stp verification step for spanning-tree commands", () => {
      const commands = ["spanning-tree mode rapid-pvst"];
      const plan = buildVerificationPlan(commands);

      expect(plan).toHaveLength(1);
      expect(plan[0]!.kind).toBe("stp");
      expect(plan[0]!.verifyCommand).toBe("show spanning-tree");
    });

    test("returns stp step for STP keyword", () => {
      const commands = ["stp priority 4096"];
      const plan = buildVerificationPlan(commands);

      expect(plan).toHaveLength(1);
      expect(plan[0]!.kind).toBe("stp");
    });
  });

  describe("EtherChannel commands", () => {
    test("returns etherchannel verification step for etherchannel commands", () => {
      // Note: interface Port-channel1 also matches interface check, so we get 2 steps
      const commands = ["interface Port-channel1", "channel-group 1 mode active"];
      const plan = buildVerificationPlan(commands);

      expect(plan.some((s) => s.kind === "etherchannel")).toBe(true);
      expect(plan.some((s) => s.kind === "interface")).toBe(true);
    });

    test("returns etherchannel step for port-channel keyword", () => {
      const commands = ["port-channel load-balance src-dst-ip"];
      const plan = buildVerificationPlan(commands);

      expect(plan).toHaveLength(1);
      expect(plan[0]!.kind).toBe("etherchannel");
    });
  });

  describe("multiple command types", () => {
    test("returns multiple verification steps for mixed commands", () => {
      const commands = [
        "vlan 10",
        "interface GigabitEthernet0/0",
        "ip address 192.168.1.1 255.255.255.0",
      ];
      const plan = buildVerificationPlan(commands);

      expect(plan).toHaveLength(2);
      expect(plan.some((s) => s.kind === "vlan")).toBe(true);
      expect(plan.some((s) => s.kind === "interface")).toBe(true);
    });

    test("deduplicates steps when multiple commands trigger same verification", () => {
      const commands = [
        "vlan 10",
        "vlan 20",
        "vlan 30",
      ];
      const plan = buildVerificationPlan(commands);

      expect(plan).toHaveLength(1);
    });
  });

  describe("empty and invalid input", () => {
    test("returns empty plan for empty command list", () => {
      const plan = buildVerificationPlan([]);
      expect(plan).toHaveLength(0);
    });

    test("handles whitespace-only commands", () => {
      const commands = ["   ", ""];
      const plan = buildVerificationPlan(commands);
      expect(plan).toHaveLength(0);
    });

    test("deduplicates unique commands", () => {
      const commands = ["vlan 10", "vlan 10", "vlan 10"];
      const plan = buildVerificationPlan(commands);
      expect(plan).toHaveLength(1);
    });
  });
});

describe("detectCommandType", () => {
  test("detects interface type", () => {
    const types = detectCommandType(["interface GigabitEthernet0/0"]);
    expect(types).toContain("interface");
  });

  test("detects vlan type", () => {
    const types = detectCommandType(["vlan 10"]);
    expect(types).toContain("vlan");
  });

  test("detects routing type for ip route", () => {
    const types = detectCommandType(["ip route 0.0.0.0 0.0.0.0 192.168.1.254"]);
    expect(types).toContain("routing");
  });

  test("detects routing type for router keyword", () => {
    const types = detectCommandType(["router ospf 1"]);
    expect(types).toContain("routing");
  });

  test("detects acl type", () => {
    const types = detectCommandType(["access-list 100 permit ip any any"]);
    expect(types).toContain("acl");
  });

  test("detects stp type for spanning keyword", () => {
    const types = detectCommandType(["spanning-tree mode rapid-pvst"]);
    expect(types).toContain("stp");
  });

  test("detects stp type for stp keyword", () => {
    const types = detectCommandType(["stp priority 4096"]);
    expect(types).toContain("stp");
  });

  test("detects etherchannel type for etherchannel keyword", () => {
    const types = detectCommandType(["etherchannel mode active"]);
    expect(types).toContain("etherchannel");
  });

  test("detects etherchannel type for port-channel keyword", () => {
    const types = detectCommandType(["port-channel load-balance src-dst-ip"]);
    expect(types).toContain("etherchannel");
  });

  test("detects line type for line vty", () => {
    const types = detectCommandType(["line vty 0 4"]);
    expect(types).toContain("line");
  });

  test("detects line type for line console", () => {
    const types = detectCommandType(["line console 0"]);
    expect(types).toContain("line");
  });

  test("detects global type for hostname", () => {
    const types = detectCommandType(["hostname Router1"]);
    expect(types).toContain("global");
  });

  test("detects global type for enable", () => {
    const types = detectCommandType(["enable secret cisco"]);
    expect(types).toContain("global");
  });

  test("detects global type for service", () => {
    const types = detectCommandType(["service password-encryption"]);
    expect(types).toContain("global");
  });

  test("returns multiple types for commands with multiple features", () => {
    const types = detectCommandType([
      "interface GigabitEthernet0/0",
      "vlan 10",
      "ip route 0.0.0.0 0.0.0.0 192.168.1.254",
    ]);
    expect(types).toContain("interface");
    expect(types).toContain("vlan");
    expect(types).toContain("routing");
  });

  test("deduplicates types", () => {
    const types = detectCommandType(["vlan 10", "vlan 20"]);
    expect(types.filter((t) => t === "vlan")).toHaveLength(1);
  });

  test("returns empty array for no matching commands", () => {
    const types = detectCommandType(["show version"]);
    expect(types).toHaveLength(0);
  });
});

describe("buildVerificationPlanRich", () => {
  test("returns plan with hasVlan true for vlan commands", () => {
    const plan = buildVerificationPlanRich(["vlan 10"]);
    expect(plan.hasVlan).toBe(true);
    expect(plan.hasInterface).toBe(false);
    expect(plan.hasRouting).toBe(false);
  });

  test("returns plan with hasInterface true for interface commands", () => {
    const plan = buildVerificationPlanRich(["interface GigabitEthernet0/0"]);
    expect(plan.hasInterface).toBe(true);
    expect(plan.hasVlan).toBe(false);
  });

  test("returns plan with hasRouting true for routing commands", () => {
    const plan = buildVerificationPlanRich(["ip route 0.0.0.0 0.0.0.0 192.168.1.254"]);
    expect(plan.hasRouting).toBe(true);
  });

  test("returns plan with hasAcl true for ACL commands", () => {
    const plan = buildVerificationPlanRich(["access-list 100 permit ip any any"]);
    expect(plan.hasAcl).toBe(true);
  });

  test("returns plan with hasStp true for STP commands", () => {
    const plan = buildVerificationPlanRich(["spanning-tree mode rapid-pvst"]);
    expect(plan.hasStp).toBe(true);
  });

  test("returns plan with hasEtherchannel true for EtherChannel commands", () => {
    const plan = buildVerificationPlanRich(["interface Port-channel1"]);
    expect(plan.hasEtherchannel).toBe(true);
  });

  test("includes steps from buildVerificationPlan", () => {
    const commands = ["vlan 10", "interface GigabitEthernet0/0"];
    const plan = buildVerificationPlanRich(commands);
    expect(plan.steps).toHaveLength(2);
  });
});