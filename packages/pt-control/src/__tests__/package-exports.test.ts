import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
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
  });
});
