import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("command-catalog CLI boundary", () => {
  const source = readFileSync(
    join(import.meta.dir, "../../commands/command-catalog.ts"),
    "utf8",
  );

  test("command-catalog.ts imports COMMAND_CATALOG from pt-control", () => {
    expect(source).toContain(
      "@cisco-auto/pt-control/application/command-catalog",
    );
  });

  test("command-catalog.ts has under 250 lines", () => {
    const lines = source.split("\n").filter((l) => l.trim() !== "");
    expect(lines.length).toBeLessThan(250);
  });

  test("command-catalog.ts does NOT contain the full COMMAND_CATALOG object inline", () => {
    // Should not have the raw object definition
    expect(source).not.toContain("id: 'build'");
    expect(source).not.toContain("id: 'device'");
    expect(source).not.toContain("id: 'inspect'");
    // Should re-export from pt-control instead
    expect(source).toContain("export { COMMAND_CATALOG }");
  });

  test("command-catalog.ts keeps getRegisteredCommandIds function", () => {
    expect(source).toContain("export function getRegisteredCommandIds()");
    expect(source).toContain("'build'");
    expect(source).toContain("'device'");
  });

  test("command-catalog.ts re-exports CommandCatalogEntry type", () => {
    expect(source).toContain("export type { CommandCatalogEntry }");
  });
});
