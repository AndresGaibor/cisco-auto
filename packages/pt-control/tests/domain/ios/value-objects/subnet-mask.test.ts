import { describe, it, expect } from "bun:test";
import { SubnetMask, parseSubnetMask, isValidSubnetMask } from "../../../../src/domain/ios/value-objects/subnet-mask";

describe("SubnetMask", () => {
  describe("constructor", () => {
    it("creates a valid subnet mask", () => {
      const mask = new SubnetMask("255.255.255.0");
      expect(mask.value).toBe("255.255.255.0");
    });

    it("throws for invalid mask", () => {
      expect(() => new SubnetMask("255.0.255.0")).toThrow();
      expect(() => new SubnetMask("255.255.0.255")).toThrow();
    });
  });

  describe("fromCidr", () => {
    it("creates mask from CIDR notation", () => {
      const mask = SubnetMask.fromCidr(24);
      expect(mask.value).toBe("255.255.255.0");
      expect(mask.cidr).toBe(24);
    });

    it("handles CIDR 0", () => {
      const mask = SubnetMask.fromCidr(0);
      expect(mask.value).toBe("0.0.0.0");
    });

    it("handles CIDR 32", () => {
      const mask = SubnetMask.fromCidr(32);
      expect(mask.value).toBe("255.255.255.255");
    });

    it("throws for invalid CIDR", () => {
      expect(() => SubnetMask.fromCidr(-1)).toThrow();
      expect(() => SubnetMask.fromCidr(33)).toThrow();
    });
  });

  describe("cidr", () => {
    it("calculates CIDR from mask", () => {
      expect(new SubnetMask("255.0.0.0").cidr).toBe(8);
      expect(new SubnetMask("255.255.0.0").cidr).toBe(16);
      expect(new SubnetMask("255.255.255.0").cidr).toBe(24);
      expect(new SubnetMask("255.255.255.255").cidr).toBe(32);
    });
  });

  describe("parseSubnetMask", () => {
    it("parses valid mask", () => {
      const mask = parseSubnetMask("255.255.255.0");
      expect(mask.value).toBe("255.255.255.0");
    });
  });

  describe("isValidSubnetMask", () => {
    it("returns true for valid masks", () => {
      expect(isValidSubnetMask("255.255.255.0")).toBe(true);
      expect(isValidSubnetMask("255.255.0.0")).toBe(true);
    });

    it("returns false for invalid masks", () => {
      expect(isValidSubnetMask("255.0.255.0")).toBe(false);
    });
  });

  describe("wildcardMask", () => {
    it("returns inverse mask", () => {
      expect(new SubnetMask("255.255.255.0").wildcardMask).toBe("0.0.0.255");
      expect(new SubnetMask("255.255.0.0").wildcardMask).toBe("0.0.255.255");
    });
  });

  describe("usableHosts", () => {
    it("calculates usable hosts for /24", () => {
      expect(new SubnetMask("255.255.255.0").usableHosts).toBe(254);
    });

    it("calculates usable hosts for /30", () => {
      expect(new SubnetMask("255.255.255.252").usableHosts).toBe(2);
    });

    it("handles /31 and /32", () => {
      expect(new SubnetMask("255.255.255.254").usableHosts).toBe(2);
      expect(new SubnetMask("255.255.255.255").usableHosts).toBe(1);
    });
  });

  describe("totalAddresses", () => {
    it("calculates total addresses", () => {
      expect(new SubnetMask("255.255.255.0").totalAddresses).toBe(256);
      expect(new SubnetMask("255.255.0.0").totalAddresses).toBe(65536);
    });
  });

  describe("equals", () => {
    it("returns true for same mask", () => {
      expect(new SubnetMask("255.255.255.0").equals(new SubnetMask("255.255.255.0"))).toBe(true);
    });

    it("returns false for different masks", () => {
      expect(new SubnetMask("255.255.255.0").equals(new SubnetMask("255.255.0.0"))).toBe(false);
    });
  });

  describe("toString", () => {
    it("returns string representation", () => {
      expect(new SubnetMask("255.255.255.0").toString()).toBe("255.255.255.0");
    });
  });

  describe("toCidrString", () => {
    it("returns CIDR notation", () => {
      expect(new SubnetMask("255.255.255.0").toCidrString()).toBe("/24");
    });
  });
});
