import { describe, it, expect } from "bun:test";
import { VlanId, parseVlanId, isValidVlanId } from "@cisco-auto/kernel/domain/ios/value-objects";

describe("VlanId", () => {
  describe("constructor", () => {
    it("creates a valid VLAN ID", () => {
      const vlan = new VlanId(100);
      expect(vlan.value).toBe(100);
    });

    it("throws for VLAN ID 0", () => {
      expect(() => new VlanId(0)).toThrow("VLAN ID must be between 1 and 4094");
    });

    it("throws for VLAN ID > 4094", () => {
      expect(() => new VlanId(4095)).toThrow("VLAN ID must be between 1 and 4094");
    });

    it("throws for non-integer values", () => {
      expect(() => new VlanId(100.5)).toThrow("VLAN ID must be an integer");
    });
  });

  describe("parseVlanId", () => {
    it("parses number", () => {
      const vlan = parseVlanId(100);
      expect(vlan.value).toBe(100);
    });

    it("parses string", () => {
      const vlan = parseVlanId("100");
      expect(vlan.value).toBe(100);
    });

    it("throws for invalid string", () => {
      expect(() => parseVlanId("abc")).toThrow();
    });
  });

  describe("isValidVlanId", () => {
    it("returns true for valid IDs", () => {
      expect(isValidVlanId(1)).toBe(true);
      expect(isValidVlanId(100)).toBe(true);
      expect(isValidVlanId(4094)).toBe(true);
    });

    it("returns false for invalid IDs", () => {
      expect(isValidVlanId(0)).toBe(false);
      expect(isValidVlanId(4095)).toBe(false);
    });
  });

  describe("properties", () => {
    it("detects reserved VLANs", () => {
      // VLAN 1 is DEFAULT, not reserved
      expect(new VlanId(1).isReserved).toBe(false);
      expect(new VlanId(1).isDefault).toBe(true);
      // Reserved: 1002-1005 (legacy FDDI/Token Ring)
      expect(new VlanId(1002).isReserved).toBe(true);
      expect(new VlanId(1003).isReserved).toBe(true);
      expect(new VlanId(1004).isReserved).toBe(true);
      expect(new VlanId(1005).isReserved).toBe(true);
      expect(new VlanId(100).isReserved).toBe(false);
    });

    it("detects extended VLANs", () => {
      expect(new VlanId(1006).isExtended).toBe(true);
      expect(new VlanId(4094).isExtended).toBe(true);
      expect(new VlanId(1005).isExtended).toBe(false);
    });

    it("detects default VLAN", () => {
      expect(new VlanId(1).isDefault).toBe(true);
      expect(new VlanId(100).isDefault).toBe(false);
    });
  });

  describe("equals", () => {
    it("returns true for same value", () => {
      expect(new VlanId(100).equals(new VlanId(100))).toBe(true);
    });

    it("returns false for different values", () => {
      expect(new VlanId(100).equals(new VlanId(200))).toBe(false);
    });
  });

  describe("toString", () => {
    it("returns string representation", () => {
      expect(new VlanId(100).toString()).toBe("100");
    });
  });
});
