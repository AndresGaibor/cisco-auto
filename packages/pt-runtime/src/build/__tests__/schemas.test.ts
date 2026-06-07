// packages/pt-runtime/src/build/__tests__/schemas.test.ts
import { describe, expect, test } from "bun:test";

import {
  RenderMainV2OptionsSchema,
  RenderRuntimeV2OptionsSchema,
  RenderCatalogOptionsSchema,
  RuntimeGeneratorConfigSchema,
} from "../schemas/build-options.schema";
import {
  RuntimeArtifactManifestSchema,
} from "../schemas/runtime-artifact.schema";
import {
  MainArtifactContractSchema,
  RuntimeArtifactContractSchema,
  CatalogArtifactContractSchema,
} from "../schemas/main-artifact.schema";

describe("RenderMainV2OptionsSchema", () => {
  test("rechaza srcDir vacío", () => {
    const resultado = RenderMainV2OptionsSchema.safeParse({
      srcDir: "",
      outputPath: "/tmp/main.js",
    });

    expect(resultado.success).toBe(false);
  });

  test("acepta opciones válidas", () => {
    const resultado = RenderMainV2OptionsSchema.safeParse({
      srcDir: "./src",
      outputPath: "/tmp/main.js",
      injectDevDir: "/tmp/pt-dev",
      minify: true,
    });

    expect(resultado.success).toBe(true);
  });

  test("expone description con 'renderMainV2'", () => {
    expect(RenderMainV2OptionsSchema.description).toContain("renderMainV2");
  });
});

describe("RenderRuntimeV2OptionsSchema", () => {
  test("rechaza srcDir vacío", () => {
    const resultado = RenderRuntimeV2OptionsSchema.safeParse({
      srcDir: "",
      outputPath: "/tmp/runtime.js",
    });

    expect(resultado.success).toBe(false);
  });

  test("acepta opciones válidas", () => {
    const resultado = RenderRuntimeV2OptionsSchema.safeParse({
      srcDir: "./src",
      outputPath: "/tmp/runtime.js",
      injectDevDir: "/tmp/pt-dev",
      minify: false,
    });

    expect(resultado.success).toBe(true);
  });

  test("expone description con 'renderRuntimeV2'", () => {
    expect(RenderRuntimeV2OptionsSchema.description).toContain("renderRuntimeV2");
  });
});

describe("RenderCatalogOptionsSchema", () => {
  test("rechaza srcDir vacío", () => {
    const resultado = RenderCatalogOptionsSchema.safeParse({
      srcDir: "",
    });

    expect(resultado.success).toBe(false);
  });

  test("acepta opciones válidas", () => {
    const resultado = RenderCatalogOptionsSchema.safeParse({
      srcDir: "./src",
    });

    expect(resultado.success).toBe(true);
  });
});

describe("RuntimeGeneratorConfigSchema", () => {
  test("rechaza devDir vacío", () => {
    const resultado = RuntimeGeneratorConfigSchema.safeParse({
      devDir: "",
      outputDir: "/tmp/pt-dev",
    });

    expect(resultado.success).toBe(false);
  });

  test("acepta config válida", () => {
    const resultado = RuntimeGeneratorConfigSchema.safeParse({
      devDir: "/tmp/pt-dev",
      outputDir: "/tmp/pt-dev",
      minify: true,
    });

    expect(resultado.success).toBe(true);
  });
});

describe("RuntimeArtifactManifestSchema", () => {
  const manifestValido = {
    schemaVersion: "1.0.0",
    cliVersion: "0.1.0",
    protocolVersion: 1,
    mainChecksum: "abc123",
    catalogChecksum: "def456",
    runtimeChecksum: "ghi789",
    modules: {
      main: "main.js",
      catalog: "catalog.js",
      runtime: "runtime.js",
    },
    reload: {
      mainManualReloadRequiredWhenChanged: true,
      runtimeHotReloadable: true,
      catalogHotReloadable: true,
    },
  };

  test("rechaza cuando falta mainChecksum", () => {
    const { mainChecksum: _omitido, ...resto } = manifestValido;
    const resultado = RuntimeArtifactManifestSchema.safeParse(resto);

    expect(resultado.success).toBe(false);
  });

  test("rechaza cuando falta catalogChecksum", () => {
    const { catalogChecksum: _omitido, ...resto } = manifestValido;
    const resultado = RuntimeArtifactManifestSchema.safeParse(resto);

    expect(resultado.success).toBe(false);
  });

  test("rechaza cuando falta runtimeChecksum", () => {
    const { runtimeChecksum: _omitido, ...resto } = manifestValido;
    const resultado = RuntimeArtifactManifestSchema.safeParse(resto);

    expect(resultado.success).toBe(false);
  });

  test("acepta un manifest válido completo", () => {
    const resultado = RuntimeArtifactManifestSchema.safeParse(manifestValido);

    expect(resultado.success).toBe(true);
  });

  test("rechaza si protocolVersion es negativo", () => {
    const resultado = RuntimeArtifactManifestSchema.safeParse({
      ...manifestValido,
      protocolVersion: -1,
    });

    expect(resultado.success).toBe(false);
  });

  test("rechaza si protocolVersion no es entero", () => {
    const resultado = RuntimeArtifactManifestSchema.safeParse({
      ...manifestValido,
      protocolVersion: 1.5,
    });

    expect(resultado.success).toBe(false);
  });
});

describe("MainArtifactContractSchema", () => {
  test("acepta shape con booleans", () => {
    const resultado = MainArtifactContractSchema.safeParse({
      containsMainFunction: true,
      containsCleanUpFunction: true,
      containsCreateKernel: true,
      containsLoadModule: true,
      hasDuplicateTslibHelpers: false,
      hasRuntimeDispatcher: true,
      isValidJavaScript: true,
    });

    expect(resultado.success).toBe(true);
  });
});

describe("RuntimeArtifactContractSchema", () => {
  test("acepta shape con booleans", () => {
    const resultado = RuntimeArtifactContractSchema.safeParse({
      containsPtDispatch: true,
      containsRuntimeDispatcher: true,
      containsTslibValues: true,
      containsTslibRead: true,
      hasKernelLifecycle: true,
      hasDuplicateTslibHelpers: false,
      isValidJavaScript: true,
    });

    expect(resultado.success).toBe(true);
  });
});

describe("CatalogArtifactContractSchema", () => {
  test("acepta shape con booleans", () => {
    const resultado = CatalogArtifactContractSchema.safeParse({
      containsCatalogConstants: true,
      hasKernelLifecycle: false,
      hasRuntimeDispatcher: false,
      isValidJavaScript: true,
    });

    expect(resultado.success).toBe(true);
  });
});
