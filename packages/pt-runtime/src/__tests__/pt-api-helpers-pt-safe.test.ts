import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("pt-api helpers PT-safe source", () => {
  test("no usa for...of en createDeviceWithFallback", () => {
    const source = readFileSync(
      join(import.meta.dir, "../pt-api/pt-helpers.ts"),
      "utf8",
    );

    expect(source).not.toContain("for (const typeId of typeList)");
  });
});
