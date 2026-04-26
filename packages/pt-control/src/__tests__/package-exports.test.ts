import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

describe("pt-control package exports", () => {
  test("declares explicit public subpaths", () => {
    const pkg = JSON.parse(
      readFileSync(join(import.meta.dir, "../../package.json"), "utf8"),
    ) as {
      exports: Record<string, string>;
    };

    const required = [
      ".",
      "./legacy",
      "./controller",
      "./ports",
      "./adapters",
      "./contracts",
      "./contracts/ios-execution-evidence",
      "./services",
      "./agent",
      "./omni",
      "./quality",
      "./pt/terminal",
      "./pt/topology",
      "./pt/server",
      "./pt/planner",
      "./pt/ledger",
      "./pt/diagnosis",
      "./intent",
      "./checks",
      "./commands",
      "./commands/bridge-doctor",
      "./vdom",
      "./parsers",
      "./types",
      "./logging",
      "./package.json",
    ];

    for (const key of required) {
      expect(pkg.exports[key]).toBeDefined();
      expect(pkg.exports[key]).toMatch(/^\.\/.+/);
    }

    // Validar que los archivos exportados realmente existen en el filesystem
    for (const [key, target] of Object.entries(pkg.exports)) {
      if (key === "./package.json") continue;
      const targetPath = join(import.meta.dir, "../..", target);
      expect(
        existsSync(targetPath),
        `Export ${key} -> ${target} no existe`,
      ).toBe(true);
    }
  });
});
