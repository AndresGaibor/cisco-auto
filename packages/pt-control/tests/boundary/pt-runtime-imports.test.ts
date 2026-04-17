import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const PT_CONTROL_SRC = join(import.meta.dir, "../../src");
const INTERNAL_RUNTIME_PATTERNS = [
  "@cisco-auto/pt-runtime/value-objects",
  "@cisco-auto/pt-runtime/src/",
  "@cisco-auto/pt-runtime/handlers",
  "@cisco-auto/pt-runtime/domain",
  "@cisco-auto/pt-runtime/runtime",
  "@cisco-auto/pt-runtime/core",
  "@cisco-auto/pt-runtime/pt/",
  "@cisco-auto/pt-runtime/build/",
  "@cisco-auto/pt-runtime/templates/",
  "@cisco-auto/pt-runtime/utils/",
];

const ALLOWED_RUNTIME_IMPORTS = ["@cisco-auto/pt-runtime", "@cisco-auto/pt-runtime/contracts"];

function getAllTsFiles(dir: string, files: string[] = []): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (
      entry.name === "node_modules" ||
      entry.name === "generated" ||
      entry.name === "__tests__" ||
      entry.name === "tests"
    )
      continue;
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      getAllTsFiles(fullPath, files);
    } else if (entry.name.endsWith(".ts")) {
      files.push(fullPath);
    }
  }
  return files;
}

describe("pt-control → pt-runtime import boundaries", () => {
  const allFiles = getAllTsFiles(PT_CONTROL_SRC);

  test("no imports from internal pt-runtime paths", () => {
    const violations: { file: string; pattern: string }[] = [];

    for (const file of allFiles) {
      const content = readFileSync(file, "utf-8");
      const relativeFile = file.replace(PT_CONTROL_SRC + "/", "");

      for (const pattern of INTERNAL_RUNTIME_PATTERNS) {
        if (content.includes(`from "${pattern}"`) || content.includes(`from '${pattern}'`)) {
          violations.push({ file: relativeFile, pattern });
        }
      }
    }

    expect(violations).toHaveLength(0);
  });

  test("all pt-runtime imports use public API (root)", () => {
    const violations: { file: string; line: string }[] = [];

    for (const file of allFiles) {
      const content = readFileSync(file, "utf-8");
      const relativeFile = file.replace(PT_CONTROL_SRC + "/", "");
      const lines = content.split("\n");

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (
          line.includes('from "@cisco-auto/pt-runtime') ||
          line.includes("from '@cisco-auto/pt-runtime")
        ) {
          const isAllowed = ALLOWED_RUNTIME_IMPORTS.some(
            (allowed) => line.includes(`from "${allowed}"`) || line.includes(`from '${allowed}'`),
          );
          if (!isAllowed) {
            violations.push({ file: relativeFile, line: line.trim() });
          }
        }
      }
    }

    expect(violations).toHaveLength(0);
  });
});
