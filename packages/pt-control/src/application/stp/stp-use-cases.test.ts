import { describe, it, expect } from "bun:test";
import {
  validateStpMode,
  buildStpModeCommands,
  buildStpRootCommands,
  validateVlanId,
  validatePriority,
  parseVlanIdsFromString,
  parsePriority,
} from "./stp-use-cases";

describe("STP Use Cases", () => {
  describe("validateStpMode", () => {
    it("acepta pvst", () => {
      const result = validateStpMode("pvst");
      expect(result.ok).toBe(true);
    });

    it("acepta rapid-pvst", () => {
      const result = validateStpMode("rapid-pvst");
      expect(result.ok).toBe(true);
    });

    it("acepta mst", () => {
      const result = validateStpMode("mst");
      expect(result.ok).toBe(true);
    });

    it("rechaza modo inválido", () => {
      const result = validateStpMode("invalid");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors[0]?.message).toContain("Modo inválido");
      }
    });
  });

  describe("buildStpModeCommands", () => {
    it("genera comandos para pvst", () => {
      const commands = buildStpModeCommands("pvst");
      expect(commands.length).toBeGreaterThan(0);
      expect(commands.some((c) => c.includes("pvst"))).toBe(true);
    });

    it("genera comandos para rapid-pvst", () => {
      const commands = buildStpModeCommands("rapid-pvst");
      expect(commands.length).toBeGreaterThan(0);
    });
  });

  describe("buildStpRootCommands", () => {
    it("genera comandos para root bridge", () => {
      const commands = buildStpRootCommands([1], undefined, true, false);
      expect(commands.length).toBeGreaterThan(0);
    });

    it("maneja múltiples VLANs", () => {
      const commands = buildStpRootCommands([1, 10, 20]);
      expect(commands.length).toBeGreaterThan(0);
    });
  });

  describe("validateVlanId", () => {
    it("acepta VLAN válida", () => {
      expect(validateVlanId(1)).toBe(true);
      expect(validateVlanId(100)).toBe(true);
      expect(validateVlanId(4094)).toBe(true);
    });

    it("rechaza VLAN inválida", () => {
      expect(validateVlanId(0)).toBe(false);
      expect(validateVlanId(-1)).toBe(false);
      expect(validateVlanId(4095)).toBe(false);
      expect(validateVlanId(NaN)).toBe(false);
    });
  });

  describe("validatePriority", () => {
    it("acepta prioridad válida", () => {
      expect(validatePriority(4096)).toBe(true);
      expect(validatePriority(8192)).toBe(true);
      expect(validatePriority(0)).toBe(true);
      expect(validatePriority(61440)).toBe(true);
    });

    it("rechaza prioridad inválida", () => {
      expect(validatePriority(1000)).toBe(false);
      expect(validatePriority(5000)).toBe(false);
      expect(validatePriority(65535)).toBe(false);
      expect(validatePriority(NaN)).toBe(false);
    });
  });

  describe("parseVlanIdsFromString", () => {
    it("parsea VLAN simple", () => {
      const result = parseVlanIdsFromString("10");
      expect(result).toEqual([10]);
    });

    it("parsea múltiples VLANs", () => {
      const result = parseVlanIdsFromString("1,10,20,30");
      expect(result).toEqual([1, 10, 20, 30]);
    });

    it("ignora VLANs inválidas", () => {
      const result = parseVlanIdsFromString("1,abc,99999,20");
      expect(result).toEqual([1, 20]);
    });
  });

  describe("parsePriority", () => {
    it("parsea prioridad válida", () => {
      expect(parsePriority("4096")).toBe(4096);
      expect(parsePriority("8192")).toBe(8192);
    });

    it("devuelve undefined para valor vacío", () => {
      expect(parsePriority(undefined)).toBeUndefined();
    });

    it("devuelve undefined para valor inválido", () => {
      expect(parsePriority("invalid")).toBeUndefined();
    });
  });
});