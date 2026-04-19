// packages/pt-runtime/src/build/catalog-generator.ts
// Generador de catalog.js — estructura de catálogos limpios.
//
// Responsabilidades de catalog.js:
//   - Estructura de catálogos (device types, cable types, módulos)
//   - Constantes estáticas de PT
//
// NO lógica ejecutiva.

import * as fs from "fs";
import * as path from "path";
import { transformToPtSafeAst } from "./ast-transform.js";
import { validatePtSafe, formatValidationResult } from "./validate-pt-safe.js";
import { computeChecksum, normalizeArtifactForChecksum } from "./checksum.js";
import { getCatalogFiles } from "./runtime-manifest.js";

export interface CatalogGeneratorConfig {
  srcDir: string;
  outputPath: string;
}

export interface GeneratedCatalogAsset {
  code: string;
  checksum: string;
  catalogs: string[];
  structuralErrors: string[];
}

const CATALOG_SOURCE_FILES = getCatalogFiles();

function assembleCatalogOutput(code: string): string {
  return `(function() {
  // catalog.js — Constantes estáticas de PT: device types, cable types, módulos
  // No editar directamente — regenerar con: bun run build:catalog
${code}

  // Exponer constantes al scope global de PT para que runtime.js pueda acceder
  var _g = typeof self !== "undefined" ? self : this;
  if (typeof PT_HELPER_MAPS !== "undefined") {
    _g.PT_CATALOG = PT_HELPER_MAPS;
    _g.PT_CABLE_TYPES = PT_HELPER_MAPS.CABLE_TYPES || {};
    _g.PT_DEVICE_TYPES = PT_HELPER_MAPS.DEVICE_TYPES || {};
  }
})();
`;
}

export function generateCatalogAsset(config: CatalogGeneratorConfig): GeneratedCatalogAsset {
  const sourceFiles = new Map<string, string>();

  for (const relPath of CATALOG_SOURCE_FILES) {
    const filePath = path.join(config.srcDir, relPath);
    if (fs.existsSync(filePath)) {
      sourceFiles.set(relPath, fs.readFileSync(filePath, "utf-8"));
    }
  }

  if (sourceFiles.size === 0) {
    for (const relPath of CATALOG_SOURCE_FILES) {
      const filePath = path.join(process.cwd(), "src", relPath);
      if (fs.existsSync(filePath)) {
        sourceFiles.set(relPath, fs.readFileSync(filePath, "utf-8"));
      }
    }
  }

  const structuralErrors: string[] = [];

  if (sourceFiles.size === 0) {
    const fallbackCode = `(function() {
  // catalog.js — empty fallback (no source files found)
  var _g = typeof self !== "undefined" ? self : this;
  _g.PT_CATALOG = {};
  _g.PT_CABLE_TYPES = {};
  _g.PT_DEVICE_TYPES = {};
})();
`;
    const normalized = normalizeArtifactForChecksum(fallbackCode);
    return {
      code: fallbackCode,
      checksum: computeChecksum(normalized),
      catalogs: [],
      structuralErrors: ["No source files found for catalog generation"],
    };
  }

  const { code, validation } = transformToPtSafeAst(sourceFiles, {
    target: undefined,
    replaceConsoleWithDprint: true,
    wrapIIFE: false,
    inlineConstants: {},
    treeShake: false,
  });

  if (!validation.valid) {
    structuralErrors.push(
      ...validation.errors.map(
        (e) => `PT-safe validation error at ${e.line}:${e.column}: ${e.message}`,
      ),
    );
  }

  const buildTimestamp = new Date().toISOString();
  const header = `// PT Catalog - Generated from TypeScript via AST pipeline
// Do not edit directly — regenerate with: bun run build:catalog
// Generated at: ${buildTimestamp}
`;

  const fullCode = header + assembleCatalogOutput(code);

  const normalized = normalizeArtifactForChecksum(fullCode);
  const checksum = computeChecksum(normalized);

  return {
    code: fullCode,
    checksum,
    catalogs: [...CATALOG_SOURCE_FILES],
    structuralErrors,
  };
}

export function generateCatalogAssetSync(config: CatalogGeneratorConfig): GeneratedCatalogAsset {
  const result = generateCatalogAsset(config);

  if (config.outputPath) {
    fs.mkdirSync(path.dirname(config.outputPath), { recursive: true });
    fs.writeFileSync(config.outputPath, result.code, "utf-8");
  }

  return result;
}
