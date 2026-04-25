import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

function collectTsFiles(root: string): string[] {
  if (!existsSync(root)) {
    return [];
  }

  const out: string[] = [];

  for (const entry of readdirSync(root)) {
    const fullPath = join(root, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      if (
        entry === "node_modules" ||
        entry === "dist" ||
        entry === "generated"
      ) {
        continue;
      }

      out.push(...collectTsFiles(fullPath));
      continue;
    }

    if (entry.endsWith(".ts")) {
      out.push(fullPath);
    }
  }

  return out;
}

describe("ios-domain persistence boundaries", () => {
  test("does not contain src/memory", () => {
    const packageRoot = join(import.meta.dir, "../../..");
    expect(existsSync(join(packageRoot, "src", "memory"))).toBe(false);
  });

  test("does not import SQLite or pt-memory infrastructure", () => {
    const packageRoot = join(import.meta.dir, "../../..");
    const files = [
      ...collectTsFiles(join(packageRoot, "src")),
      ...collectTsFiles(join(packageRoot, "tests")),
    ];

    const forbidden = [
      "bun" + ":sqlite",
      "@cisco-auto/" + "pt-memory",
      "../memory/",
      "./memory/",
    ];

    const offenders = files.filter((file) => {
      if (file.endsWith("no-persistence-imports.test.ts")) {
        return false;
      }

      const source = readFileSync(file, "utf8");
      return forbidden.some((pattern) => source.includes(pattern));
    });

    expect(offenders).toEqual([]);
  });
});
