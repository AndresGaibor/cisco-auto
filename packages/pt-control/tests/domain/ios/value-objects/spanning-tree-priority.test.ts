// ============================================================================
// SpanningTreePriority Value Object Tests
// ============================================================================

import { describe, it, expect } from "bun:test";
import {
  SpanningTreePriority,
  parseSpanningTreePriority,
  isValidSpanningTreePriority,
} from "@cisco-auto/kernel/domain/ios/value-objects";

describe("SpanningTreePriority", () => {
  describe("constructor", () => {
    it("should create valid priority values", () => {
      const priority = new SpanningTreePriority(32768);
      expect(priority.value).toBe(32768);
    });

    it("should accept all valid priority values", () => {
      const validPriorities = [0, 4096, 8192, 12288, 16384, 20488, 24576, 32768, 40960, 45056, 49152, 53248, 57344, 61440];
      validPriorities.forEach(priority => {
        expect(() => new SpanningTreePriority(priority)).not.toThrow();
      });
    });

    it("should reject non-multiple of 4096", () => {
      expect(() => new SpanningTreePriority(1000)).toThrow("must be a multiple of 4096");
    });

    it("should reject values below 0", () => {
      expect(() => new SpanningTreePriority(-4096)).toThrow();
    });

    it("should reject values above 61440", () => {
      expect(() => new SpanningTreePriority(65536)).toThrow();
    });

    it("should reject non-integer values", () => {
      expect(() => new SpanningTreePriority(4096.5)).toThrow("must be an integer");
    });
  });

  describe("type guards", () => {
    it("should identify root priority", () => {
      const priority = new SpanningTreePriority(0);
      expect(priority.isRootPriority).toBe(true);
      expect(priority.isDefault).toBe(false);
    });

    it("should identify secondary root priority", () => {
      const priority = new SpanningTreePriority(4096);
      expect(priority.isSecondaryRootPriority).toBe(true);
    });

    it("should identify default priority", () => {
      const priority = new SpanningTreePriority(32768);
      expect(priority.isDefault).toBe(true);
    });

    it("should identify high priority (more likely to be root)", () => {
      const priority = new SpanningTreePriority(16384);
      expect(priority.isHighPriority).toBe(true);
      expect(priority.isLowPriority).toBe(false);
    });

    it("should identify low priority (less likely to be root)", () => {
      const priority = new SpanningTreePriority(49152);
      expect(priority.isLowPriority).toBe(true);
      expect(priority.isHighPriority).toBe(false);
    });
  });

  describe("comparison", () => {
    it("should compare priorities", () => {
      const priority1 = new SpanningTreePriority(4096);
      const priority2 = new SpanningTreePriority(32768);
      
      // Lower value = higher priority in STP
      expect(priority1.compare(priority2)).toBeLessThan(0);
      expect(priority2.compare(priority1)).toBeGreaterThan(0);
    });

    it("should check if higher priority than another", () => {
      const root = new SpanningTreePriority(0);
      const backup = new SpanningTreePriority(4096);
      
      expect(root.isHigherPriorityThan(backup)).toBe(true);
      expect(backup.isHigherPriorityThan(root)).toBe(false);
    });

    it("should check if lower priority than another", () => {
      const access = new SpanningTreePriority(61440);
      const distribution = new SpanningTreePriority(24576);
      
      expect(access.isLowerPriorityThan(distribution)).toBe(true);
      expect(distribution.isLowerPriorityThan(access)).toBe(false);
    });
  });

  describe("getNextHigherPriority", () => {
    it("should get next higher priority", () => {
      const priority = new SpanningTreePriority(32768);
      const higher = priority.getNextHigherPriority();
      expect(higher?.value).toBe(28672);
    });

    it("should return null at highest priority", () => {
      const root = new SpanningTreePriority(0);
      expect(root.getNextHigherPriority()).toBeNull();
    });
  });

  describe("getNextLowerPriority", () => {
    it("should get next lower priority", () => {
      const priority = new SpanningTreePriority(32768);
      const lower = priority.getNextLowerPriority();
      expect(lower?.value).toBe(36864);
    });

    it("should return null at lowest priority", () => {
      const lowest = new SpanningTreePriority(61440);
      expect(lowest.getNextLowerPriority()).toBeNull();
    });
  });

  describe("presets", () => {
    it("should provide root preset", () => {
      const preset = SpanningTreePriority.presets().root;
      expect(preset.value).toBe(0);
      expect(preset.isRootPriority).toBe(true);
    });

    it("should provide secondary root preset", () => {
      const preset = SpanningTreePriority.presets().secondaryRoot;
      expect(preset.value).toBe(4096);
      expect(preset.isSecondaryRootPriority).toBe(true);
    });

    it("should provide default preset", () => {
      const preset = SpanningTreePriority.presets().default;
      expect(preset.value).toBe(32768);
      expect(preset.isDefault).toBe(true);
    });

    it("should provide distribution preset", () => {
      const preset = SpanningTreePriority.presets().distribution;
      expect(preset.value).toBe(24576);
      expect(preset.isHighPriority).toBe(true);
    });

    it("should provide access preset", () => {
      const preset = SpanningTreePriority.presets().access;
      expect(preset.value).toBe(61440);
      expect(preset.isLowPriority).toBe(true);
    });
  });

  describe("equals", () => {
    it("should compare equality", () => {
      const p1 = new SpanningTreePriority(32768);
      const p2 = new SpanningTreePriority(32768);
      const p3 = new SpanningTreePriority(24576);
      
      expect(p1.equals(p2)).toBe(true);
      expect(p1.equals(p3)).toBe(false);
    });
  });

  describe("toString", () => {
    it("should return string representation", () => {
      expect(new SpanningTreePriority(32768).toString()).toBe("32768");
      expect(new SpanningTreePriority(0).toString()).toBe("0");
    });
  });

  describe("toJSON", () => {
    it("should serialize to primitive", () => {
      const priority = new SpanningTreePriority(24576);
      const json = priority.toJSON();
      expect(json).toBe(24576);
    });
  });
});

describe("parseSpanningTreePriority", () => {
  it("should parse valid values", () => {
    const priority = parseSpanningTreePriority(32768);
    expect(priority.value).toBe(32768);
  });

  it("should throw for invalid values", () => {
    expect(() => parseSpanningTreePriority(5000)).toThrow();
  });
});

describe("isValidSpanningTreePriority", () => {
  it("should return true for valid values", () => {
    expect(isValidSpanningTreePriority(0)).toBe(true);
    expect(isValidSpanningTreePriority(4096)).toBe(true);
    expect(isValidSpanningTreePriority(32768)).toBe(true);
    expect(isValidSpanningTreePriority(61440)).toBe(true);
  });

  it("should return false for invalid values", () => {
    expect(isValidSpanningTreePriority(1000)).toBe(false);
    expect(isValidSpanningTreePriority(-4096)).toBe(false);
    expect(isValidSpanningTreePriority(65536)).toBe(false);
  });
});
