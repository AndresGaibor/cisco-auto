// packages/pt-runtime/src/build/render-catalog.ts
// Genera catalog.js — módulo estático con constantes de PT (device types, cable types, etc.)
// Usa un pipeline ligero (sin TypeScript transpilation costosa) porque
// pt-constants.ts solo contiene export const/interface — sin imports ni lógica compleja.

import * as fs from "fs";
import * as path from "path";
import { validatePtSafe } from "./validate-pt-safe.js";
import { reportPtSafeValidation } from "./build-utils.js";

export interface RenderCatalogOptions {
  srcDir: string;
  outputPath?: string;
}

const CATALOG_SOURCE_FILES = ["pt-api/pt-constants.ts"];

function assembleCatalogOutput(code: string): string {
  return `(function() {
  // catalog.js — Constantes estáticas de PT: device types, cable types, módulos
  // No editar directamente — regenerar con: bun run build:catalog
${code}

  // Exponer constantes al scope global de PT para que runtime.js pueda acceder
  var _g = typeof self !== "undefined" ? self : this;
  _g.PT_CATALOG = PT_HELPER_MAPS;
  _g.PT_CABLE_TYPES = CABLE_TYPES || {};
  _g.PT_DEVICE_TYPES = DEVICE_TYPES || {};
})();
`;
}

function transpileConstants(source: string): string {
  let result = source;

  result = result.replace(/\r\n?/g, "\n");

  const lines = result.split("\n");
  const kept: string[] = [];
  let inJSDoc = false;
  let skipBraces = 0;

  for (const raw of lines) {
    const trimmed = raw.trimStart();

    if (inJSDoc) {
      kept.push(raw);
      if (trimmed.includes("*/")) inJSDoc = false;
      continue;
    }
    if (trimmed.startsWith("/**")) {
      kept.push(raw);
      inJSDoc = !trimmed.includes("*/");
      continue;
    }

    // Saltar cuerpos de export interface/type (multi-línea)
    if (skipBraces > 0) {
      skipBraces += (trimmed.match(/\{/g) || []).length;
      skipBraces -= (trimmed.match(/\}/g) || []).length;
      if (skipBraces <= 0) skipBraces = 0;
      continue;
    }
    if (/^export\s+(interface|type)\s/.test(trimmed)) {
      if (!trimmed.endsWith(";")) {
        skipBraces = (trimmed.match(/\{/g) || []).length;
        skipBraces -= (trimmed.match(/\}/g) || []).length;
        if (skipBraces < 0) skipBraces = 0;
      }
      continue;
    }
    if (/^import\s/.test(trimmed)) continue;

    // Strip 'export', reemplazar const/let por var, limpiar anotaciones TS
    let line = trimmed.startsWith("export ") ? raw.replace(/^\s*export\s+/, "  ") : raw;
    line = line.replace(/\bconst\s+/g, "var ");
    line = line.replace(/\blet\s+/g, "var ");

    // Limpiar anotaciones de tipo TS (": Tipo" después de nombre de var/param)
    line = line.replace(/([\w\]\)]+)\s*:\s*(?:string|number|boolean|Record\s*<[^>]+>|Array\s*<[^>]+>|PtHelperMaps|unknown|any)(\s*[={,;])/g, "$1$2");
    line = line.replace(/\[\w+\]\s*:\s*(?:string|number|unknown|boolean)\s*[;,]?/g, "");

    kept.push(line);
  }

  return kept.join("\n");
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

  const source = sourceFiles.get("pt-api/pt-constants.ts") ?? "";
  const code = transpileConstants(source);

  const validation = validatePtSafe(code);
  reportPtSafeValidation("render-catalog", validation);
  if (!validation.valid) {
    throw new Error("catalog.js generation failed PT-safe validation");
  }

  const header = `// PT Catalog — Generated from pt-constants.ts via lightweight transpiler
// Do not edit directly — regenerate with: bun run build:catalog
`;
  const output = header + assembleCatalogOutput(code);

  if (options.outputPath) {
    fs.mkdirSync(path.dirname(options.outputPath), { recursive: true });
    fs.writeFileSync(options.outputPath, output, "utf-8");
  }

  return output;
}
