// packages/pt-runtime/src/build/__tests__/manifest-validation.test.ts
import { describe, expect, test, mock, afterAll } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import * as path from "path";
import { readExistingManifest } from "../manifest";

const tmpRoot = mkdtempSync(path.join(tmpdir(), "pt-manifest-validation-"));

afterAll(() => {
  rmSync(tmpRoot, { recursive: true, force: true });
});

describe("readExistingManifest con validación zod", () => {
  test("devuelve null si el directorio no existe", () => {
    const noExiste = path.join(tmpRoot, "no-existe");
    expect(readExistingManifest(noExiste)).toBeNull();
  });

  test("devuelve null si el manifest está corrupto (no es JSON válido)", () => {
    const dir = mkdtempSync(path.join(tmpRoot, "corrupto-"));
    writeFileSync(path.join(dir, "manifest.json"), "{ esto no es JSON valido");
    expect(readExistingManifest(dir)).toBeNull();
  });

  test("devuelve null si el JSON es válido pero el shape no (falta mainChecksum)", () => {
    const dir = mkdtempSync(path.join(tmpRoot, "shape-invalido-"));
    writeFileSync(
      path.join(dir, "manifest.json"),
      JSON.stringify({ schemaVersion: "1.0" }),
    );
    expect(readExistingManifest(dir)).toBeNull();
  });

  test("devuelve el objeto si el manifest es válido", () => {
    const dir = mkdtempSync(path.join(tmpRoot, "valido-"));
    const valid = {
      schemaVersion: "1.0",
      cliVersion: "0.3.0",
      protocolVersion: 3,
      mainChecksum: "abc",
      catalogChecksum: "def",
      runtimeChecksum: "ghi",
      modules: {
        main: "main.js",
        catalog: "catalog.js",
        runtime: "runtime.js",
      },
      reload: {
        mainManualReloadRequiredWhenChanged: true,
        runtimeHotReloadable: true,
        catalogHotReloadable: false,
      },
    };
    writeFileSync(path.join(dir, "manifest.json"), JSON.stringify(valid));
    expect(readExistingManifest(dir)).toEqual(valid);
  });
});

describe("writeRuntimeManifest con validación zod", () => {
  test("lanza error si los checksums quedan vacíos", async () => {
    // Forzar que computeChecksum devuelva string vacío para simular un manifest inválido
    mock.module("../checksum", () => ({
      computeChecksum: () => "",
      normalizeArtifactForChecksum: (s: string) => s,
    }));

    // Cache buster para forzar re-import del manifest con el mock activo
    const fresh = await import(`../manifest?bust=${Date.now()}-${Math.random()}`);
    const { writeRuntimeManifest } = fresh;

    const dir = mkdtempSync(path.join(tmpRoot, "write-"));

    await expect(
      writeRuntimeManifest("main", "catalog", "runtime", dir),
    ).rejects.toThrow(/Manifest inválido/);
  });
});
