import { afterEach, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { RuntimeGenerator, renderMainSource, renderRuntimeSource } from "../index.js";

const carpetasTemporales: string[] = [];

afterEach(() => {
  while (carpetasTemporales.length > 0) {
    const dir = carpetasTemporales.pop();
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

test("renderMainSource reemplaza la ruta de dev", () => {
  const devDir = "/tmp/pt-dev-test";
  const main = renderMainSource(devDir);

  expect(main).toContain(JSON.stringify(devDir));
  expect(main).not.toContain("{{DEV_DIR_LITERAL}}");
});

test("RuntimeGenerator deploy escribe los archivos esperados", async () => {
  const raiz = mkdtempSync(join(tmpdir(), "pt-control-"));
  carpetasTemporales.push(raiz);

  const outputDir = join(raiz, "generated");
  const devDir = join(raiz, "pt-dev");

  const generator = new RuntimeGenerator({ outputDir, devDir });
  await generator.deploy();

  // deploy() writes to devDir, not outputDir (build() writes to outputDir)
  const devMain = join(devDir, "main.js");
  const devRuntime = join(devDir, "runtime.js");
  const devManifest = join(devDir, "manifest.json");

  expect(existsSync(devMain)).toBe(true);
  expect(existsSync(devRuntime)).toBe(true);
  expect(existsSync(devManifest)).toBe(true);

  expect(readFileSync(devMain, "utf-8")).toContain(JSON.stringify(devDir));
  expect(readFileSync(devRuntime, "utf-8")).toContain("handleConfigIos");
});

test("RuntimeGenerator buildFromHandlers escribe runtime desde handlers", async () => {
  const raiz = mkdtempSync(join(tmpdir(), "pt-control-"));
  carpetasTemporales.push(raiz);

  const outputDir = join(raiz, "generated");
  const devDir = join(raiz, "pt-dev");

  const generator = new RuntimeGenerator({ outputDir, devDir });
  await generator.buildFromHandlers(join(".", "packages", "pt-runtime", "src"));

  const runtimePath = join(outputDir, "runtime.js");
  expect(existsSync(runtimePath)).toBe(true);
  expect(readFileSync(runtimePath, "utf-8")).toContain("handleEnsureVlans");
});
