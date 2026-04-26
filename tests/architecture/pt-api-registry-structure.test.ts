import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const REGISTRY_FILE = join(
  process.cwd(),
  "packages/pt-runtime/src/pt-api/pt-api-registry.ts",
);

describe("pt-api-registry.ts architecture", () => {
  test("pt-api-registry.ts is under 100 lines", () => {
    const content = readFileSync(REGISTRY_FILE, "utf8");
    const lines = content.split("\n").filter((line) => line.trim() !== "").length;
    expect(lines, `pt-api-registry.ts has ${lines} non-empty lines (max 100)`).toBeLessThanOrEqual(100);
  });

  test("pt-api-registry.ts only contains re-exports (no type definitions)", () => {
    const content = readFileSync(REGISTRY_FILE, "utf8");

    // Should only have: comments, export * from, and/or export type * from
    const nonExportLines = content
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith("//") && !l.startsWith("/*") && !l.startsWith("*") && l !== "*/");

    for (const line of nonExportLines) {
      const isReExport =
        line.startsWith("export *") ||
        line.startsWith("export {") ||
        line === "// Re-export everything from the registry subdirectory" ||
        line === "export * from \"./registry/index.js\";";

      expect(
        isReExport,
        `Non re-export line found: "${line}". pt-api-registry.ts must only re-export from registry/.`,
      ).toBe(true);
    }
  });

  test("registry/index.ts re-exports all domain files", () => {
    const indexContent = readFileSync(
      join(process.cwd(), "packages/pt-runtime/src/pt-api/registry/index.ts"),
      "utf8",
    );
    // Should export from all-types.ts
    expect(indexContent).toContain("all-types.js");
  });
});