#!/usr/bin/env bun
import { describe, expect, test } from "bun:test";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";

function walk(dir: string): string[] {
  const files: string[] = [];

  try {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);

      if (full.includes("/legacy-yaml/")) continue;
      if (full.includes("/legacy/")) continue;
      if (full.includes("/__tests__/")) continue;
      if (full.includes("/node_modules/")) continue;

      if (statSync(full).isDirectory()) {
        files.push(...walk(full));
      } else if (full.endsWith(".ts") || full.endsWith(".json")) {
        files.push(full);
      }
    }
  } catch {
    // ignore errors
  }

  return files;
}

describe("CLI pública no expone formato de laboratorio legacy", () => {
  test("no hay dependencias ni comandos públicos de formato legacy", () => {
    const testFile = import.meta.path;
    const ptCliDir = join(dirname(testFile), "..", "..", "..");
    const srcDir = join(ptCliDir, "src");
    const pkgJson = join(ptCliDir, "package.json");

    const files = [...walk(srcDir), pkgJson];

    const offenders = files.filter((file) => {
      try {
        const content = readFileSync(file, "utf-8");
        return /yaml|yml|js-yaml/i.test(content);
      } catch {
        return false;
      }
    });

    expect(offenders).toEqual([]);
  });
});