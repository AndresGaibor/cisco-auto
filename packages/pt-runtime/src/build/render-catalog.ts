// packages/pt-runtime/src/build/render-catalog.ts
// Genera catalog.js — módulo estático con constantes de PT (device types, cable types, etc.)
// Este archivo cambia raramente (solo cuando se actualiza el catálogo de hardware Cisco).
// main.js lo carga primero antes de cargar runtime.js.

import * as fs from "fs";
import * as path from "path";
import { transformToPtSafeAst } from "./ast-transform.js";
import { validatePtSafe, formatValidationResult, type ValidationResult } from "./validate-pt-safe.js";

export interface RenderCatalogOptions {
  srcDir: string;
  outputPath?: string;
}

// Archivos que contienen SOLO constantes estáticas de PT.
// Estas definiciones son estables y no necesitan regenerarse con cada cambio de lógica.
const CATALOG_SOURCE_FILES = [
  "pt-api/pt-constants.ts",
];

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

export function renderCatalog(options: RenderCatalogOptions): string {
  const sourceFiles = new Map<string, string>();

  for (const relPath of CATALOG_SOURCE_FILES) {
    const filePath = path.join(options.srcDir, relPath);
    if (fs.existsSync(filePath)) {
      sourceFiles.set(relPath, fs.readFileSync(filePath, "utf-8"));
    } else {
      console.warn(`[render-catalog] Missing source file: ${filePath}`);
    }
  }

  if (sourceFiles.size === 0) {
    // Si no hay archivos fuente, generar un catalog vacío pero válido
    const fallback = `(function() {
  // catalog.js — empty fallback (no source files found)
  var _g = typeof self !== "undefined" ? self : this;
  _g.PT_CATALOG = {};
  _g.PT_CABLE_TYPES = {};
  _g.PT_DEVICE_TYPES = {};
})();
`;
    if (options.outputPath) {
      fs.mkdirSync(path.dirname(options.outputPath), { recursive: true });
      fs.writeFileSync(options.outputPath, fallback, "utf-8");
    }
    return fallback;
  }

  const { code, validation } = transformToPtSafeAst(sourceFiles, {
    target: undefined,
    replaceConsoleWithDprint: true,
    wrapIIFE: false,
    inlineConstants: {},
    treeShake: false, // treeShake disabled: catalog contains only static constants, no dead code elimination needed
  });

  if (!validation.valid) {
    console.error("[render-catalog] Validation FAILED:");
    for (const issue of validation.errors) {
      console.error(`  ${issue.line}:${issue.column}: ${issue.message}`);
    }
    console.error(formatValidationResult(validation));
    throw new Error("catalog.js generation failed PT-safe validation");
  }

  const header = `// PT Catalog - Generated from TypeScript via AST pipeline
// Do not edit directly — regenerate with: bun run build:catalog
// Generated at: ${new Date().toISOString()}
`;

  const output = header + assembleCatalogOutput(code);

  if (options.outputPath) {
    fs.mkdirSync(path.dirname(options.outputPath), { recursive: true });
    fs.writeFileSync(options.outputPath, output, "utf-8");
  }

  return output;
}
