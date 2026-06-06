import { describe, expect, test } from "bun:test";
import {
  Ipv4Address,
  SubnetMask,
  parseIpv4Address,
  isValidIpv4Address,
  parseSubnetMask,
  isValidSubnetMask,
} from "../domain/ios/value-objects/ipv4-address.vo.js";

describe("Ipv4Address", () => {
  describe("construcción", () => {
    test("crea Ipv4Address con dirección válida", () => {
      const ip = new Ipv4Address("192.168.1.1");
      expect(ip.value).toBe("192.168.1.1");
    });

    test("lanza DomainError para menos de 4 octetos", () => {
      expect(() => new Ipv4Address("192.168.1")).toThrow("expected 4 octets");
    });

    test("lanza DomainError para más de 4 octetos", () => {
      expect(() => new Ipv4Address("192.168.1.1.5")).toThrow("expected 4 octets");
    });

    test("lanza DomainError para octeto fuera de rango", () => {
      expect(() => new Ipv4Address("192.168.1.256")).toThrow("octet");
      expect(() => new Ipv4Address("192.168.-1.1")).toThrow("octet");
    });

    test("lanza DomainError para octeto con leading zeros que cambian valor", () => {
      expect(() => new Ipv4Address("192.168.01.1")).toThrow("octet");
    });

    test("lanza DomainError para string vacío", () => {
      expect(() => new Ipv4Address("")).toThrow("expected 4 octets");
    });

    test("normaliza espacios en blanco", () => {
      const ip = new Ipv4Address("  10.0.0.1  ");
      expect(ip.value).toBe("10.0.0.1");
    });
  });

  describe("factory methods", () => {
    test("fromJSON crea desde string", () => {
      const ip = Ipv4Address.fromJSON("10.0.0.1");
      expect(ip).toBeInstanceOf(Ipv4Address);
      expect(ip.value).toBe("10.0.0.1");
    });
  });

  describe("octets", () => {
    test("retorna los 4 octetos", () => {
      const ip = new Ipv4Address("192.168.1.10");
      expect(ip.octets).toEqual([192, 168, 1, 10]);
    });
  });

  describe("clasificación de direcciones", () => {
    test("isPrivate detecta RFC 1918 (10.0.0.0/8)", () => {
      expect(new Ipv4Address("10.0.0.1").isPrivate).toBe(true);
      expect(new Ipv4Address("10.255.255.255").isPrivate).toBe(true);
    });

    test("isPrivate detecta RFC 1918 (172.16.0.0/12)", () => {
      expect(new Ipv4Address("172.16.0.1").isPrivate).toBe(true);
      expect(new Ipv4Address("172.31.255.255").isPrivate).toBe(true);
      expect(new Ipv4Address("172.32.0.1").isPrivate).toBe(false);
    });

    test("isPrivate detecta RFC 1918 (192.168.0.0/16)", () => {
      expect(new Ipv4Address("192.168.0.1").isPrivate).toBe(true);
      expect(new Ipv4Address("192.168.255.255").isPrivate).toBe(true);
    });

    test("isPrivate retorna false para IP pública", () => {
      expect(new Ipv4Address("8.8.8.8").isPrivate).toBe(false);
    });

    test("isLoopback detecta 127.0.0.0/8", () => {
      expect(new Ipv4Address("127.0.0.1").isLoopback).toBe(true);
      expect(new Ipv4Address("127.255.255.255").isLoopback).toBe(true);
      expect(new Ipv4Address("192.168.1.1").isLoopback).toBe(false);
    });

    test("isApipa detecta 169.254.0.0/16", () => {
      expect(new Ipv4Address("169.254.1.1").isApipa).toBe(true);
      expect(new Ipv4Address("169.254.254.254").isApipa).toBe(true);
      expect(new Ipv4Address("169.255.1.1").isApipa).toBe(false);
    });

    test("isMulticast detecta 224.0.0.0/4", () => {
      expect(new Ipv4Address("224.0.0.1").isMulticast).toBe(true);
      expect(new Ipv4Address("239.255.255.255").isMulticast).toBe(true);
      expect(new Ipv4Address("192.168.1.1").isMulticast).toBe(false);
    });

    test("isBroadcast detecta 255.255.255.255", () => {
      expect(new Ipv4Address("255.255.255.255").isBroadcast).toBe(true);
      expect(new Ipv4Address("192.168.1.1").isBroadcast).toBe(false);
    });

    test("isUnicast no incluye broadcast, multicast, loopback, apipa", () => {
      expect(new Ipv4Address("8.8.8.8").isUnicast).toBe(true);
      expect(new Ipv4Address("255.255.255.255").isUnicast).toBe(false);
      expect(new Ipv4Address("224.0.0.1").isUnicast).toBe(false);
      expect(new Ipv4Address("127.0.0.1").isUnicast).toBe(false);
      expect(new Ipv4Address("169.254.1.1").isUnicast).toBe(false);
    });
  });

  describe("toInt", () => {
    test("convierte 0.0.0.0 a 0", () => {
      expect(new Ipv4Address("0.0.0.0").toInt()).toBe(0);
    });

    test("convierte 192.168.1.1 correctamente", () => {
      expect(new Ipv4Address("192.168.1.1").toInt()).toBe(0xC0A80101);
    });

    test("convierte 255.255.255.255 a 4294967295", () => {
      expect(new Ipv4Address("255.255.255.255").toInt()).toBe(4294967295);
    });
  });

  describe("getSubnetAddress", () => {
    test("calcula subred para /24", () => {
      const ip = new Ipv4Address("192.168.1.100");
      expect(ip.getSubnetAddress(24).value).toBe("192.168.1.0");
    });

    test("calcula subred para /16", () => {
      const ip = new Ipv4Address("10.10.10.10");
      expect(ip.getSubnetAddress(16).value).toBe("10.10.0.0");
    });

    test("lanza error para prefix fuera de rango", () => {
      const ip = new Ipv4Address("192.168.1.1");
      expect(() => ip.getSubnetAddress(33)).toThrow("0-32");
    });
  });

  describe("equals, toString, toJSON", () => {
    test("equals compara por valor", () => {
      const a = new Ipv4Address("192.168.1.1");
      const b = new Ipv4Address("192.168.1.1");
      const c = new Ipv4Address("10.0.0.1");
      expect(a.equals(b)).toBe(true);
      expect(a.equals(c)).toBe(false);
    });

    test("toString retorna la dirección", () => {
      expect(new Ipv4Address("10.0.0.1").toString()).toBe("10.0.0.1");
    });

    test("toJSON retorna el string", () => {
      expect(new Ipv4Address("10.0.0.1").toJSON()).toBe("10.0.0.1");
    });
  });

  describe("helper functions", () => {
    test("parseIpv4Address crea Ipv4Address", () => {
      expect(parseIpv4Address("10.0.0.1").value).toBe("10.0.0.1");
    });

    test("isValidIpv4Address sin lanzar error", () => {
      expect(isValidIpv4Address("10.0.0.1")).toBe(true);
      expect(isValidIpv4Address("999.999.999.999")).toBe(false);
    });
  });
});

describe("SubnetMask", () => {
  describe("construcción", () => {
    test("crea SubnetMask con máscara válida", () => {
      const mask = new SubnetMask("255.255.255.0");
      expect(mask.value).toBe("255.255.255.0");
    });

    test("lanza DomainError para máscara inválida", () => {
      expect(() => new SubnetMask("255.255.255.1")).toThrow("valid mask");
      expect(() => new SubnetMask("0.0.0.1")).toThrow("valid mask");
    });
  });

  describe("factory methods", () => {
    test("fromCidr crea desde prefijo CIDR", () => {
      const mask = SubnetMask.fromCidr(24);
      expect(mask.value).toBe("255.255.255.0");
    });

    test("fromCidr con /0 da 0.0.0.0", () => {
      const mask = SubnetMask.fromCidr(0);
      expect(mask.value).toBe("0.0.0.0");
    });

    test("fromJSON crea desde string", () => {
      const mask = SubnetMask.fromJSON("255.0.0.0");
      expect(mask.value).toBe("255.0.0.0");
    });
  });

  describe("propiedades", () => {
    test("cidr retorna prefijo correcto", () => {
      expect(new SubnetMask("255.255.255.0").cidr).toBe(24);
      expect(new SubnetMask("255.255.0.0").cidr).toBe(16);
      expect(new SubnetMask("255.0.0.0").cidr).toBe(8);
    });

    test("cidrPrefix retorna CidrPrefix", () => {
      const mask = new SubnetMask("255.255.255.0");
      expect(mask.cidrPrefix.value).toBe(24);
    });

    test("wildcardMask calcula inversa", () => {
      expect(new SubnetMask("255.255.255.0").wildcardMask).toBe("0.0.0.255");
      expect(new SubnetMask("255.255.0.0").wildcardMask).toBe("0.0.255.255");
    });

    test("usableHosts retorna hosts utilizables", () => {
      expect(new SubnetMask("255.255.255.0").usableHosts).toBe(254);
      expect(new SubnetMask("255.255.255.252").usableHosts).toBe(2);
    });

    test("isValidForHosts es false para /31 y /32", () => {
      expect(new SubnetMask("255.255.255.254").isValidForHosts).toBe(false);
      expect(new SubnetMask("255.255.255.255").isValidForHosts).toBe(false);
    });

    test("toCidrString retorna formato /N", () => {
      expect(new SubnetMask("255.255.255.0").toCidrString()).toBe("/24");
    });
  });

  describe("helper functions", () => {
    test("parseSubnetMask crea SubnetMask", () => {
      expect(parseSubnetMask("255.255.255.0").value).toBe("255.255.255.0");
    });

    test("isValidSubnetMask sin lanzar error", () => {
      expect(isValidSubnetMask("255.255.255.0")).toBe(true);
      expect(isValidSubnetMask("255.255.255.1")).toBe(false);
    });
  });
});
