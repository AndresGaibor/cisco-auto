import { describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import * as path from "path";
import { createBuildContext, getSpec, withSpec } from "../build-context";

describe("build-context", () => {
  test("createBuildContext devuelve tres specs con kind correcto y minify=false por defecto", () => {
    const devDir = mkdtempSync(path.join(tmpdir(), "pt-build-ctx-"));
    const ctx = createBuildContext({ devDir, srcDir: devDir });

    expect(Object.keys(ctx.specs).sort()).toEqual(["catalog", "main", "runtime"]);
    expect(ctx.specs.main.kind).toBe("main");
    expect(ctx.specs.runtime.kind).toBe("runtime");
    expect(ctx.specs.catalog.kind).toBe("catalog");
    expect(ctx.specs.main.minify).toBe(false);
    expect(ctx.specs.runtime.minify).toBe(false);
    expect(ctx.specs.catalog.minify).toBe(false);
    expect(ctx.minify).toBe(false);
    expect(ctx.devDir).toBe(devDir);
  });

  test("con minify=true, todos los specs lo reflejan", () => {
    const devDir = mkdtempSync(path.join(tmpdir(), "pt-build-ctx-"));
    const ctx = createBuildContext({ devDir, srcDir: devDir, minify: true });

    expect(ctx.minify).toBe(true);
    expect(ctx.specs.main.minify).toBe(true);
    expect(ctx.specs.runtime.minify).toBe(true);
    expect(ctx.specs.catalog.minify).toBe(true);
  });

  test("getSpec retorna el spec del kind pedido", () => {
    const devDir = mkdtempSync(path.join(tmpdir(), "pt-build-ctx-"));
    const ctx = createBuildContext({ devDir, srcDir: devDir });

    expect(getSpec(ctx, "main")).toBe(ctx.specs.main);
    expect(getSpec(ctx, "runtime")).toBe(ctx.specs.runtime);
    expect(getSpec(ctx, "catalog")).toBe(ctx.specs.catalog);
  });

  test("withSpec crea un contexto nuevo sin mutar el original", () => {
    const devDir = mkdtempSync(path.join(tmpdir(), "pt-build-ctx-"));
    const original = createBuildContext({ devDir, srcDir: devDir });
    const originalSpecs = original.specs;
    const originalMain = original.specs.main;
    const originalRuntime = original.specs.runtime;
    const originalCatalog = original.specs.catalog;

    const next = withSpec(original, "main", { minify: true });

    expect(next).not.toBe(original);
    expect(next.specs).not.toBe(originalSpecs);
    expect(next.specs.main).not.toBe(originalMain);
    expect(next.specs.runtime).toBe(originalRuntime);
    expect(next.specs.catalog).toBe(originalCatalog);
    expect(next.specs.main.minify).toBe(true);
    expect(originalMain.minify).toBe(false);
    expect(original.specs.main.minify).toBe(false);
  });

  test("outputDir opcional: si no se pasa, devDir == outputDir para todos los specs", () => {
    const devDir = mkdtempSync(path.join(tmpdir(), "pt-build-ctx-"));
    const ctx = createBuildContext({ devDir, srcDir: devDir });

    expect(ctx.specs.main.outputPath).toBe(path.join(devDir, "main.js"));
    expect(ctx.specs.runtime.outputPath).toBe(path.join(devDir, "runtime.js"));
    expect(ctx.specs.catalog.outputPath).toBe(path.join(devDir, "catalog.js"));
  });
});
