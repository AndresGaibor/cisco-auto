import { describe, expect, test } from "bun:test";
import { getAllMainFiles, validateMainManifestDependencies } from "../../build/main-manifest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("main manifest", () => {
  test("incluye command-result-envelope antes de command-finalizer", () => {
    const files = getAllMainFiles();

    const envelopeIndex = files.indexOf("pt/kernel/command-result-envelope.ts");
    const finalizerIndex = files.indexOf("pt/kernel/command-finalizer.ts");

    expect(envelopeIndex).toBeGreaterThanOrEqual(0);
    expect(finalizerIndex).toBeGreaterThanOrEqual(0);
    expect(envelopeIndex).toBeLessThan(finalizerIndex);
  });

  test("no tiene dependencias transitivas faltantes", () => {
    const srcDir = join(process.cwd(), "packages/pt-runtime/src");
    const sourceFiles = new Map<string, string>();

    for (const relPath of getAllMainFiles()) {
      sourceFiles.set(relPath, readFileSync(join(srcDir, relPath), "utf8"));
    }

    expect(validateMainManifestDependencies(sourceFiles)).toEqual([]);
  });
});
