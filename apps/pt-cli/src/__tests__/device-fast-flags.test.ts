import { describe, expect, test } from "bun:test";
import { flagEnabled } from "../flags-utils.js";

describe("flagEnabled", () => {
  test("--no-verify gana sobre el valor por defecto", () => {
    const originalArgv = process.argv;
    process.argv = ["bun", "pt", "device", "move", "AP-1", "100", "100", "--no-verify"];

    try {
      expect(
        flagEnabled(true, {
          defaultValue: true,
          positive: "--verify",
          negative: "--no-verify",
        }),
      ).toBe(false);
    } finally {
      process.argv = originalArgv;
    }
  });

  test("--verify fuerza true", () => {
    const originalArgv = process.argv;
    process.argv = ["bun", "pt", "device", "move", "AP-1", "100", "100", "--verify"];

    try {
      expect(
        flagEnabled(false, {
          defaultValue: false,
          positive: "--verify",
          negative: "--no-verify",
        }),
      ).toBe(true);
    } finally {
      process.argv = originalArgv;
    }
  });
});
