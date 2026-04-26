import { describe, expect, test } from "bun:test";
import {
  validateLabSpec,
  validateNetworkIntent,
  validateNetworkIntentFromYaml,
} from "./index";
import type { ParsedLabYaml } from "../model/index";

describe("network-intent validators", () => {
  describe("validateLabSpec", () => {
    test("validates a correct lab spec", () => {
      const parsed: ParsedLabYaml = {
        name: "Test Lab",
        devices: [{ name: "Router1", type: "router" }],
        links: [],
      };

      const result = validateLabSpec(parsed);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.stats).toBeDefined();
      expect(result.stats?.deviceCount).toBe(1);
    });

    test("returns errors for invalid lab spec", () => {
      const parsed: ParsedLabYaml = {
        devices: [],
        links: [],
      };

      const result = validateLabSpec(parsed);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("No hay dispositivos definidos");
    });

    test("returns topology stats for valid spec", () => {
      const parsed: ParsedLabYaml = {
        devices: [
          { name: "R1", type: "router" },
          { name: "S1", type: "switch" },
        ],
        links: [{ from: { device: "R1", port: "Gig0/0" }, to: { device: "S1", port: "Gig0/1" } }],
      };

      const result = validateLabSpec(parsed);

      expect(result.valid).toBe(true);
      expect(result.stats).toBeDefined();
      expect(result.stats?.deviceCount).toBe(2);
      expect(result.stats?.connectionCount).toBe(1);
    });
  });

  describe("validateNetworkIntent", () => {
    test("validates correct network intent", () => {
      const intent = {
        name: "Test Network",
        devices: [
          { name: "Core1", model: "2911", role: "core" },
          { name: "Access1", model: "2960", role: "access" },
        ],
        vlans: [{ id: 10, name: "Data" }],
      };

      const result = validateNetworkIntent(intent);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test("rejects invalid network intent", () => {
      const intent = {
        name: "Test",
        devices: [
          { name: "Core1", model: "2911", role: "invalid-role" },
        ],
      };

      const result = validateNetworkIntent(intent);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test("rejects network intent without name", () => {
      const intent = {
        devices: [],
      };

      const result = validateNetworkIntent(intent);

      expect(result.valid).toBe(false);
    });
  });

  describe("validateNetworkIntentFromYaml", () => {
    test("validates JSON string intent", () => {
      const yaml = JSON.stringify({
        name: "Test Network",
        devices: [{ name: "Core1", model: "2911", role: "core" }],
      });

      const result = validateNetworkIntentFromYaml(yaml);

      expect(result.valid).toBe(true);
    });

    test("rejects invalid JSON", () => {
      const result = validateNetworkIntentFromYaml("not valid json");

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain("JSON");
    });
  });
});
