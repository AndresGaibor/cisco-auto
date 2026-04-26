// ============================================================================
// Capability Registry Tests
// ============================================================================

import { describe, expect, test } from "bun:test";
import {
  getCapability,
  listCapabilities,
  filterCapabilities,
  capabilityExists,
} from "../../omni/capability-registry.js";

describe("capability-registry", () => {
  describe("getCapability", () => {
    test("returns correct capability by id", () => {
      const cap = getCapability("device.add");
      expect(cap).toBeDefined();
      expect(cap!.id).toBe("device.add");
      expect(cap!.domain).toBe("device");
      expect(cap!.risk).toBe("safe");
    });

    test("returns undefined for unknown id", () => {
      const cap = getCapability("nonexistent.capability");
      expect(cap).toBeUndefined();
    });

    test("can retrieve omni capabilities", () => {
      const cap = getCapability("omni.device.serialize");
      expect(cap).toBeDefined();
      expect(cap!.kind).toBe("hack");
    });

    test("can retrieve terminal capabilities", () => {
      const cap = getCapability("terminal.show-version");
      expect(cap).toBeDefined();
      expect(cap!.domain).toBe("terminal");
    });
  });

  describe("listCapabilities", () => {
    test("returns all capabilities", () => {
      const all = listCapabilities();
      expect(all.length).toBeGreaterThan(40);
    });

    test("each capability has required fields", () => {
      const all = listCapabilities();
      for (const cap of all) {
        expect(cap.id).toBeDefined();
        expect(cap.title).toBeDefined();
        expect(cap.domain).toBeDefined();
        expect(cap.kind).toBeDefined();
        expect(cap.risk).toBeDefined();
        expect(cap.description).toBeDefined();
        expect(cap.tags).toBeDefined();
        expect(Array.isArray(cap.tags)).toBe(true);
        expect(cap.prerequisites).toBeDefined();
        expect(Array.isArray(cap.prerequisites)).toBe(true);
        expect(cap.supportPolicy).toBeDefined();
      }
    });

    test("all capabilities have unique ids", () => {
      const all = listCapabilities();
      const ids = all.map((c) => c.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe("filterCapabilities", () => {
    test("filters by domain", () => {
      const devices = filterCapabilities({ domain: "device" });
      expect(devices.length).toBeGreaterThan(0);
      for (const cap of devices) {
        expect(cap.domain).toBe("device");
      }
    });

    test("filters by kind", () => {
      const hacks = filterCapabilities({ kind: "hack" });
      expect(hacks.length).toBeGreaterThan(0);
      for (const cap of hacks) {
        expect(cap.kind).toBe("hack");
      }
    });

    test("filters by risk", () => {
      const safe = filterCapabilities({ risk: "safe" });
      expect(safe.length).toBeGreaterThan(0);
      for (const cap of safe) {
        expect(cap.risk).toBe("safe");
      }
    });

    test("combines multiple filters", () => {
      const result = filterCapabilities({ domain: "terminal", risk: "safe" });
      for (const cap of result) {
        expect(cap.domain).toBe("terminal");
        expect(cap.risk).toBe("safe");
      }
    });

    test("returns empty array for non-matching filters", () => {
      const result = filterCapabilities({ domain: "nonexistent-domain-12345" });
      expect(result.length).toBe(0);
    });
  });

  describe("capabilityExists", () => {
    test("returns true for existing capability", () => {
      expect(capabilityExists("device.add")).toBe(true);
      expect(capabilityExists("terminal.show-version")).toBe(true);
      expect(capabilityExists("workflow.vlan.simple")).toBe(true);
    });

    test("returns false for non-existing capability", () => {
      expect(capabilityExists("nonexistent.capability")).toBe(false);
    });
  });

  describe("capability IDs are unique", () => {
    test("no duplicate capability IDs", () => {
      const all = listCapabilities();
      const ids = all.map((c) => c.id);
      const seen = new Set<string>();
      const duplicates: string[] = [];

      for (const id of ids) {
        if (seen.has(id)) {
          duplicates.push(id);
        }
        seen.add(id);
      }

      expect(duplicates).toEqual([]);
    });
  });

  describe("capability properties", () => {
    test("all capabilities have non-empty descriptions", () => {
      const all = listCapabilities();
      for (const cap of all) {
        expect(cap.description.length).toBeGreaterThan(0);
      }
    });

    test("all capabilities have at least one tag", () => {
      const all = listCapabilities();
      for (const cap of all) {
        expect(cap.tags.length).toBeGreaterThan(0);
      }
    });

    test("safe capabilities have reasonable timeouts", () => {
      const safe = filterCapabilities({ risk: "safe" });
      for (const cap of safe) {
        expect(cap.supportPolicy.timeoutMs).toBeLessThan(120000);
      }
    });

    test("dangerous capabilities are marked correctly", () => {
      const dangerous = filterCapabilities({ risk: "dangerous" });
      for (const cap of dangerous) {
        expect(cap.risk).toBe("dangerous");
        expect(cap.kind).toBe("hack");
      }
    });
  });
});