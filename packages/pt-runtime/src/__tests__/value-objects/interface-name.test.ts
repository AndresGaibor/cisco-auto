// ============================================================================
// InterfaceName Value Object Tests
// ============================================================================

import { describe, it, expect } from "bun:test";
import {
  InterfaceName,
  parseInterfaceName,
  tryParseInterfaceName,
  isValidInterfaceName,
} from "../../value-objects/interface-name";

describe("InterfaceName", () => {
  describe("constructor", () => {
    it("should create valid interface names", () => {
      const iface = new InterfaceName("GigabitEthernet0/0");
      expect(iface.value).toBe("GigabitEthernet0/0");
      expect(iface.type).toBe("GigabitEthernet");
      expect(iface.slot).toBe(0);
      expect(iface.port).toBe(0);
    });

    it("should parse FastEthernet interfaces", () => {
      const iface = new InterfaceName("FastEthernet0/1");
      expect(iface.type).toBe("FastEthernet");
      expect(iface.slot).toBe(0);
      expect(iface.port).toBe(1);
    });

    it("should parse interfaces without port", () => {
      const iface = new InterfaceName("Loopback0");
      expect(iface.type).toBe("Loopback");
      expect(iface.slot).toBe(0);
      expect(iface.port).toBeNull();
    });

    it("should parse subinterfaces", () => {
      const iface = new InterfaceName("GigabitEthernet0/0.100");
      expect(iface.type).toBe("GigabitEthernet");
      expect(iface.slot).toBe(0);
      expect(iface.port).toBe(0);
      expect(iface.subinterface).toBe(100);
    });

    it("should parse Vlan interfaces", () => {
      const iface = new InterfaceName("Vlan1");
      expect(iface.type).toBe("Vlan");
      expect(iface.slot).toBe(1);
      expect(iface.port).toBeNull();
    });

    it("should parse Port-channel", () => {
      const iface = new InterfaceName("Port-channel1");
      expect(iface.type).toBe("Port-channel");
      expect(iface.slot).toBe(1);
    });

    it("should reject invalid interface types", () => {
      expect(() => new InterfaceName("Invalid0/0")).toThrow("Invalid interface type");
    });

    it("should reject invalid number format", () => {
      expect(() => new InterfaceName("GigabitEthernet")).toThrow("Invalid interface number");
    });
  });

  describe("abbreviation", () => {
    it("should abbreviate common interface types", () => {
      expect(new InterfaceName("GigabitEthernet0/0").abbreviation).toBe("Gi0/0");
      expect(new InterfaceName("FastEthernet0/1").abbreviation).toBe("Fa0/1");
      expect(new InterfaceName("Ethernet0").abbreviation).toBe("E0");
      expect(new InterfaceName("Vlan1").abbreviation).toBe("Vl1");
      expect(new InterfaceName("Port-channel1").abbreviation).toBe("Po1");
      expect(new InterfaceName("Loopback0").abbreviation).toBe("Lo0");
    });

    it("should abbreviate subinterfaces", () => {
      expect(new InterfaceName("GigabitEthernet0/0.100").abbreviation).toBe("Gi0/0.100");
    });
  });

  describe("canonical", () => {
    it("should return full canonical name", () => {
      expect(new InterfaceName("Gi0/0").canonical).toBe("GigabitEthernet0/0");
      expect(new InterfaceName("Fa0/1").canonical).toBe("FastEthernet0/1");
      expect(new InterfaceName("Vl1").canonical).toBe("Vlan1");
    });
  });

  describe("isPhysical", () => {
    it("should identify physical interfaces", () => {
      expect(new InterfaceName("GigabitEthernet0/0").isPhysical).toBe(true);
      expect(new InterfaceName("FastEthernet0/1").isPhysical).toBe(true);
    });

    it("should identify logical interfaces", () => {
      expect(new InterfaceName("Loopback0").isPhysical).toBe(false);
      expect(new InterfaceName("Vlan1").isPhysical).toBe(false);
      expect(new InterfaceName("Port-channel1").isPhysical).toBe(false);
    });
  });

  describe("isSubinterface", () => {
    it("should identify subinterfaces", () => {
      expect(new InterfaceName("GigabitEthernet0/0.100").isSubinterface).toBe(true);
    });

    it("should reject non-subinterfaces", () => {
      expect(new InterfaceName("GigabitEthernet0/0").isSubinterface).toBe(false);
    });
  });

  describe("isLayer3", () => {
    it("should identify Layer 3 interfaces", () => {
      expect(new InterfaceName("Loopback0").isLayer3).toBe(true);
      expect(new InterfaceName("Vlan1").isLayer3).toBe(true);
      expect(new InterfaceName("Serial0/0").isLayer3).toBe(true);
      expect(new InterfaceName("GigabitEthernet0/0.100").isLayer3).toBe(true);
    });

    it("should identify Layer 2 interfaces", () => {
      expect(new InterfaceName("GigabitEthernet0/0").isLayer2).toBe(true);
      expect(new InterfaceName("FastEthernet0/1").isLayer2).toBe(true);
    });
  });

  describe("getParent", () => {
    it("should return parent interface for subinterfaces", () => {
      const sub = new InterfaceName("GigabitEthernet0/0.100");
      const parent = sub.getParent();
      expect(parent?.value).toBe("GigabitEthernet0/0");
    });

    it("should return null for non-subinterfaces", () => {
      const iface = new InterfaceName("GigabitEthernet0/0");
      expect(iface.getParent()).toBeNull();
    });
  });

  describe("canHaveIp", () => {
    it("should identify interfaces that can have IP", () => {
      expect(new InterfaceName("GigabitEthernet0/0").canHaveIp).toBe(true);
      expect(new InterfaceName("Loopback0").canHaveIp).toBe(true);
      expect(new InterfaceName("Vlan1").canHaveIp).toBe(true);
    });
  });

  describe("isSwitchPort", () => {
    it("should identify switch ports", () => {
      expect(new InterfaceName("GigabitEthernet0/0").isSwitchPort).toBe(true);
      expect(new InterfaceName("FastEthernet0/1").isSwitchPort).toBe(true);
      expect(new InterfaceName("TenGigabit1/0").isSwitchPort).toBe(true);
    });

    it("should reject non-switch ports", () => {
      expect(new InterfaceName("Serial0/0").isSwitchPort).toBe(false);
      expect(new InterfaceName("Loopback0").isSwitchPort).toBe(false);
    });
  });

  describe("isRouterInterface", () => {
    it("should identify router interfaces", () => {
      expect(new InterfaceName("Serial0/0").isRouterInterface).toBe(true);
      expect(new InterfaceName("Async0").isRouterInterface).toBe(true);
      expect(new InterfaceName("Tunnel0").isRouterInterface).toBe(true);
      expect(new InterfaceName("GigabitEthernet0/0.100").isRouterInterface).toBe(true);
    });
  });

  describe("equals", () => {
    it("should compare equality", () => {
      const iface1 = new InterfaceName("GigabitEthernet0/0");
      const iface2 = new InterfaceName("Gi0/0");
      const iface3 = new InterfaceName("FastEthernet0/0");

      expect(iface1.equals(iface2)).toBe(false); // Different string representation
      expect(iface1.equals(iface3)).toBe(false);
    });
  });

  describe("toJSON/fromJSON", () => {
    it("should serialize and deserialize", () => {
      const iface = new InterfaceName("GigabitEthernet0/0");
      const json = iface.toJSON();
      expect(json).toBe("GigabitEthernet0/0");

      const restored = InterfaceName.fromJSON(json);
      expect(restored.equals(iface)).toBe(true);
    });
  });
});

describe("parseInterfaceName", () => {
  it("should parse valid names", () => {
    const iface = parseInterfaceName("GigabitEthernet0/0");
    expect(iface.type).toBe("GigabitEthernet");
  });

  it("should throw for invalid names", () => {
    expect(() => parseInterfaceName("Invalid0/0")).toThrow();
  });
});

describe("tryParseInterfaceName", () => {
  it("should return InterfaceName for valid names", () => {
    const iface = tryParseInterfaceName("GigabitEthernet0/0");
    expect(iface?.type).toBe("GigabitEthernet");
  });

  it("should return null for invalid names", () => {
    const iface = tryParseInterfaceName("Invalid0/0");
    expect(iface).toBeNull();
  });
});

describe("isValidInterfaceName", () => {
  it("should return true for valid names", () => {
    expect(isValidInterfaceName("GigabitEthernet0/0")).toBe(true);
    expect(isValidInterfaceName("Fa0/1")).toBe(true);
    expect(isValidInterfaceName("Vlan1")).toBe(true);
  });

  it("should return false for invalid names", () => {
    expect(isValidInterfaceName("Invalid0/0")).toBe(false);
    expect(isValidInterfaceName("")).toBe(false);
  });
});
