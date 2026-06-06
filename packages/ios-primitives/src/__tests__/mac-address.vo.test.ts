import { describe, expect, test } from "bun:test";
import {
  MacAddress,
  parseMacAddress,
  isValidMacAddress,
} from "../domain/ios/value-objects/mac-address.vo.js";

describe("MacAddress", () => {
  describe("construcción desde diferentes formatos", () => {
    test("formato Cisco (AAAA.BBBB.CCCC)", () => {
      const mac = new MacAddress("aabb.ccdd.eeff");
      expect(mac.value).toBe("AABB.CCDD.EEFF");
    });

    test("formato colon (AA:BB:CC:DD:EE:FF)", () => {
      const mac = new MacAddress("aa:bb:cc:dd:ee:ff");
      expect(mac.value).toBe("AA:BB:CC:DD:EE:FF");
    });

    test("formato hyphen (AA-BB-CC-DD-EE-FF)", () => {
      const mac = new MacAddress("aa-bb-cc-dd-ee-ff");
      expect(mac.value).toBe("AA-BB-CC-DD-EE-FF");
    });

    test("formato bare (AABBCCDDEEFF)", () => {
      const mac = new MacAddress("aabbccddeeff");
      expect(mac.value).toBe("AABBCCDDEEFF");
    });

    test("normaliza a mayúsculas", () => {
      const mac = new MacAddress("AA:BB:CC:DD:EE:FF");
      expect(mac.value).toBe("AA:BB:CC:DD:EE:FF");
    });

    test("lanza DomainError para string inválido", () => {
      expect(() => new MacAddress("xyz")).toThrow("MAC address");
    });

    test("lanza DomainError para string vacío", () => {
      expect(() => new MacAddress("")).toThrow("MAC address");
    });
  });

  describe("factory methods", () => {
    test("fromJSON crea desde string", () => {
      const mac = MacAddress.fromJSON("aa:bb:cc:dd:ee:ff");
      expect(mac.value).toBe("AA:BB:CC:DD:EE:FF");
    });
  });

  describe("formateo de salida", () => {
    const mac = new MacAddress("00:1A:2B:3C:4D:5E");

    test("toCiscoFormat", () => {
      expect(mac.toCiscoFormat()).toBe("001A.2B3C.4D5E");
    });

    test("toColonFormat", () => {
      expect(mac.toColonFormat()).toBe("00:1A:2B:3C:4D:5E");
    });

    test("toHyphenFormat", () => {
      expect(mac.toHyphenFormat()).toBe("00-1A-2B-3C-4D-5E");
    });

    test("toBareFormat", () => {
      expect(mac.toBareFormat()).toBe("001A2B3C4D5E");
    });
  });

  describe("OUI y NIC", () => {
    const mac = new MacAddress("00:1A:2B:3C:4D:5E");

    test("oui retorna primeros 3 octetos", () => {
      expect(mac.oui).toBe("00:1A:2B");
    });

    test("nic retorna últimos 3 octetos", () => {
      expect(mac.nic).toBe("3C:4D:5E");
    });
  });

  describe("clasificación", () => {
    test("isUnicast - LSB del primer octeto es 0", () => {
      expect(new MacAddress("00:00:00:00:00:01").isUnicast).toBe(true);
    });

    test("isMulticast - LSB del primer octeto es 1", () => {
      expect(new MacAddress("01:00:00:00:00:01").isMulticast).toBe(true);
    });

    test("isBroadcast - FF:FF:FF:FF:FF:FF", () => {
      expect(new MacAddress("FF:FF:FF:FF:FF:FF").isBroadcast).toBe(true);
      expect(new MacAddress("00:00:00:00:00:00").isBroadcast).toBe(false);
    });

    test("isLocallyAdministered", () => {
      expect(new MacAddress("02:00:00:00:00:00").isLocallyAdministered).toBe(true);
      expect(new MacAddress("00:00:00:00:00:00").isLocallyAdministered).toBe(false);
    });

    test("isUniversal", () => {
      expect(new MacAddress("00:00:00:00:00:00").isUniversal).toBe(true);
      expect(new MacAddress("02:00:00:00:00:00").isUniversal).toBe(false);
    });
  });

  describe("octets", () => {
    test("retorna array de 6 octetos", () => {
      const mac = new MacAddress("00:1A:2B:3C:4D:5E");
      expect(mac.octets).toEqual([0x00, 0x1A, 0x2B, 0x3C, 0x4D, 0x5E]);
    });
  });

  describe("equals, toString, toJSON", () => {
    test("equals compara por octetos", () => {
      const a = new MacAddress("aa:bb:cc:dd:ee:ff");
      const b = new MacAddress("aa:bb:cc:dd:ee:ff");
      const c = new MacAddress("00:11:22:33:44:55");
      expect(a.equals(b)).toBe(true);
      expect(a.equals(c)).toBe(false);
    });

    test("equals es case-insensitive", () => {
      const a = new MacAddress("AA:BB:CC:DD:EE:FF");
      const b = new MacAddress("aa:bb:cc:dd:ee:ff");
      expect(a.equals(b)).toBe(true);
    });

    test("toString retorna valor en colon format", () => {
      expect(new MacAddress("aa:bb:cc:dd:ee:ff").toString()).toBe("AA:BB:CC:DD:EE:FF");
    });

    test("toJSON retorna string", () => {
      expect(new MacAddress("aa:bb:cc:dd:ee:ff").toJSON()).toBe("AA:BB:CC:DD:EE:FF");
    });
  });

  describe("helper functions", () => {
    test("parseMacAddress crea MacAddress", () => {
      expect(parseMacAddress("aa:bb:cc:dd:ee:ff").value).toBe("AA:BB:CC:DD:EE:FF");
    });

    test("isValidMacAddress sin lanzar error", () => {
      expect(isValidMacAddress("aa:bb:cc:dd:ee:ff")).toBe(true);
      expect(isValidMacAddress("xyz")).toBe(false);
      expect(isValidMacAddress("")).toBe(false);
    });
  });
});
