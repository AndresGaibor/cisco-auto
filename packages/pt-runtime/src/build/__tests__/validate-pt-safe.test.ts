import { describe, expect, test } from "bun:test";
import { validatePtSafe } from "../validate-pt-safe";

describe("validatePtSafe", () => {
  test("rechaza colecciones ES2015 no seguras para el runtime PT", () => {
    const code = `
      const seen = new Set();
      const map = new Map();
      const weak = new WeakMap();
      if (seen.has("x")) {
        map.set("x", 1);
        weak.has({});
      }
    `;

    const result = validatePtSafe(code);

    expect(result.valid).toBe(false);
    expect(result.errors.some((error) => error.message.includes("Set"))).toBe(true);
    expect(result.errors.some((error) => error.message.includes("Map"))).toBe(true);
    expect(result.errors.some((error) => error.message.includes("WeakMap"))).toBe(true);
  });
});
