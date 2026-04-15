// packages/pt-runtime/src/build/runtime-manifest.ts
// Manifiesto completo de archivos para el runtime
// Usado por render-runtime-v2.ts para generar runtime.js

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

  utils: [
    "utils/helpers.ts",
    "utils/constants.ts",
    "utils/parser-generator.ts",
    "utils/index.ts",
  ],

  core: [
    "core/registry.ts",
    "core/dispatcher.ts",
  ],

  handlers: [
    // Handler implementations
    "handlers/device.ts",
    "handlers/link.ts",
    "handlers/inspect.ts",
    "handlers/module.ts",
    "handlers/canvas.ts",
    "handlers/vlan.ts",
    "handlers/dhcp.ts",
    "handlers/host.ts",
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

