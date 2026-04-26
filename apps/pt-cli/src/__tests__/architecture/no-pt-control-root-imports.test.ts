import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

function collectTsFiles(root: string): string[] {
  if (!existsSync(root)) return [];

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

describe("pt-cli pt-control imports", () => {
  test("does not import from @cisco-auto/pt-control root", () => {
    const testFile = join(import.meta.dir, "no-pt-control-root-imports.test.ts");
    const roots = [
      join(import.meta.dir, "../.."),
      join(import.meta.dir, "../../../tests"),
    ];

    const files = roots.flatMap(collectTsFiles);

    const offenders = files.filter((file) => {
      if (file === testFile) return false;
      const source = readFileSync(file, "utf8");

      return (
        source.includes('from "@cisco-auto/pt-control"') ||
        source.includes("from '@cisco-auto/pt-control'") ||
        source.includes('import("@cisco-auto/pt-control")') ||
        source.includes("import('@cisco-auto/pt-control')")
      );
    });

    expect(offenders).toEqual([]);
  });

  test("does not import from pt-control legacy entrypoint", () => {
    const testFile = join(import.meta.dir, "no-pt-control-root-imports.test.ts");
    const roots = [
      join(import.meta.dir, "../.."),
      join(import.meta.dir, "../../../tests"),
    ];

    const files = roots.flatMap(collectTsFiles);

    const offenders = files.filter((file) => {
      if (file === testFile) return false;
      const source = readFileSync(file, "utf8");
      return source.includes("@cisco-auto/pt-control/legacy");
    });

    expect(offenders).toEqual([]);
  });
});
