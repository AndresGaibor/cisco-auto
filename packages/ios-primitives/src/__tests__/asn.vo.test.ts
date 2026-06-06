import { describe, expect, test } from "bun:test";
import {
  Asn,
  parseAsn,
  isValidAsn,
} from "../domain/ios/value-objects/asn.vo.js";

describe("Asn", () => {
  describe("construcción", () => {
    test("create4Byte crea ASN dentro de rango 4-byte", () => {
      const asn = Asn.create4Byte(65000);
      expect(asn.value).toBe(65000);
    });

    test("create4Byte lanza DomainError para valor negativo", () => {
      expect(() => Asn.create4Byte(-1)).toThrow("ASN");
    });

    test("create4Byte lanza DomainError para valor > 4294967295", () => {
      expect(() => Asn.create4Byte(4294967296)).toThrow("ASN");
    });

    test("create4Byte lanza DomainError para valor no entero", () => {
      expect(() => Asn.create4Byte(1.5)).toThrow("entero");
    });

    test("create2Byte crea ASN dentro de rango 2-byte", () => {
      const asn = Asn.create2Byte(100);
      expect(asn.value).toBe(100);
    });

    test("create2Byte lanza DomainError para valor > 65535", () => {
      expect(() => Asn.create2Byte(65536)).toThrow("ASN");
    });
  });

  describe("factory methods", () => {
    test("from crea ASN (usa create4Byte)", () => {
      const asn = Asn.from(65000);
      expect(asn.value).toBe(65000);
    });

    test("tryFrom retorna Asn para valor válido", () => {
      expect(Asn.tryFrom(65000)).toBeInstanceOf(Asn);
      expect(Asn.tryFrom("65000")).toBeInstanceOf(Asn);
    });

    test("tryFrom retorna null para valor inválido", () => {
      expect(Asn.tryFrom(-1)).toBeNull();
      expect(Asn.tryFrom("abc")).toBeNull();
    });

    test("isValid retorna booleano", () => {
      expect(Asn.isValid(65000)).toBe(true);
      expect(Asn.isValid(-1)).toBe(false);
    });
  });

  describe("clasificación", () => {
    test("is2Byte retorna true para ASN <= 65535", () => {
      expect(Asn.from(64500).is2Byte).toBe(true);
      expect(Asn.from(65535).is2Byte).toBe(true);
    });

    test("is4Byte retorna true para ASN > 65535", () => {
      expect(Asn.from(70000).is4Byte).toBe(true);
      expect(Asn.from(4294967295).is4Byte).toBe(true);
    });

    test("isPrivate para 2-byte (64512-65535)", () => {
      expect(Asn.from(64512).isPrivate).toBe(true);
      expect(Asn.from(65535).isPrivate).toBe(true);
      expect(Asn.from(64511).isPrivate).toBe(false);
    });

    test("isPrivate para 4-byte (4200000000-4294967295)", () => {
      expect(Asn.from(4200000000).isPrivate).toBe(true);
      expect(Asn.from(4294967295).isPrivate).toBe(true);
      expect(Asn.from(4199999999).isPrivate).toBe(false);
    });

    test("isPublic es inverso de isPrivate", () => {
      expect(Asn.from(100).isPublic).toBe(true);
      expect(Asn.from(64512).isPublic).toBe(false);
    });

    test("isReserved para 0 o 65535", () => {
      expect(Asn.from(0).isReserved).toBe(true);
      expect(Asn.from(65535).isReserved).toBe(true);
      expect(Asn.from(100).isReserved).toBe(false);
    });
  });

  describe("formateo", () => {
    test("toDotNotation para ASN 2-byte retorna string simple", () => {
      expect(Asn.from(65000).toDotNotation()).toBe("65000");
    });

    test("toDotNotation para ASN 4-byte retorna high.low", () => {
      expect(Asn.from(65536).toDotNotation()).toBe("1.0");
      expect(Asn.from(131072).toDotNotation()).toBe("2.0");
    });

    test("toAsplain retorna string simple", () => {
      expect(Asn.from(65000).toAsplain()).toBe("65000");
      expect(Asn.from(4294967295).toAsplain()).toBe("4294967295");
    });
  });

  describe("equals, toString, toJSON", () => {
    test("equals compara por valor", () => {
      const a = Asn.from(65000);
      const b = Asn.from(65000);
      const c = Asn.from(65001);
      expect(a.equals(b)).toBe(true);
      expect(a.equals(c)).toBe(false);
    });

    test("toString retorna string del número", () => {
      expect(Asn.from(65000).toString()).toBe("65000");
    });

    test("toJSON retorna el número", () => {
      expect(Asn.from(65000).toJSON()).toBe(65000);
    });
  });

  describe("helper functions", () => {
    test("parseAsn desde número", () => {
      expect(parseAsn(65000).value).toBe(65000);
    });

    test("parseAsn desde string", () => {
      expect(parseAsn("65000").value).toBe(65000);
    });

    test("parseAsn lanza error para NaN", () => {
      expect(() => parseAsn("abc")).toThrow("no es un número válido");
    });

    test("isValidAsn sin lanzar error", () => {
      expect(isValidAsn(65000)).toBe(true);
      expect(isValidAsn(-1)).toBe(false);
      expect(isValidAsn("abc")).toBe(false);
    });
  });
});
