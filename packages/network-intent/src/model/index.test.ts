import { describe, expect, test } from "bun:test";
import {
  toDeviceType,
  toSwitchportMode,
  toCableType,
  toLabSpec,
  validateLabSafe,
  analyzeTopology,
  generateMermaidDiagram,
  visualizeTopology,
  type LabSpec,
  type ParsedLabYaml,
} from "./index";

describe("network-intent model", () => {
  describe("toDeviceType", () => {
    test("converts valid device types", () => {
      expect(toDeviceType("router")).toBe("router");
      expect(toDeviceType("switch")).toBe("switch");
      expect(toDeviceType("pc")).toBe("pc");
      expect(toDeviceType("SERVER")).toBe("server");
    });

    test("defaults to router for unknown types", () => {
      expect(toDeviceType("unknown")).toBe("router");
      expect(toDeviceType(undefined)).toBe("router");
    });
  });

  describe("toSwitchportMode", () => {
    test("converts valid switchport modes", () => {
      expect(toSwitchportMode("access")).toBe("access");
      expect(toSwitchportMode("trunk")).toBe("trunk");
      expect(toSwitchportMode("DYNAMIC")).toBe("dynamic");
    });

    test("returns undefined for unknown modes", () => {
      expect(toSwitchportMode("unknown")).toBeUndefined();
      expect(toSwitchportMode(undefined)).toBeUndefined();
    });
  });

  describe("toCableType", () => {
    test("converts valid cable types", () => {
      expect(toCableType("straight-through")).toBe("straight-through");
      expect(toCableType("crossover")).toBe("crossover");
      expect(toCableType("ROLLover")).toBe("rollover");
    });

    test("defaults to straight-through for unknown types", () => {
      expect(toCableType("unknown")).toBe("straight-through");
      expect(toCableType(undefined)).toBe("straight-through");
    });
  });

  describe("toLabSpec", () => {
    test("converts simple YAML to LabSpec", () => {
      const parsed: ParsedLabYaml = {
        name: "Test Lab",
        devices: [
          {
            name: "Router1",
            type: "router",
            hostname: "Router1",
          },
          {
            name: "Switch1",
            type: "switch",
            hostname: "Switch1",
          },
        ],
        links: [
          {
            from: { device: "Router1", port: "Gig0/0" },
            to: { device: "Switch1", port: "Gig0/1" },
          },
        ],
      };

      const spec = toLabSpec(parsed);

      expect(spec.metadata.name).toBe("Test Lab");
      expect(spec.devices).toHaveLength(2);
      expect(spec.connections).toHaveLength(1);
      expect(spec.devices[0]?.name).toBe("Router1");
      expect(spec.devices[0]?.type).toBe("router");
    });

    test("handles nested lab structure", () => {
      const parsed: ParsedLabYaml = {
        lab: {
          metadata: { name: "Nested Lab", version: "2.0", author: "Test" },
          topology: {
            devices: [{ name: "R1", type: "router" }],
            connections: [],
          },
        },
      };

      const spec = toLabSpec(parsed);

      expect(spec.metadata.name).toBe("Nested Lab");
      expect(spec.metadata.version).toBe("2.0");
      expect(spec.devices).toHaveLength(1);
    });
  });

  describe("validateLabSafe", () => {
    test("returns success for valid lab", () => {
      const parsed: ParsedLabYaml = {
        devices: [{ name: "Router1", type: "router" }],
        links: [],
      };

      const result = validateLabSafe(parsed);

      expect(result.success).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    test("returns error for empty devices", () => {
      const parsed: ParsedLabYaml = {
        devices: [],
        links: [],
      };

      const result = validateLabSafe(parsed);

      expect(result.success).toBe(false);
      expect(result.errors).toContain("No hay dispositivos definidos");
    });

    test("returns error for duplicate devices", () => {
      const parsed: ParsedLabYaml = {
        devices: [
          { name: "Router1", type: "router" },
          { name: "Router1", type: "router" },
        ],
        links: [],
      };

      const result = validateLabSafe(parsed);

      expect(result.success).toBe(false);
      expect(result.errors).toContain("Dispositivo duplicado: Router1");
    });

    test("returns error for invalid link references", () => {
      const parsed: ParsedLabYaml = {
        devices: [{ name: "Router1", type: "router" }],
        links: [{ from: { device: "NonExistent", port: "Gig0/0" }, to: { device: "Router1", port: "Gig0/1" } }],
      };

      const result = validateLabSafe(parsed);

      expect(result.success).toBe(false);
      expect(result.errors).toContain("Dispositivo origen no existe: NonExistent");
    });
  });

  describe("analyzeTopology", () => {
    test("calculates correct statistics", () => {
      const spec: LabSpec = {
        metadata: { name: "Test", version: "1.0", author: "Test", createdAt: new Date() },
        devices: [
          { id: "R1", name: "Router1", type: "router", hostname: "R1" },
          { id: "S1", name: "Switch1", type: "switch", hostname: "S1" },
          { id: "S2", name: "Switch2", type: "switch", hostname: "S2" },
        ],
        connections: [
          { id: "1", from: { deviceId: "R1", deviceName: "Router1", port: "Gig0/0" }, to: { deviceId: "S1", deviceName: "Switch1", port: "Gig0/1" } },
          { id: "2", from: { deviceId: "R1", deviceName: "Router1", port: "Gig0/1" }, to: { deviceId: "S2", deviceName: "Switch2", port: "Gig0/1" } },
        ],
      };

      const stats = analyzeTopology(spec);

      expect(stats.deviceCount).toBe(3);
      expect(stats.connectionCount).toBe(2);
      expect(stats.deviceTypeDistribution).toEqual({ router: 1, switch: 2 });
      expect(stats.avgConnections).toBeCloseTo(1.33, 1);
    });
  });

  describe("generateMermaidDiagram", () => {
    test("generates valid mermaid syntax", () => {
      const spec: LabSpec = {
        metadata: { name: "Test", version: "1.0", author: "Test", createdAt: new Date() },
        devices: [
          { id: "R1", name: "Router1", type: "router", hostname: "R1" },
          { id: "S1", name: "Switch1", type: "switch", hostname: "S1" },
        ],
        connections: [
          { id: "1", from: { deviceId: "R1", deviceName: "Router1", port: "Gig0/0" }, to: { deviceId: "S1", deviceName: "Switch1", port: "Gig0/1" } },
        ],
      };

      const diagram = generateMermaidDiagram(spec);

      expect(diagram).toContain("graph TD");
      expect(diagram).toContain("Router1");
      expect(diagram).toContain("Switch1");
      expect(diagram).toContain("Router1 -->");
    });
  });

  describe("visualizeTopology", () => {
    test("generates text visualization", () => {
      const spec: LabSpec = {
        metadata: { name: "Test Lab", version: "1.0", author: "Test", createdAt: new Date() },
        devices: [
          { id: "R1", name: "Router1", type: "router", hostname: "R1" },
        ],
        connections: [],
      };

      const visualization = visualizeTopology(spec);

      expect(visualization).toContain("Test Lab");
      expect(visualization).toContain("Router1");
      expect(visualization).toContain("router");
    });
  });
});
