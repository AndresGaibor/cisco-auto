// packages/pt-runtime/src/build/__tests__/catalog-generator.test.ts
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import { generateCatalogAsset, type CatalogGeneratorConfig } from "../catalog-generator";

const MOCK_CATALOG_CODE = `
export const DEVICE_TYPES = {
  router: 0,
  switch: 1,
  pc: 8,
  server: 9,
};

export const CABLE_TYPES = {
  auto: -1,
  straight: 0,
  cross: 1,
  fiber: 2,
  serial: 3,
  console: 4,
};

export const PT_HELPER_MAPS = {
  DEVICE_TYPES,
  CABLE_TYPES,
};
`;

const MOCK_NON_CATALOG_CODE = `
export function handleAddDevice(payload) {
  return { ok: true };
}
`;

describe("catalog-generator", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join("/tmp", "pt-catalog-test-"));
    const srcDir = path.join(tempDir, "src");
    fs.mkdirSync(srcDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  function createConfig(overrides: Partial<CatalogGeneratorConfig> = {}): CatalogGeneratorConfig {
    return {
      srcDir: path.join(tempDir, "src"),
      outputPath: path.join(tempDir, "out", "catalog.js"),
      ...overrides,
    };
  }

  it("genera codigo de catalogo valido", () => {
    const ptConstantsPath = path.join(tempDir, "src", "pt-api", "pt-constants.ts");
    fs.mkdirSync(path.dirname(ptConstantsPath), { recursive: true });
    fs.writeFileSync(ptConstantsPath, MOCK_CATALOG_CODE);

    const config = createConfig();
    const result = generateCatalogAsset(config);

    expect(result.code).toBeTruthy();
    expect(result.code.length).toBeGreaterThan(0);
    expect(result.catalogs.length).toBeGreaterThan(0);
  });

  it("no contiene logica ejecutiva", () => {
    const ptConstantsPath = path.join(tempDir, "src", "pt-api", "pt-constants.ts");
    fs.mkdirSync(path.dirname(ptConstantsPath), { recursive: true });
    fs.writeFileSync(ptConstantsPath, MOCK_CATALOG_CODE);

    const config = createConfig();
    const result = generateCatalogAsset(config);

    const executiveLogicErrors = result.structuralErrors.filter(
      (e) => e.includes("executive logic") || e.includes("runtimeDispatcher"),
    );
    expect(executiveLogicErrors).toHaveLength(0);
  });

  it("el codigo pasa validacion ES5", () => {
    const ptConstantsPath = path.join(tempDir, "src", "pt-api", "pt-constants.ts");
    fs.mkdirSync(path.dirname(ptConstantsPath), { recursive: true });
    fs.writeFileSync(ptConstantsPath, MOCK_CATALOG_CODE);

    const config = createConfig();
    const result = generateCatalogAsset(config);

    const hasIIFE = result.code.includes("(function()");
    expect(hasIIFE).toBe(true);

    const usesVar = result.code.includes("var ");
    expect(usesVar).toBe(true);
  });

  it("genera checksum no vacio", () => {
    const ptConstantsPath = path.join(tempDir, "src", "pt-api", "pt-constants.ts");
    fs.mkdirSync(path.dirname(ptConstantsPath), { recursive: true });
    fs.writeFileSync(ptConstantsPath, MOCK_CATALOG_CODE);

    const config = createConfig();
    const result = generateCatalogAsset(config);

    expect(result.checksum).toBeTruthy();
    expect(result.checksum.length).toBeGreaterThan(0);
  });

  it("retorna estructura GeneratedCatalogAsset completa", () => {
    const ptConstantsPath = path.join(tempDir, "src", "pt-api", "pt-constants.ts");
    fs.mkdirSync(path.dirname(ptConstantsPath), { recursive: true });
    fs.writeFileSync(ptConstantsPath, MOCK_CATALOG_CODE);

    const config = createConfig();
    const result = generateCatalogAsset(config);

    expect(result).toHaveProperty("code");
    expect(result).toHaveProperty("checksum");
    expect(result).toHaveProperty("catalogs");
    expect(result).toHaveProperty("structuralErrors");
    expect(Array.isArray(result.catalogs)).toBe(true);
    expect(Array.isArray(result.structuralErrors)).toBe(true);
  });

  it("maneja caso sin archivos fuente gracefully", () => {
    const emptyConfig: CatalogGeneratorConfig = {
      srcDir: "/non/existent/path",
      outputPath: "/tmp/out/catalog.js",
    };
    const result = generateCatalogAsset(emptyConfig);

    expect(result.code).toBeTruthy();
    expect(result.code.length).toBeGreaterThan(0);
    expect(result.code).toContain("PT_CATALOG");
  });
});
