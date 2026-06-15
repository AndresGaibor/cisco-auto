import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("device creation PT-safe source", () => {
  test("no usa for...of en createDeviceWithFallback", () => {
    const source = readFileSync(
      join(import.meta.dir, "../utils/device-creation.ts"),
      "utf8",
    );

    expect(source).not.toContain("for (const typeId of typeList)");
  });
});
