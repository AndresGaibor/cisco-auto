// ============================================================================
// DeviceName Value Object Tests
// ============================================================================

import { describe, it, expect } from "bun:test";
import {
  DeviceName,
  parseDeviceName,
  tryParseDeviceName,
  isValidDeviceName,
} from "../../value-objects/device-name";

describe("DeviceName", () => {
  describe("constructor", () => {
    it("should create valid device names", () => {
      const name = new DeviceName("Router1");
      expect(name.value).toBe("Router1");
    });

    it("should trim whitespace", () => {
      const name = new DeviceName("  Switch1  ");
      expect(name.value).toBe("Switch1");
    });

    it("should reject empty names", () => {
      expect(() => new DeviceName("")).toThrow("cannot be empty");
      expect(() => new DeviceName("   ")).toThrow("cannot be empty");
    });

    it("should reject names exceeding max length", () => {
      const longName = "a".repeat(64);
      expect(() => new DeviceName(longName)).toThrow("too long");
    });

    it("should accept max length names", () => {
      const maxName = "a".repeat(63);
      expect(() => new DeviceName(maxName)).not.toThrow();
    });

    it("should reject names starting with numbers", () => {
      expect(() => new DeviceName("1Router")).toThrow("Must start with a letter");
    });

    it("should reject names with special characters", () => {
      expect(() => new DeviceName("Router@1")).toThrow("Must start with a letter");
      expect(() => new DeviceName("Switch 1")).toThrow("Must start with a letter");
    });

    it("should accept names with hyphens and underscores", () => {
      expect(() => new DeviceName("Router-1")).not.toThrow();
      expect(() => new DeviceName("Switch_Core_1")).not.toThrow();
    });
  });

  describe("isDefaultName", () => {
    it("should identify default PT names", () => {
      expect(new DeviceName("Router0").isDefaultName).toBe(true);
      expect(new DeviceName("Switch1").isDefaultName).toBe(true);
      expect(new DeviceName("PC5").isDefaultName).toBe(true);
      expect(new DeviceName("Server10").isDefaultName).toBe(true);
    });

    it("should identify custom names", () => {
      expect(new DeviceName("R1").isDefaultName).toBe(false);
      expect(new DeviceName("CoreSwitch").isDefaultName).toBe(false);
      expect(new DeviceName("Gateway").isDefaultName).toBe(false);
    });
  });

  describe("deviceTypePrefix", () => {
    it("should extract type prefix", () => {
      expect(new DeviceName("Router1").deviceTypePrefix).toBe("Router");
      expect(new DeviceName("Switch1").deviceTypePrefix).toBe("Switch");
      expect(new DeviceName("PC1").deviceTypePrefix).toBe("PC");
    });

    it("should return null for names without prefix", () => {
      expect(new DeviceName("R1").deviceTypePrefix).toBe("R");
    });
  });

  describe("numericSuffix", () => {
    it("should extract numeric suffix", () => {
      expect(new DeviceName("Router1").numericSuffix).toBe(1);
      expect(new DeviceName("Switch100").numericSuffix).toBe(100);
    });

    it("should return null for names without numbers", () => {
      expect(new DeviceName("Gateway").numericSuffix).toBeNull();
    });
  });

  describe("followsNamingConvention", () => {
    it("should identify common naming conventions", () => {
      expect(new DeviceName("R1").followsNamingConvention).toBe(true);
      expect(new DeviceName("SW1").followsNamingConvention).toBe(true);
      expect(new DeviceName("PC1").followsNamingConvention).toBe(true);
      expect(new DeviceName("SRV1").followsNamingConvention).toBe(true);
    });

    it("should reject non-conventional names", () => {
      expect(new DeviceName("Router1").followsNamingConvention).toBe(false);
      expect(new DeviceName("Gateway").followsNamingConvention).toBe(false);
    });
  });

  describe("withCounter", () => {
    it("should create names with counter", () => {
      const name = DeviceName.withCounter("R", 1);
      expect(name.value).toBe("R1");
    });

    it("should handle multi-digit counters", () => {
      const name = DeviceName.withCounter("SW", 10);
      expect(name.value).toBe("SW10");
    });
  });

  describe("equals", () => {
    it("should compare equality", () => {
      const name1 = new DeviceName("Router1");
      const name2 = new DeviceName("Router1");
      const name3 = new DeviceName("Switch1");

      expect(name1.equals(name2)).toBe(true);
      expect(name1.equals(name3)).toBe(false);
    });
  });

  describe("toJSON/fromJSON", () => {
    it("should serialize and deserialize", () => {
      const name = new DeviceName("Router1");
      const json = name.toJSON();
      expect(json).toBe("Router1");

      const restored = DeviceName.fromJSON(json);
      expect(restored.equals(name)).toBe(true);
    });
  });
});

describe("parseDeviceName", () => {
  it("should parse valid names", () => {
    const name = parseDeviceName("Router1");
    expect(name.value).toBe("Router1");
  });

  it("should throw for invalid names", () => {
    expect(() => parseDeviceName("1Router")).toThrow();
  });
});

describe("tryParseDeviceName", () => {
  it("should return DeviceName for valid names", () => {
    const name = tryParseDeviceName("Router1");
    expect(name?.value).toBe("Router1");
  });

  it("should return null for invalid names", () => {
    const name = tryParseDeviceName("1Router");
    expect(name).toBeNull();
  });
});

describe("isValidDeviceName", () => {
  it("should return true for valid names", () => {
    expect(isValidDeviceName("Router1")).toBe(true);
    expect(isValidDeviceName("SW-Core-1")).toBe(true);
  });

  it("should return false for invalid names", () => {
    expect(isValidDeviceName("1Router")).toBe(false);
    expect(isValidDeviceName("")).toBe(false);
    expect(isValidDeviceName("Router@1")).toBe(false);
  });
});
