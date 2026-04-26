import { describe, it, expect } from "bun:test";
import {
  parseAclType,
  validateAclName,
  validateDirection,
  validateInterface,
  buildAclCreateCommands,
  buildAclRuleCommand,
  buildAclApplyCommands,
} from "./acl-use-cases";

describe("ACL Use Cases", () => {
  describe("parseAclType", () => {
    it("parsea standard", () => {
      expect(parseAclType("standard")).toBe("standard");
    });

    it("parsea extended", () => {
      expect(parseAclType("extended")).toBe("extended");
    });

    it("default a standard para valor inválido", () => {
      expect(parseAclType("invalid")).toBe("standard");
    });
  });

  describe("validateAclName", () => {
    it("acepta nombre válido", () => {
      expect(validateAclName("MiACL")).toBe(true);
      expect(validateAclName("ACL-100")).toBe(true);
      expect(validateAclName("10")).toBe(true);
    });

    it("rechaza nombre vacío", () => {
      expect(validateAclName("")).toBe(false);
      expect(validateAclName("   ")).toBe(false);
    });

    it("rechaza nombre muy largo", () => {
      expect(validateAclName("a".repeat(65))).toBe(false);
    });
  });

  describe("validateDirection", () => {
    it("acepta in/out", () => {
      expect(validateDirection("in")).toBe(true);
      expect(validateDirection("out")).toBe(true);
    });

    it("rechaza dirección inválida", () => {
      expect(validateDirection("both")).toBe(false);
      expect(validateDirection("")).toBe(false);
    });
  });

  describe("validateInterface", () => {
    it("acepta interfaces válidas", () => {
      expect(validateInterface("GigabitEthernet0/0")).toBe(true);
      expect(validateInterface("FastEthernet0/1")).toBe(true);
      expect(validateInterface("Vlan1")).toBe(true);
      expect(validateInterface("Port-channel1")).toBe(true);
    });

    it("rechaza interfaz inválida", () => {
      expect(validateInterface("")).toBe(false);
      expect(validateInterface("invalid")).toBe(false);
    });
  });

  describe("buildAclCreateCommands", () => {
    it("genera comandos para ACL estándar", () => {
      const commands = buildAclCreateCommands("MiACL", "standard");
      expect(commands.length).toBeGreaterThan(0);
      expect(commands.some((c: string) => c.includes("access-list"))).toBe(true);
    });

    it("lanza error para nombre vacío", () => {
      expect(() => buildAclCreateCommands("", "standard")).toThrow();
    });
  });

  describe("buildAclRuleCommand", () => {
    it("genera comando de regla", () => {
      const cmd = buildAclRuleCommand("MiACL", "permit ip any any");
      expect(cmd).toContain("access-list");
      expect(cmd).toContain("MiACL");
      expect(cmd).toContain("permit");
    });
  });

  describe("buildAclApplyCommands", () => {
    it("genera comandos de aplicación", () => {
      const commands = buildAclApplyCommands("MiACL", "GigabitEthernet0/0", "in");
      expect(commands).toContain("interface GigabitEthernet0/0");
      expect(commands).toContain("ip access-group MiACL in");
    });

    it("lanza error para dirección inválida", () => {
      expect(() => buildAclApplyCommands("MiACL", "Gi0/0", "in")).toThrow();
    });
  });
});