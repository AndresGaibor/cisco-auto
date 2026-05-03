import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getAllRuntimeFiles } from "../runtime-manifest";

const FORBIDDEN_RUNTIME_PREFIXES = [
  "terminal/",
  "pt/terminal/",
];

const FORBIDDEN_RUNTIME_FILES = [
  "utils/parser-generator.ts",
  "handlers/parsers/ios-parsers.ts",
  "handlers/ios-output-classifier.ts",
  "handlers/ios/ios-result-mapper.ts",
  "handlers/ios/ios-session-utils.ts",
  "handlers/ios/host-stabilize.ts",
];

const FORBIDDEN_IMPORT_PATTERNS = [
  /from\s+["']\.\.\/terminal\//,
  /from\s+["']\.\.\/\.\.\/terminal\//,
  /from\s+["']\.\.\/pt\/terminal\//,
  /from\s+["']\.\.\/\.\.\/pt\/terminal\//,
  /from\s+["'].*parser-generator/,
  /from\s+["'].*ios-output-classifier/,
  /from\s+["'].*ios-result-mapper/,
];

describe("runtime manifest boundary", () => {
  test("runtime.js no incluye terminal engine ni parsers pesados", () => {
    const files = getAllRuntimeFiles();

    for (const file of files) {
      expect(
        FORBIDDEN_RUNTIME_PREFIXES.some((prefix) => file.startsWith(prefix)),
        `${file} no debe estar en runtime.js`,
      ).toBe(false);

      expect(
        FORBIDDEN_RUNTIME_FILES.includes(file),
        `${file} debe vivir en pt-control/ios-domain, no en runtime.js`,
      ).toBe(false);
    }
  });

  test("archivos del runtime no importan terminal stack", () => {
    const srcDir = join(process.cwd(), "packages/pt-runtime/src");

    for (const file of getAllRuntimeFiles()) {
      const fullPath = join(srcDir, file);
      const source = readFileSync(fullPath, "utf8");

      for (const pattern of FORBIDDEN_IMPORT_PATTERNS) {
        expect(
          pattern.test(source),
          `${file} importa terminal stack: ${pattern}`,
        ).toBe(false);
      }
    }
  });

  test("runtime.js no incluye async ni Promise en archivos manifest", () => {
    const srcDir = join(process.cwd(), "packages/pt-runtime/src");
    const allowedPromiseMarkers = [
      "handlers/dispatcher.ts",
    ];

    for (const file of getAllRuntimeFiles()) {
      const fullPath = join(srcDir, file);
      const source = readFileSync(fullPath, "utf8");

      if (allowedPromiseMarkers.includes(file)) continue;

      expect(source, `${file} no debe contener async function`).not.toMatch(/\basync\s+function\b/);
      expect(source, `${file} no debe contener export async function`).not.toMatch(/export\s+async\s+function/);
      expect(source, `${file} no debe contener await`).not.toMatch(/\bawait\b/);
      expect(source, `${file} no debe contener new Promise`).not.toMatch(/new\s+Promise/);
      expect(source, `${file} no debe contener Promise.`).not.toMatch(/Promise\./);
    }
  });
});