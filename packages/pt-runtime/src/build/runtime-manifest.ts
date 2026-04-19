// packages/pt-runtime/src/build/runtime-manifest.ts
// Manifiesto completo de archivos para el runtime
// Usado por render-runtime-v2.ts para generar runtime.js

import * as path from "path";
import * as ts from "typescript";

export const RUNTIME_MANIFEST = {
  version: 3,
  description: "Lista completa de archivos TypeScript para generar los módulos PT via AST pipeline V2",

  // catalog: constantes estáticas de PT — raramente cambian.
  // Se genera como catalog.js separado, cargado primero por main.js.
  catalog: [
    "pt-api/pt-constants.ts",
  ],

  ptApi: [
    "pt-api/pt-api-registry.ts",
    // pt-constants.ts ya está en catalog — no duplicar en runtime
    "pt-api/pt-results.ts",
    "pt-api/pt-deps.ts",
    "pt-api/pt-helpers.ts",
    "pt-api/pt-call-inventory.ts",
    "pt-api/pt-types.ts",
    "pt-api/pt-processes.ts",
    "pt-api/pt-events.ts",
    "pt-api/index.ts",
  ],

  runtime: [
    "runtime/contracts.ts",
    "runtime/constants.ts",
    "runtime/types.ts",
    "runtime/helpers.ts",
    // NOTE: runtime/index.ts excluded — only TS re-exports + has globalThis reference
  ],

  domain: [
    "domain/index.ts",
    "domain/contracts.ts",
    "domain/deferred-job-plan.ts",
    "domain/runtime-result.ts",
    "domain/link-types.ts",
    "domain/port-owner-index.ts",
    "domain/link-registry.ts",
    "domain/pt-link-collector.ts",
    "domain/link-merge.ts",
    "domain/ios-plans.ts",
  ],

  utils: [
    "utils/helpers.ts",
    "utils/constants.ts",
    "utils/parser-generator.ts",
    "utils/device-creation.ts",
    "utils/device-utils.ts",
    "utils/device-xml-parser.ts",
    "utils/handler-types.ts",
    "utils/port-utils.ts",
    "utils/index.ts",
  ],

  valueObjects: [
    "value-objects/validated-models.ts",
  ],

  core: [
    "core/registry.ts",
    "core/dispatcher.ts",
  ],

  handlers: [
    // Handler implementations
    "handlers/dispatcher.ts",
    "handlers/device-crud.ts",
    "handlers/device-discovery.ts",
    "handlers/device.ts",
    "handlers/device-classifier.ts",
    "handlers/device-listing.ts",
    "handlers/device-config.ts",
    "handlers/deep-inspect.ts",
    "handlers/evaluate.ts",
    "handlers/omniscience-physical.ts",
    "handlers/omniscience-logical.ts",
    "handlers/omniscience-environment.ts",
    "handlers/omniscience-telepathy.ts",
    "handlers/omniscience-utils.ts",
    "handlers/link.ts",
    "handlers/add-link.ts",
    "handlers/remove-link.ts",
    "handlers/inspect.ts",
    "handlers/module.ts",
    "handlers/module/index.ts",
    "handlers/module/constants.ts",
    "handlers/module/helpers.ts",
    "handlers/module/handlers.ts",
    "handlers/module/slot-finder.ts",
    "handlers/canvas.ts",
    "handlers/vlan.ts",
    "handlers/dhcp.ts",
    "handlers/host.ts",
    "handlers/result-factories.ts",
    "handlers/host-handler.ts",
    "handlers/ios-execution.ts",
    "handlers/ios-plan-builder.ts",
    "handlers/terminal-sanitizer.ts",
    "handlers/cable-recommender.ts",
    // IOS show command parsers (pure functions, no PT dependencies)
    "handlers/parsers/ios-parsers.ts",
    // IOS output classification (pure functions, no event handling)
    "handlers/ios-output-classifier.ts",
    // Main dispatcher
    "handlers/runtime-handlers.ts",
    // NOTE: ios-engine.ts removed — IosSessionEngine duplicated terminal-engine.ts + job-executor.ts
    // NOTE: ios-session.ts removed — inferModeFromPrompt duplicated prompt-parser.ts
  ],

  // NOTE: kernel and terminal are NOT included in runtime.js.
  // They belong exclusively to main.js (MAIN_MANIFEST).
  // runtime.js only contains: ptApi, runtime contracts, utils, core, and handlers.
} as const;

export type RuntimeManifestSection = keyof typeof RUNTIME_MANIFEST;

export function getCatalogFiles(): string[] {
  return [...RUNTIME_MANIFEST.catalog];
}

export function getAllRuntimeFiles(): string[] {
  const files: string[] = [];
  // Exclude "catalog" section — it goes to catalog.js, not runtime.js
  const excluded = new Set<string>(["version", "description", "catalog"]);
  for (const section of Object.keys(RUNTIME_MANIFEST) as RuntimeManifestSection[]) {
    if (excluded.has(section)) continue;
    files.push(...(RUNTIME_MANIFEST[section] as readonly string[]));
  }
  return files;
}

export function getRuntimeManifestSize(): number {
  return getAllRuntimeFiles().length;
}

export function validateRuntimeManifestDependencies(sourceFiles: Map<string, string>): string[] {
  const manifestFiles = new Set(getAllRuntimeFiles());
  const missing = new Set<string>();

  for (const [filePath, content] of sourceFiles) {
    const sf = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);

    sf.forEachChild((node) => {
      if (ts.isImportDeclaration(node)) {
        const specifier = node.moduleSpecifier;
        if (!specifier || !ts.isStringLiteral(specifier) || isTypeOnlyImport(node)) return;
        const resolved = resolveManifestImport(filePath, specifier.text, manifestFiles);
        if (resolved && !manifestFiles.has(resolved)) missing.add(resolved);
      }

      if (ts.isExportDeclaration(node)) {
        const specifier = node.moduleSpecifier;
        if (!specifier || !ts.isStringLiteral(specifier) || node.isTypeOnly) return;
        const resolved = resolveManifestImport(filePath, specifier.text, manifestFiles);
        if (resolved && !manifestFiles.has(resolved)) missing.add(resolved);
      }
    });
  }

  return Array.from(missing).sort();
}

function isTypeOnlyImport(node: ts.ImportDeclaration): boolean {
  const clause = node.importClause;
  if (!clause) return false;
  if (clause.isTypeOnly) return true;
  const bindings = clause.namedBindings;
  if (bindings && ts.isNamedImports(bindings)) {
    return bindings.elements.length > 0 && bindings.elements.every((element) => element.isTypeOnly);
  }
  return false;
}

function resolveManifestImport(
  fromFile: string,
  specifier: string,
  knownFiles: Set<string>,
): string | null {
  if (!specifier.startsWith(".")) return null;

  const fromDir = path.posix.dirname(fromFile);
  const normalized = path.posix.normalize(path.posix.join(fromDir, specifier));
  const candidates = new Set<string>([
    normalized,
    normalized.replace(/\.js$/, ".ts"),
    normalized.replace(/\.js$/, ".tsx"),
    normalized + ".ts",
    normalized + ".tsx",
    path.posix.join(normalized, "index.ts"),
    path.posix.join(normalized, "index.tsx"),
  ]);

  let fallback: string | null = null;

  for (const candidate of candidates) {
    if (!fallback && (candidate.endsWith(".ts") || candidate.endsWith(".tsx"))) {
      fallback = candidate;
    }
    if (knownFiles.has(candidate)) {
      return candidate;
    }
  }

  return fallback;
}
