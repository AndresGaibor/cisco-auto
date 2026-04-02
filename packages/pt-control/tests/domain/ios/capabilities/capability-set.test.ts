import { describe, it, expect } from "bun:test";
import { CapabilitySet, IOSFamily } from "@cisco-auto/ios-domain";

describe("CapabilitySet", () => {
  describe("factory methods", () => {
    it("creates router capability set", () => {
      const caps = CapabilitySet.router("2911");
      expect(caps.model).toBe("2911");
      expect(caps.family).toBe(IOSFamily.ROUTER);
      expect(caps.switchport.accessMode).toBe(true);
      expect(caps.switchport.trunkMode).toBe(true);
      expect(caps.routing.ipRouting).toBe(true);
      expect(caps.routing.subinterfaces).toBe(true);
      expect(caps.routing.svi).toBe(false);
      expect(caps.switching.vlan).toBe(false);
    });

    it("creates L2 switch capability set", () => {
      const caps = CapabilitySet.l2Switch("2960-24TT");
      expect(caps.model).toBe("2960-24TT");
      expect(caps.family).toBe(IOSFamily.SWITCH_L2);
      expect(caps.switchport.accessMode).toBe(true);
      expect(caps.switchport.trunkMode).toBe(true);
      expect(caps.routing.ipRouting).toBe(false);
      expect(caps.switching.vlan).toBe(true);
      expect(caps.switching.maxVlanCount).toBe(255);
    });

    it("creates L3 switch capability set", () => {
      const caps = CapabilitySet.l3Switch("3650-48PS");
      expect(caps.model).toBe("3650-48PS");
      expect(caps.family).toBe(IOSFamily.SWITCH_L3);
      expect(caps.switchport.accessMode).toBe(true);
      expect(caps.switchport.trunkMode).toBe(true);
      expect(caps.routing.ipRouting).toBe(true);
      expect(caps.routing.svi).toBe(true);
      expect(caps.switching.vlan).toBe(true);
    });

    it("creates unknown capability set", () => {
      const caps = CapabilitySet.unknown("UNKNOWN-MODEL");
      expect(caps.model).toBe("UNKNOWN-MODEL");
      expect(caps.family).toBe(IOSFamily.UNKNOWN);
      expect(caps.switchport.accessMode).toBe(false);
      expect(caps.routing.ipRouting).toBe(false);
    });
  });

  describe("familyName", () => {
    it("returns correct family names", () => {
      expect(CapabilitySet.router("2911").familyName).toBe("Router");
      expect(CapabilitySet.l2Switch("2960-24TT").familyName).toBe("L2 Switch");
      expect(CapabilitySet.l3Switch("3650-48PS").familyName).toBe("L3 Switch");
      expect(CapabilitySet.unknown("X").familyName).toBe("Unknown");
    });
  });

  describe("canBeTrunk", () => {
    it("returns true for router", () => {
      expect(CapabilitySet.router("2911").canBeTrunk).toBe(true);
    });

    it("returns true for L3 switch", () => {
      expect(CapabilitySet.l3Switch("3650-48PS").canBeTrunk).toBe(true);
    });

    it("returns true for L2 switch with dot1q support", () => {
      // L2 switches have dot1q=true, so canBeTrunk = true (dot1q is sufficient)
      const l2 = CapabilitySet.l2Switch("2960-24TT");
      expect(l2.canBeTrunk).toBe(true);
    });

    it("returns false for unknown", () => {
      expect(CapabilitySet.unknown("X").canBeTrunk).toBe(false);
    });
  });

  describe("supportsInterVlanRouting", () => {
    it("returns true for router via subinterfaces", () => {
      expect(CapabilitySet.router("2911").supportsInterVlanRouting).toBe(true);
    });

    it("returns true for L3 switch via SVI", () => {
      expect(CapabilitySet.l3Switch("3650-48PS").supportsInterVlanRouting).toBe(true);
    });

    it("returns false for L2 switch", () => {
      expect(CapabilitySet.l2Switch("2960-24TT").supportsInterVlanRouting).toBe(false);
    });
  });

  describe("supportsDhcpHelper", () => {
    it("returns true for router", () => {
      expect(CapabilitySet.router("2911").supportsDhcpHelper).toBe(true);
    });

    it("returns true for L3 switch", () => {
      expect(CapabilitySet.l3Switch("3650-48PS").supportsDhcpHelper).toBe(true);
    });

    it("returns false for L2 switch", () => {
      expect(CapabilitySet.l2Switch("2960-24TT").supportsDhcpHelper).toBe(false);
    });
  });

  describe("isL2Only", () => {
    it("returns true for L2 switch", () => {
      expect(CapabilitySet.l2Switch("2960-24TT").isL2Only).toBe(true);
    });

    it("returns false for router", () => {
      expect(CapabilitySet.router("2911").isL2Only).toBe(false);
    });

    it("returns false for L3 switch", () => {
      expect(CapabilitySet.l3Switch("3650-48PS").isL2Only).toBe(false);
    });
  });

  describe("isL3Capable", () => {
    it("returns true for router", () => {
      expect(CapabilitySet.router("2911").isL3Capable).toBe(true);
    });

    it("returns true for L3 switch", () => {
      expect(CapabilitySet.l3Switch("3650-48PS").isL3Capable).toBe(true);
    });

    it("returns false for L2 switch", () => {
      expect(CapabilitySet.l2Switch("2960-24TT").isL3Capable).toBe(false);
    });

    it("returns false for unknown", () => {
      expect(CapabilitySet.unknown("X").isL3Capable).toBe(false);
    });
  });

  describe("feature counts", () => {
    it("router has no VLAN support", () => {
      const caps = CapabilitySet.router("2911");
      expect(caps.switching.vlan).toBe(false);
      expect(caps.switching.maxVlanCount).toBe(0);
    });

    it("L2 switch supports 255 VLANs", () => {
      const caps = CapabilitySet.l2Switch("2960-24TT");
      expect(caps.switching.maxVlanCount).toBe(255);
    });

    it("L3 switch supports 255 VLANs", () => {
      const caps = CapabilitySet.l3Switch("3650-48PS");
      expect(caps.switching.maxVlanCount).toBe(255);
    });
  });
});
