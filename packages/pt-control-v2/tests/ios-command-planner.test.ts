import { describe, it, expect } from "bun:test";
import { planTrunkConfig, planSubinterfaceConfig, planSviConfig, planDhcpRelayConfig, planStaticRoute } from "../src/ios/operations/command-planner";
import { resolveCapabilities } from "../src/ios/capabilities/pt-capability-resolver";

describe("IOS Command Planner", () => {
  describe("Trunk Configuration", () => {
    it("2960 trunk should NOT include encapsulation command", () => {
      const caps = resolveCapabilities("2960-24TT");
      const commands = planTrunkConfig(caps, "GigabitEthernet0/1", ["10", "20"]);

      expect(commands).not.toContain("switchport trunk encapsulation dot1q");
      expect(commands).toContain("switchport mode trunk");
      expect(commands).toContain("switchport trunk allowed vlan 10,20");
    });

    it("2911 trunk should include encapsulation command", () => {
      const caps = resolveCapabilities("2911");
      const commands = planTrunkConfig(caps, "GigabitEthernet0/0", ["10", "20"]);

      expect(commands).toContain("switchport trunk encapsulation dot1q");
      expect(commands).toContain("switchport mode trunk");
    });
  });

  describe("Router-on-a-Stick Subinterfaces", () => {
    it("2911 subinterface uses encapsulation dot1q", () => {
      const caps = resolveCapabilities("2911");
      const commands = planSubinterfaceConfig(caps, "GigabitEthernet0/0", 10, "192.168.10.1", "255.255.255.0");

      expect(commands).toContain("interface GigabitEthernet0/0.10");
      expect(commands).toContain("encapsulation dot1q 10");
      expect(commands).toContain("ip address 192.168.10.1 255.255.255.0");
    });

    it("2911 subinterface supports multiple VLANs", () => {
      const caps = resolveCapabilities("2911");
      const commands = planSubinterfaceConfig(caps, "GigabitEthernet0/0", 20, "192.168.20.1", "255.255.255.0");

      expect(commands).toContain("interface GigabitEthernet0/0.20");
      expect(commands).toContain("encapsulation dot1q 20");
    });
  });

  describe("SVI Configuration", () => {
    it("3560 SVI uses interface vlan and ip routing", () => {
      const caps = resolveCapabilities("3560-24PS");
      const commands = planSviConfig(caps, 10, "192.168.10.1", "255.255.255.0");

      expect(commands).toContain("interface Vlan10");
      expect(commands).toContain("ip address 192.168.10.1 255.255.255.0");
      expect(commands).toContain("ip routing");
    });

    it("2960 should NOT support SVI", () => {
      const caps = resolveCapabilities("2960-24TT");
      const result = planSviConfig(caps, 10, "192.168.10.1", "255.255.255.0");

      expect(result).toBeNull();
    });
  });

  describe("DHCP Relay Configuration", () => {
    it("2911 supports ip helper-address", () => {
      const caps = resolveCapabilities("2911");
      const commands = planDhcpRelayConfig(caps, "GigabitEthernet0/0", "192.168.100.1");

      expect(commands).toContain("ip helper-address 192.168.100.1");
    });

    it("2960 should NOT support DHCP relay", () => {
      const caps = resolveCapabilities("2960-24TT");
      const result = planDhcpRelayConfig(caps, "Vlan1", "192.168.100.1");

      expect(result).toBeNull();
    });
  });

  describe("Static Route Configuration", () => {
    it("2911 can create static route", () => {
      const caps = resolveCapabilities("2911");
      const commands = planStaticRoute(caps, "192.168.0.0", "255.255.0.0", "192.168.1.1");

      expect(commands).toContain("ip route 192.168.0.0 255.255.0.0 192.168.1.1");
    });

    it("3560 can create static route", () => {
      const caps = resolveCapabilities("3560-24PS");
      const commands = planStaticRoute(caps, "10.0.0.0", "255.0.0.0", "10.0.0.1");

      expect(commands).toContain("ip route 10.0.0.0 255.0.0.0 10.0.0.1");
    });
  });
});
