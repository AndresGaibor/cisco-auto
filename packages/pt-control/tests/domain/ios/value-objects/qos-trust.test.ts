// ============================================================================
// QosTrust Value Object Tests
// ============================================================================

import { describe, it, expect } from "bun:test";
import {
  QosTrust,
  parseQosTrust,
  isValidQosTrust,
  type QosTrustMode,
} from "@cisco-auto/ios-domain";

describe("QosTrust", () => {
  describe("constructor", () => {
    it("should create valid trust modes", () => {
      const trust = new QosTrust("dscp");
      expect(trust.mode).toBe("dscp");
    });

    it("should accept all valid modes", () => {
      expect(() => new QosTrust("untrusted")).not.toThrow();
      expect(() => new QosTrust("cos")).not.toThrow();
      expect(() => new QosTrust("dscp")).not.toThrow();
      expect(() => new QosTrust("ip-precedence")).not.toThrow();
    });

    it("should reject invalid modes", () => {
      expect(() => new QosTrust("invalid" as QosTrustMode)).toThrow("Invalid QoS trust mode");
    });
  });

  describe("type guards", () => {
    it("should identify untrusted mode", () => {
      const trust = new QosTrust("untrusted");
      expect(trust.isUntrusted).toBe(true);
      expect(trust.isTrusted).toBe(false);
    });

    it("should identify CoS trust", () => {
      const trust = new QosTrust("cos");
      expect(trust.isCosTrusted).toBe(true);
      expect(trust.isLayer2Trust).toBe(true);
      expect(trust.isLayer3Trust).toBe(false);
    });

    it("should identify DSCP trust", () => {
      const trust = new QosTrust("dscp");
      expect(trust.isDscpTrusted).toBe(true);
      expect(trust.isLayer3Trust).toBe(true);
      expect(trust.isLayer2Trust).toBe(false);
    });

    it("should identify IP Precedence trust", () => {
      const trust = new QosTrust("ip-precedence");
      expect(trust.isIpPrecedenceTrusted).toBe(true);
      expect(trust.isLayer3Trust).toBe(true);
    });
  });

  describe("toCiscoCommand", () => {
    it("should generate correct command for untrusted", () => {
      const trust = new QosTrust("untrusted");
      expect(trust.toCiscoCommand()).toBe("mls qos trust none");
    });

    it("should generate correct command for cos", () => {
      const trust = new QosTrust("cos");
      expect(trust.toCiscoCommand()).toBe("mls qos trust cos");
    });

    it("should generate correct command for dscp", () => {
      const trust = new QosTrust("dscp");
      expect(trust.toCiscoCommand()).toBe("mls qos trust dscp");
    });

    it("should generate correct command for ip-precedence", () => {
      const trust = new QosTrust("ip-precedence");
      expect(trust.toCiscoCommand()).toBe("mls qos trust ip-precedence");
    });
  });

  describe("toRollbackCommand", () => {
    it("should generate rollback command", () => {
      const trust = new QosTrust("dscp");
      expect(trust.toRollbackCommand()).toBe("no mls qos trust");
    });
  });

  describe("fromCiscoCommand", () => {
    it("should parse untrusted command", () => {
      const trust = QosTrust.fromCiscoCommand("mls qos trust none");
      expect(trust?.isUntrusted).toBe(true);
    });

    it("should parse cos command", () => {
      const trust = QosTrust.fromCiscoCommand("mls qos trust cos");
      expect(trust?.isCosTrusted).toBe(true);
    });

    it("should parse dscp command", () => {
      const trust = QosTrust.fromCiscoCommand("mls qos trust dscp");
      expect(trust?.isDscpTrusted).toBe(true);
    });

    it("should parse ip-precedence command", () => {
      const trust = QosTrust.fromCiscoCommand("mls qos trust ip-precedence");
      expect(trust?.isIpPrecedenceTrusted).toBe(true);
    });

    it("should return null for unknown commands", () => {
      const trust = QosTrust.fromCiscoCommand("unknown command");
      expect(trust).toBeNull();
    });

    it("should be case-insensitive", () => {
      const trust = QosTrust.fromCiscoCommand("MLS QOS TRUST DSCP");
      expect(trust?.isDscpTrusted).toBe(true);
    });
  });

  describe("recommended presets", () => {
    it("should provide access port recommendation", () => {
      const preset = QosTrust.recommended().accessPort;
      expect(preset.isUntrusted).toBe(true);
    });

    it("should provide trunk port recommendation", () => {
      const preset = QosTrust.recommended().trunkPort;
      expect(preset.isDscpTrusted).toBe(true);
    });

    it("should provide uplink port recommendation", () => {
      const preset = QosTrust.recommended().uplinkPort;
      expect(preset.isDscpTrusted).toBe(true);
    });

    it("should provide IP phone port recommendation", () => {
      const preset = QosTrust.recommended().ipPhonePort;
      expect(preset.isDscpTrusted).toBe(true);
    });
  });

  describe("equals", () => {
    it("should compare equality", () => {
      const trust1 = new QosTrust("dscp");
      const trust2 = new QosTrust("dscp");
      const trust3 = new QosTrust("cos");
      
      expect(trust1.equals(trust2)).toBe(true);
      expect(trust1.equals(trust3)).toBe(false);
    });
  });

  describe("toString", () => {
    it("should return mode as string", () => {
      expect(new QosTrust("dscp").toString()).toBe("dscp");
      expect(new QosTrust("untrusted").toString()).toBe("untrusted");
    });
  });

  describe("toJSON/fromJSON", () => {
    it("should serialize and deserialize", () => {
      const trust = new QosTrust("dscp");
      const json = trust.toJSON();
      
      expect(json).toBe("dscp");
      
      const restored = QosTrust.fromJSON(json);
      expect(restored.equals(trust)).toBe(true);
    });
  });
});

describe("parseQosTrust", () => {
  it("should parse valid modes", () => {
    const trust = parseQosTrust("dscp");
    expect(trust.mode).toBe("dscp");
  });

  it("should throw for invalid modes", () => {
    expect(() => parseQosTrust("invalid")).toThrow();
  });
});

describe("isValidQosTrust", () => {
  it("should return true for valid modes", () => {
    expect(isValidQosTrust("untrusted")).toBe(true);
    expect(isValidQosTrust("cos")).toBe(true);
    expect(isValidQosTrust("dscp")).toBe(true);
    expect(isValidQosTrust("ip-precedence")).toBe(true);
  });

  it("should return false for invalid modes", () => {
    expect(isValidQosTrust("invalid")).toBe(false);
    expect(isValidQosTrust("")).toBe(false);
  });
});
