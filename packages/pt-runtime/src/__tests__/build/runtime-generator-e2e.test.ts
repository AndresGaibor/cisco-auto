import { describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { RuntimeGenerator } from "../../index.js";
import { renderMainV2Pipeline } from "../../build/pipelines/main-pipeline.js";
import { renderRuntimeV2Pipeline } from "../../build/pipelines/runtime-pipeline.js";
import { RuntimeArtifactManifestSchema } from "../../build/schemas/runtime-artifact.schema.js";

describe("RuntimeGenerator E2E", () => {
  test("generate() produce main.js, runtime.js y catalog.js con marcadores esperados", async () => {
    const tmpDev = mkdtempSync(join(tmpdir(), "pt-runtime-e2e-gen-"));

    try {
      const gen = new RuntimeGenerator({ devDir: tmpDev, minify: false });
      const result = await gen.generate();

      expect(typeof result.main).toBe("string");
      expect(result.main).toContain("function main()");
      expect(result.main).toContain("var __values = function");

      expect(typeof result.runtime).toBe("string");
      expect(result.runtime).toContain("_ptDispatch");
      expect(result.runtime).toContain("var __values = function");

      expect(typeof result.catalog).toBe("string");
      expect(result.catalog.length).toBeGreaterThan(0);
    } finally {
      rmSync(tmpDev, { recursive: true, force: true });
    }
  }, 60000);

  test("build() en directorio vacío reporta los 3 cambios como true", async () => {
    const tmpDev = mkdtempSync(join(tmpdir(), "pt-runtime-e2e-build-"));

    try {
      const gen = new RuntimeGenerator({ devDir: tmpDev, minify: false });
      const report = await gen.build();

      expect(report.changes.mainChanged).toBe(true);
      expect(report.changes.runtimeChanged).toBe(true);
      expect(report.changes.catalogChanged).toBe(true);
      expect(report.manifest).toBeDefined();
    } finally {
      rmSync(tmpDev, { recursive: true, force: true });
    }
  }, 60000);

  test("build() idempotente: la segunda vez los 3 cambios son false", async () => {
    const tmpDev = mkdtempSync(join(tmpdir(), "pt-runtime-e2e-idempotent-"));

    try {
      const gen = new RuntimeGenerator({ devDir: tmpDev, minify: false });

      await gen.build();
      const second = await gen.build();

      expect(second.changes.mainChanged).toBe(false);
      expect(second.changes.runtimeChanged).toBe(false);
      expect(second.changes.catalogChanged).toBe(false);
    } finally {
      rmSync(tmpDev, { recursive: true, force: true });
    }
  }, 60000);

  test("renderMainV2Pipeline no lanza y devuelve string con 'function main()'", () => {
    const out = renderMainV2Pipeline({ srcDir: "src", outputPath: "" });
    expect(typeof out).toBe("string");
    expect(out).toContain("function main()");
  }, 60000);

  test("renderRuntimeV2Pipeline no lanza y devuelve string con '_ptDispatch'", () => {
    const out = renderRuntimeV2Pipeline({ srcDir: "src", outputPath: "" });
    expect(typeof out).toBe("string");
    expect(out).toContain("_ptDispatch");
  }, 60000);

  test("RuntimeArtifactManifestSchema valida el manifest escrito en el devDir", async () => {
    const tmpDev = mkdtempSync(join(tmpdir(), "pt-runtime-e2e-manifest-"));

    try {
      const gen = new RuntimeGenerator({ devDir: tmpDev, minify: false });
      const report = await gen.build();

      const manifestPath = join(tmpDev, "manifest.json");
      const raw = readFileSync(manifestPath, "utf-8");
      const parsed = JSON.parse(raw);

      const result = RuntimeArtifactManifestSchema.safeParse(parsed);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.mainChecksum).toBe(report.manifest.mainChecksum);
        expect(result.data.runtimeChecksum).toBe(report.manifest.runtimeChecksum);
        expect(result.data.catalogChecksum).toBe(report.manifest.catalogChecksum);
      }
    } finally {
      rmSync(tmpDev, { recursive: true, force: true });
    }
  }, 60000);
});
