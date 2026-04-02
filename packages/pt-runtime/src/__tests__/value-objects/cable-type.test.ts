// ============================================================================
// CableType Value Object Tests
// ============================================================================

import { describe, it, expect } from "bun:test";
import {
  CableType,
  parseCableType,
  parseCableTypeId,
  getCableTypeId,
  getCableTypeName,
  isValidCableType,
  isValidCableTypeId,
  CABLE_TYPE_IDS,
  CABLE_RECOMMENDATIONS,
  type CableTypeName,
} from "../../value-objects/cable-type";

describe("CableType", () => {
  describe("constructor", () => {
    it("should create valid cable types", () => {
      const cable = new CableType("straight");
      expect(cable.name).toBe("straight");
      expect(cable.id).toBe(8100);
    });

    it("should accept all valid cable types", () => {
      const validTypes: CableTypeName[] = [
        'straight', 'cross', 'roll', 'fiber', 'phone',
        'cable', 'serial', 'auto', 'console', 'wireless',
        'coaxial', 'octal', 'cellular', 'usb', 'custom_io'
      ];

      validTypes.forEach(type => {
        expect(() => new CableType(type)).not.toThrow();
      });
    });

    it("should reject invalid cable types", () => {
      expect(() => new CableType("invalid" as CableTypeName)).toThrow("Invalid cable type");
    });
  });

  describe("displayName", () => {
    it("should return display name", () => {
      expect(new CableType("straight").displayName).toBe("Straight-Through");
      expect(new CableType("cross").displayName).toBe("Crossover");
      expect(new CableType("fiber").displayName).toBe("Fiber");
    });
  });

  describe("type guards", () => {
    it("should identify Ethernet cables", () => {
      expect(new CableType("straight").isEthernet).toBe(true);
      expect(new CableType("cross").isEthernet).toBe(true);
      expect(new CableType("fiber").isEthernet).toBe(false);
    });

    it("should identify serial cables", () => {
      expect(new CableType("serial").isSerial).toBe(true);
      expect(new CableType("straight").isSerial).toBe(false);
    });

    it("should identify fiber cables", () => {
      expect(new CableType("fiber").isFiber).toBe(true);
    });

    it("should identify console cables", () => {
      expect(new CableType("console").isConsole).toBe(true);
      expect(new CableType("roll").isConsole).toBe(true);
    });

    it("should identify wireless connections", () => {
      expect(new CableType("wireless").isWireless).toBe(true);
      expect(new CableType("cellular").isWireless).toBe(true);
    });

    it("should identify auto mode", () => {
      expect(new CableType("auto").isAuto).toBe(true);
      expect(new CableType("straight").isAuto).toBe(false);
    });
  });

  describe("recommend", () => {
    it("should recommend straight for device-to-switch", () => {
      expect(CableType.recommend("pc_to_switch").name).toBe("straight");
      expect(CableType.recommend("server_to_switch").name).toBe("straight");
    });

    it("should recommend cross for same device types", () => {
      expect(CableType.recommend("switch_to_switch").name).toBe("cross");
      expect(CableType.recommend("pc_to_pc").name).toBe("cross");
    });

    it("should recommend console for management", () => {
      expect(CableType.recommend("pc_console_to_router").name).toBe("console");
    });

    it("should recommend auto", () => {
      expect(CableType.recommend("auto").name).toBe("auto");
    });
  });

  describe("fromId", () => {
    it("should create CableType from PT internal ID", () => {
      const cable = CableType.fromId(8100);
      expect(cable?.name).toBe("straight");
      expect(cable?.id).toBe(8100);
    });

    it("should return null for invalid IDs", () => {
      const cable = CableType.fromId(9999);
      expect(cable).toBeNull();
    });
  });

  describe("fromName", () => {
    it("should create CableType from name (case-insensitive)", () => {
      expect(CableType.fromName("straight")?.name).toBe("straight");
      expect(CableType.fromName("STRAIGHT")?.name).toBe("straight");
      expect(CableType.fromName("Straight-Through")?.name).toBe("straight");
    });

    it("should return null for invalid names", () => {
      expect(CableType.fromName("invalid")).toBeNull();
    });
  });

  describe("equals", () => {
    it("should compare equality", () => {
      const cable1 = new CableType("straight");
      const cable2 = new CableType("straight");
      const cable3 = new CableType("cross");

      expect(cable1.equals(cable2)).toBe(true);
      expect(cable1.equals(cable3)).toBe(false);
    });
  });

  describe("toJSON/fromJSON", () => {
    it("should serialize and deserialize", () => {
      const cable = new CableType("fiber");
      const json = cable.toJSON();
      expect(json).toBe("fiber");

      const restored = CableType.fromJSON(json);
      expect(restored.equals(cable)).toBe(true);
    });
  });

  describe("toString", () => {
    it("should return formatted string", () => {
      expect(new CableType("straight").toString()).toBe("Straight-Through (8100)");
      expect(new CableType("fiber").toString()).toBe("Fiber (8103)");
    });
  });
});

describe("parseCableType", () => {
  it("should parse valid names", () => {
    const cable = parseCableType("straight");
    expect(cable.name).toBe("straight");
    expect(cable.id).toBe(8100);
  });

  it("should throw for invalid names", () => {
    expect(() => parseCableType("invalid")).toThrow();
  });
});

describe("parseCableTypeId", () => {
  it("should parse valid IDs", () => {
    const cable = parseCableTypeId(8100);
    expect(cable.name).toBe("straight");
  });

  it("should throw for invalid IDs", () => {
    expect(() => parseCableTypeId(9999)).toThrow();
  });
});

describe("getCableTypeId", () => {
  it("should return ID for valid name", () => {
    expect(getCableTypeId("straight")).toBe(8100);
    expect(getCableTypeId("cross")).toBe(8101);
    expect(getCableTypeId("auto")).toBe(8107);
  });
});

describe("getCableTypeName", () => {
  it("should return name for valid ID", () => {
    expect(getCableTypeName(8100)).toBe("straight");
    expect(getCableTypeName(8107)).toBe("auto");
  });

  it("should return null for invalid ID", () => {
    expect(getCableTypeName(9999)).toBeNull();
  });
});

describe("isValidCableType", () => {
  it("should return true for valid names", () => {
    expect(isValidCableType("straight")).toBe(true);
    expect(isValidCableType("auto")).toBe(true);
  });

  it("should return false for invalid names", () => {
    expect(isValidCableType("invalid")).toBe(false);
  });
});

describe("isValidCableTypeId", () => {
  it("should return true for valid IDs", () => {
    expect(isValidCableTypeId(8100)).toBe(true);
    expect(isValidCableTypeId(8107)).toBe(true);
  });

  it("should return false for invalid IDs", () => {
    expect(isValidCableTypeId(9999)).toBe(false);
  });
});

describe("CABLE_TYPE_IDS", () => {
  it("should have correct IDs", () => {
    expect(CABLE_TYPE_IDS.straight).toBe(8100);
    expect(CABLE_TYPE_IDS.cross).toBe(8101);
    expect(CABLE_TYPE_IDS.auto).toBe(8107);
  });
});

describe("CABLE_RECOMMENDATIONS", () => {
  it("should have recommendations for common scenarios", () => {
    expect(CABLE_RECOMMENDATIONS.pc_to_switch).toBe("straight");
    expect(CABLE_RECOMMENDATIONS.switch_to_switch).toBe("cross");
    expect(CABLE_RECOMMENDATIONS.pc_console_to_router).toBe("console");
  });
});
