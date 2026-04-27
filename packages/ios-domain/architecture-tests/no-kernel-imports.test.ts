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
      if (entry === "node_modules" || entry === "dist" || entry === "generated") {
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

describe("ios-domain architecture boundaries", () => {
  test("does not import @cisco-auto/kernel in src/", () => {
    const packageRoot = join(import.meta.dir, "../../..");
    const files = collectTsFiles(join(packageRoot, "src"));

    const offenders = files.filter((file) => {
      if (file.endsWith(".test.ts")) return false;
      const source = readFileSync(file, "utf8");
      return source.includes("@cisco-auto/kernel");
    });

    expect(offenders).toEqual([]);
  });
});