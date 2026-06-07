// packages/pt-runtime/src/build/__tests__/derived-types.test.ts
import { describe, expect, test } from "bun:test";

import {
  RUNTIME_MANIFEST_DEFAULTS,
  RUNTIME_RELOAD_DEFAULTS,
  type RuntimeArtifactManifest,
} from "../schemas/derived-types";
import { compareManifests, validateChangeReport } from "../manifest";

const manifestValido: RuntimeArtifactManifest = {
  ...RUNTIME_MANIFEST_DEFAULTS,
  mainChecksum: "main-abc",
  catalogChecksum: "catalog-def",
  runtimeChecksum: "runtime-ghi",
  modules: {
    main: "main.js",
    catalog: "catalog.js",
    runtime: "runtime.js",
  },
  reload: RUNTIME_RELOAD_DEFAULTS,
};

describe("derived-types", () => {
  test("RuntimeArtifactManifest es un type usable y equivale a un objeto válido", () => {
    const tipadoComoManifest: RuntimeArtifactManifest = manifestValido;
    expect(tipadoComoManifest).toEqual(manifestValido);
    expect(tipadoComoManifest.schemaVersion).toBe("1.0");
    expect(tipadoComoManifest.protocolVersion).toBe(3);
  });

  test("RUNTIME_MANIFEST_DEFAULTS expone schemaVersion=1.0, cliVersion=0.3.0, protocolVersion=3", () => {
    expect(RUNTIME_MANIFEST_DEFAULTS).toEqual({
      schemaVersion: "1.0",
      cliVersion: "0.3.0",
      protocolVersion: 3,
    });
  });

  test("RUNTIME_RELOAD_DEFAULTS expone runtimeHotReloadable=true y catalogHotReloadable=false", () => {
    expect(RUNTIME_RELOAD_DEFAULTS.runtimeHotReloadable).toBe(true);
    expect(RUNTIME_RELOAD_DEFAULTS.catalogHotReloadable).toBe(false);
    expect(RUNTIME_RELOAD_DEFAULTS.mainManualReloadRequiredWhenChanged).toBe(true);
  });

  test("validateChangeReport acepta { mainChanged: true, runtimeChanged: false, catalogChanged: true }", () => {
    const result = validateChangeReport({
      mainChanged: true,
      runtimeChanged: false,
      catalogChanged: true,
    });
    expect(result).toEqual({
      mainChanged: true,
      runtimeChanged: false,
      catalogChanged: true,
    });
  });

  test("validateChangeReport rechaza un objeto sin mainChanged", () => {
    expect(() =>
      validateChangeReport({
        runtimeChanged: false,
        catalogChanged: true,
      }),
    ).toThrow();
  });
});

describe("compareManifests", () => {
  test("con prev=null devuelve los 3 changed=true", () => {
    expect(compareManifests(null, manifestValido)).toEqual({
      mainChanged: true,
      runtimeChanged: true,
      catalogChanged: true,
    });
  });

  test("con prev y next con mismos checksums devuelve los 3 changed=false", () => {
    expect(compareManifests(manifestValido, manifestValido)).toEqual({
      mainChanged: false,
      runtimeChanged: false,
      catalogChanged: false,
    });
  });

  test("con mainChecksum distinto devuelve mainChanged=true y los otros 2 false", () => {
    const next: RuntimeArtifactManifest = {
      ...manifestValido,
      mainChecksum: "main-xyz",
    };
    expect(compareManifests(manifestValido, next)).toEqual({
      mainChanged: true,
      runtimeChanged: false,
      catalogChanged: false,
    });
  });
});
