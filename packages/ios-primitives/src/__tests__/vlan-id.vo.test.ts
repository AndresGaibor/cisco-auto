import { describe, expect, test } from "bun:test";
import {
  VlanId,
  VlanType,
  MIN_VLAN_ID,
  MAX_VLAN_ID,
  parseVlanId,
  parseOptionalVlanId,
  isValidVlanId,
} from "../domain/ios/value-objects/vlan-id.vo.js";

describe("VlanId", () => {
  describe("construcción", () => {
    test("crea VlanId con valor válido en rango normal", () => {
      const vlan = new VlanId(100);
      expect(vlan.value).toBe(100);
    });

    test("lanza DomainError para valor menor a 1", () => {
      expect(() => new VlanId(0)).toThrow("Invalid VLAN ID");
    });

    test("lanza DomainError para valor mayor a 4094", () => {
      expect(() => new VlanId(4095)).toThrow("Invalid VLAN ID");
    });

    test("lanza DomainError para valor no entero", () => {
      expect(() => new VlanId(1.5)).toThrow("must be an integer");
    });
  });

  describe("factory methods", () => {
    test("from crea VlanId desde número", () => {
      const vlan = VlanId.from(100);
      expect(vlan).toBeInstanceOf(VlanId);
      expect(vlan.value).toBe(100);
    });

    test("fromString parsea string a VlanId", () => {
      const vlan = VlanId.fromString("100");
      expect(vlan.value).toBe(100);
    });

    test("fromString lanza error para string no numérico", () => {
      expect(() => VlanId.fromString("abc")).toThrow("not a valid number");
    });

    test("tryFrom retorna VlanId para valor válido", () => {
      expect(VlanId.tryFrom(100)).toBeInstanceOf(VlanId);
      expect(VlanId.tryFrom("100")).toBeInstanceOf(VlanId);
    });

    test("tryFrom retorna null para valor inválido", () => {
      expect(VlanId.tryFrom(9999)).toBeNull();
      expect(VlanId.tryFrom("abc")).toBeNull();
    });

    test("isValid retorna true para valor válido", () => {
      expect(VlanId.isValid(100)).toBe(true);
      expect(VlanId.isValid("100")).toBe(true);
    });

    test("isValid retorna false para valor inválido", () => {
      expect(VlanId.isValid(9999)).toBe(false);
      expect(VlanId.isValid("abc")).toBe(false);
    });
  });

  describe("clasificación de VLAN", () => {
    test("VLAN 1 es DEFAULT", () => {
      const vlan = new VlanId(1);
      expect(vlan.type).toBe(VlanType.DEFAULT);
      expect(vlan.isDefault).toBe(true);
      expect(vlan.isConfigurable).toBe(false);
    });

    test("VLANs 2-1001 son NORMAL", () => {
      const vlan = new VlanId(100);
      expect(vlan.type).toBe(VlanType.NORMAL);
      expect(vlan.isNormal).toBe(true);
      expect(vlan.isConfigurable).toBe(true);
    });

    test("VLANs 1002-1005 son RESERVED", () => {
      const vlan = new VlanId(1005);
      expect(vlan.type).toBe(VlanType.RESERVED);
      expect(vlan.isReserved).toBe(true);
      expect(vlan.isConfigurable).toBe(false);
    });

    test("VLANs 1006-4094 son EXTENDED", () => {
      const vlan = new VlanId(2000);
      expect(vlan.type).toBe(VlanType.EXTENDED);
      expect(vlan.isExtended).toBe(true);
      expect(vlan.isConfigurable).toBe(true);
    });
  });

  describe("constantes", () => {
    test("MIN_VLAN_ID es 1", () => {
      expect(MIN_VLAN_ID).toBe(1);
    });

    test("MAX_VLAN_ID es 4094", () => {
      expect(MAX_VLAN_ID).toBe(4094);
    });
  });

  describe("métodos", () => {
    test("compareTo ordena correctamente", () => {
      const a = new VlanId(100);
      const b = new VlanId(200);
      expect(a.compareTo(b)).toBeLessThan(0);
      expect(b.compareTo(a)).toBeGreaterThan(0);
      expect(a.compareTo(new VlanId(100))).toBe(0);
    });

    test("toNumber retorna el valor numérico", () => {
      const vlan = new VlanId(100);
      expect(vlan.toNumber()).toBe(100);
    });

    test("equals compara por valor", () => {
      const a = new VlanId(100);
      const b = new VlanId(100);
      const c = new VlanId(200);
      expect(a.equals(b)).toBe(true);
      expect(a.equals(c)).toBe(false);
    });

    test("toString retorna string del número", () => {
      const vlan = new VlanId(100);
      expect(vlan.toString()).toBe("100");
    });

    test("toJSON retorna el número", () => {
      const vlan = new VlanId(100);
      expect(vlan.toJSON()).toBe(100);
    });
  });

  describe("helper functions", () => {
    test("parseVlanId desde número", () => {
      expect(parseVlanId(100).value).toBe(100);
    });

    test("parseVlanId desde string", () => {
      expect(parseVlanId("100").value).toBe(100);
    });

    test("parseOptionalVlanId retorna undefined para null/undefined", () => {
      expect(parseOptionalVlanId(null)).toBeUndefined();
      expect(parseOptionalVlanId(undefined)).toBeUndefined();
    });

    test("parseOptionalVlanId parsea valor válido", () => {
      expect(parseOptionalVlanId(100)?.value).toBe(100);
    });

    test("isValidVlanId verifica sin lanzar error", () => {
      expect(isValidVlanId(100)).toBe(true);
      expect(isValidVlanId(9999)).toBe(false);
    });
  });
});
