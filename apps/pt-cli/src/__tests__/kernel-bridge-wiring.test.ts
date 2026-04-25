import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("kernel bridge wiring", () => {
  test("uses createPTController factory instead of direct PTController constructor", () => {
    const source = readFileSync(join(import.meta.dir, "../kernel-bridge.ts"), "utf8");

    expect(source).toContain("createPTController");
    expect(source).toContain("createController: (config) => createPTController(config)");
    expect(source).not.toContain("new PTController(config)");
  });
});