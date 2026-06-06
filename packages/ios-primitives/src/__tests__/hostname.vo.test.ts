import { describe, expect, test } from "bun:test";
import {
  Hostname,
  parseHostname,
  parseOptionalHostname,
  isValidHostname,
} from "../domain/ios/value-objects/hostname.vo.js";

describe("Hostname", () => {
  describe("construcción", () => {
    test("crea Hostname con nombre simple", () => {
      const h = Hostname.from("SW1");
      expect(h.value).toBe("SW1");
    });

    test("crea Hostname con FQDN", () => {
      const h = Hostname.from("router1.empresa.local");
      expect(h.value).toBe("router1.empresa.local");
    });

    test("crea Hostname con guiones", () => {
      const h = Hostname.from("core-router-01");
      expect(h.value).toBe("core-router-01");
    });

    test("crea Hostname con guiones bajos", () => {
      const h = Hostname.from("core_router_01");
      expect(h.value).toBe("core_router_01");
    });

    test("lanza DomainError para string vacío", () => {
      expect(() => Hostname.from("")).toThrow("vacío");
    });

    test("lanza DomainError para exceso de longitud (más de 63)", () => {
      expect(() => Hostname.from("a".repeat(64))).toThrow("63 caracteres");
    });

    test("lanza DomainError para caracteres inválidos", () => {
      expect(() => Hostname.from("router@01")).toThrow("debe comenzar");
    });

    test("lanza DomainError si comienza con número", () => {
      expect(() => Hostname.from("1router")).toThrow("debe comenzar");
    });

    test("normaliza espacios en blanco", () => {
      const h = Hostname.from("  SW1  ");
      expect(h.value).toBe("SW1");
    });
  });

  describe("factory methods", () => {
    test("tryFrom retorna Hostname para valor válido", () => {
      expect(Hostname.tryFrom("SW1")).toBeInstanceOf(Hostname);
    });

    test("tryFrom retorna null para valor inválido", () => {
      expect(Hostname.tryFrom("")).toBeNull();
    });

    test("isValid retorna booleano", () => {
      expect(Hostname.isValid("SW1")).toBe(true);
      expect(Hostname.isValid("")).toBe(false);
    });

    test("fromOptional retorna null para null/undefined/vacío", () => {
      expect(Hostname.fromOptional(null)).toBeNull();
      expect(Hostname.fromOptional(undefined)).toBeNull();
      expect(Hostname.fromOptional("")).toBeNull();
    });

    test("fromOptional retorna Hostname para valor válido", () => {
      expect(Hostname.fromOptional("SW1")).toBeInstanceOf(Hostname);
    });
  });

  describe("propiedades de dominio", () => {
    test("hostnameOnly retorna el primer componente antes del punto", () => {
      const h = Hostname.from("router1.empresa.local");
      expect(h.hostnameOnly).toBe("router1");
    });

    test("hostnameOnly retorna el mismo valor si no hay punto", () => {
      const h = Hostname.from("SW1");
      expect(h.hostnameOnly).toBe("SW1");
    });

    test("domain retorna el dominio completo", () => {
      const h = Hostname.from("router1.empresa.local");
      expect(h.domain).toBe("empresa.local");
    });

    test("domain retorna null para nombre simple", () => {
      const h = Hostname.from("SW1");
      expect(h.domain).toBeNull();
    });

    test("isFullyQualified es true si contiene punto", () => {
      expect(Hostname.from("router1.empresa.local").isFullyQualified).toBe(true);
      expect(Hostname.from("SW1").isFullyQualified).toBe(false);
    });

    test("isSimpleName es true si NO tiene punto", () => {
      expect(Hostname.from("SW1").isSimpleName).toBe(true);
      expect(Hostname.from("router1.empresa.local").isSimpleName).toBe(false);
    });
  });

  describe("métodos de comando IOS", () => {
    test("toCommand retorna comando hostname", () => {
      expect(Hostname.from("SW1").toCommand()).toBe("hostname SW1");
    });

    test("toNoCommand retorna 'no hostname'", () => {
      expect(Hostname.from("SW1").toNoCommand()).toBe("no hostname");
    });

    test("toPrompt genera prompt de IOS", () => {
      const h = Hostname.from("SW1");
      expect(h.toPrompt("user-exec")).toBe("SW1>");
      expect(h.toPrompt("priv-exec")).toBe("SW1#");
      expect(h.toPrompt("config")).toBe("SW1#");
    });
  });

  describe("métodos de dominio", () => {
    test("isSameDomain compara dominios", () => {
      const a = Hostname.from("r1.empresa.local");
      const b = Hostname.from("r2.empresa.local");
      const c = Hostname.from("r1.otro.local");
      expect(a.isSameDomain(b)).toBe(true);
      expect(a.isSameDomain(c)).toBe(false);
    });

    test("withDomain agrega dominio si no tiene", () => {
      const h = Hostname.from("r1");
      const expanded = h.withDomain("empresa.local");
      expect(expanded.value).toBe("r1.empresa.local");
    });

    test("withDomain no modifica si ya es FQDN", () => {
      const h = Hostname.from("r1.empresa.local");
      expect(h.withDomain("otro.local").value).toBe("r1.empresa.local");
    });

    test("toDnsName reemplaza guiones bajos por guiones", () => {
      expect(Hostname.from("core_router_01").toDnsName()).toBe("core-router-01");
      expect(Hostname.from("SW1").toDnsName()).toBe("SW1");
    });
  });

  describe("equals, toString, toJSON", () => {
    test("equals es case-insensitive", () => {
      const a = Hostname.from("SW1");
      const b = Hostname.from("sw1");
      expect(a.equals(b)).toBe(true);
    });

    test("toString retorna el hostname", () => {
      expect(Hostname.from("SW1").toString()).toBe("SW1");
    });

    test("toJSON retorna el string", () => {
      expect(Hostname.from("SW1").toJSON()).toBe("SW1");
    });
  });

  describe("helper functions", () => {
    test("parseHostname crea Hostname", () => {
      expect(parseHostname("SW1").value).toBe("SW1");
    });

    test("parseOptionalHostname retorna null para vacío", () => {
      expect(parseOptionalHostname(null)).toBeNull();
    });

    test("isValidHostname sin lanzar error", () => {
      expect(isValidHostname("SW1")).toBe(true);
      expect(isValidHostname("")).toBe(false);
    });
  });
});
