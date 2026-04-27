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
    "domain/live-link.ts",
    "domain/port-owner-index.ts",
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
    "handlers/handler-registry.ts",
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
    "handlers/verify-link.ts",
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
    "handlers/ios/index.ts",
    "handlers/ios-execution.ts",
    "handlers/ios-plan-builder.ts",
    "handlers/terminal-sanitizer.ts",
    "handlers/cable-recommender.ts",
    "handlers/ios/ios-session-utils.ts",
    "handlers/ios/host-stabilize.ts",
    "handlers/ios/ios-result-mapper.ts",
    "handlers/ios/exec-ios-handler.ts",
    "handlers/ios/config-ios-handler.ts",
    "handlers/ios/deferred-poll-handler.ts",
    "handlers/ios/ping-handler.ts",
    "handlers/ios/exec-pc-handler.ts",
    "handlers/ios/read-terminal-handler.ts",
    // IOS show command parsers (pure functions, no PT dependencies)
    "handlers/parsers/ios-parsers.ts",
    // IOS output classification (pure functions, no event handling)
    "handlers/ios-output-classifier.ts",
    // Main dispatcher
    "handlers/runtime-handlers.ts",
    // Registration handlers
    "handlers/registration/stable-handlers.ts",
    "handlers/registration/experimental-handlers.ts",
    "handlers/registration/omni-handlers.ts",
    "handlers/registration/runtime-registration.ts",
    // NOTE: ios-engine.ts removed — IosSessionEngine duplicated terminal-engine.ts + job-executor.ts
    // NOTE: ios-session.ts removed — inferModeFromPrompt duplicated prompt-parser.ts
  ],

  primitives: [
    "templates/generated-module-map.ts",
    "primitives/module/index.ts",
    "primitives/primitive-registry.ts",
  ],

  terminal: [
    "pt/terminal/prompt-parser.ts",
    "pt/terminal/command-executor.ts",
    "pt/terminal/terminal-engine.ts",
    "pt/terminal/terminal-session.ts",
    "pt/terminal/terminal-events.ts",
    "terminal/command-executor.ts",
    "terminal/prompt-detector.ts",
    "terminal/session-registry.ts",
    "terminal/session-state.ts",
    "terminal/pager-handler.ts",
    "terminal/confirm-handler.ts",
    "terminal/command-sanitizer.ts",
    "terminal/stability-heuristic.ts",
    "terminal/terminal-errors.ts",
    "terminal/terminal-ready.ts",
    "terminal/command-output-extractor.ts",
    "terminal/terminal-semantic-verifier.ts",
    "terminal/terminal-recovery.ts",
    "terminal/terminal-plan.ts",
    "terminal/mode-guard.ts",
    "terminal/plan-engine.ts",
    "terminal/standard-plans.ts",
    "terminal/ios-evidence.ts",
    "terminal/engine/index.ts",
    "terminal/engine/terminal-event-collector.ts",
    "terminal/engine/terminal-completion-controller.ts",
    "terminal/engine/terminal-output-pipeline.ts",
    "terminal/engine/terminal-error-resolver.ts",
    "terminal/engine/terminal-recovery-controller.ts",
    "terminal/engine/terminal-observability.ts",
    "terminal/engine/command-executor.ts",
    "terminal/engine/command-state-machine.ts",
    "terminal/terminal-utils.ts",
    "terminal/index.ts",
  ],

  ptApiRegistry: [
    "pt-api/registry/index.ts",
    "pt-api/registry/all-types.ts",
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

// ============================================================================
// PARTE 2: RuntimeManifest — metadatos del runtime generado
// ============================================================================

import { computeChecksum, normalizeArtifactForChecksum } from "./checksum.js";

export interface AssetMetadata {
  filename: string;
  checksum: string;
  size: number;
  mtime: number;
}

export interface RuntimeManifest {
  version: string;
  generatedAt: number;
  buildFingerprint: string;
  assetMain: AssetMetadata;
  assetRuntime: AssetMetadata;
  assetCatalog: AssetMetadata;
  primitives: string[];
  omniAdapters: string[];
  commandIds: string[];
  deviceIds: string[];
}

export interface ManifestValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

class RuntimeManifestBuilderImpl {
  private _version = "1.0.0";
  private _fingerprint = "";
  private _assetMain: AssetMetadata | null = null;
  private _assetRuntime: AssetMetadata | null = null;
  private _assetCatalog: AssetMetadata | null = null;
  private _primitives: string[] = [];
  private _omniAdapters: string[] = [];
  private _commandIds: string[] = [];
  private _deviceIds: string[] = [];

  withVersion(v: string): this {
    this._version = v;
    return this;
  }

  withFingerprint(f: string): this {
    this._fingerprint = f;
    return this;
  }

  withAsset(name: "main" | "runtime" | "catalog", meta: AssetMetadata): this {
    switch (name) {
      case "main":
        this._assetMain = meta;
        break;
      case "runtime":
        this._assetRuntime = meta;
        break;
      case "catalog":
        this._assetCatalog = meta;
        break;
    }
    return this;
  }

  withPrimitive(id: string): this {
    this._primitives.push(id);
    return this;
  }

  withOmniAdapter(id: string): this {
    this._omniAdapters.push(id);
    return this;
  }

  withCommandId(id: string): this {
    this._commandIds.push(id);
    return this;
  }

  withDeviceId(id: string): this {
    this._deviceIds.push(id);
    return this;
  }

  build(): RuntimeManifest {
    if (!this._assetMain || !this._assetRuntime || !this._assetCatalog) {
      throw new Error("RuntimeManifest requires all asset metadata (main, runtime, catalog)");
    }

    return {
      version: this._version,
      generatedAt: Date.now(),
      buildFingerprint: this._fingerprint,
      assetMain: this._assetMain,
      assetRuntime: this._assetRuntime,
      assetCatalog: this._assetCatalog,
      primitives: [...this._primitives],
      omniAdapters: [...this._omniAdapters],
      commandIds: [...this._commandIds],
      deviceIds: [...this._deviceIds],
    };
  }

  toJSON(): string {
    return JSON.stringify(this.build(), null, 2);
  }
}

export function createRuntimeManifest(): RuntimeManifestBuilder {
  return new RuntimeManifestBuilderImpl();
}

export interface RuntimeManifestBuilder {
  withVersion(v: string): this;
  withFingerprint(f: string): this;
  withAsset(name: "main" | "runtime" | "catalog", meta: AssetMetadata): this;
  withPrimitive(id: string): this;
  withOmniAdapter(id: string): this;
  withCommandId(id: string): this;
  withDeviceId(id: string): this;
  build(): RuntimeManifest;
  toJSON(): string;
}

export function validateManifest(manifest: RuntimeManifest): ManifestValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!manifest.version || typeof manifest.version !== "string") {
    errors.push("manifest.version is required and must be a string");
  }

  if (!manifest.generatedAt || typeof manifest.generatedAt !== "number") {
    errors.push("manifest.generatedAt is required and must be a number");
  }

  if (!manifest.buildFingerprint || typeof manifest.buildFingerprint !== "string") {
    errors.push("manifest.buildFingerprint is required and must be a string");
  }

  if (!manifest.assetMain) {
    errors.push("manifest.assetMain is required");
  } else {
    if (!manifest.assetMain.filename) errors.push("manifest.assetMain.filename is required");
    if (!manifest.assetMain.checksum) errors.push("manifest.assetMain.checksum is required");
    if (typeof manifest.assetMain.size !== "number") errors.push("manifest.assetMain.size must be a number");
    if (typeof manifest.assetMain.mtime !== "number") errors.push("manifest.assetMain.mtime must be a number");
  }

  if (!manifest.assetRuntime) {
    errors.push("manifest.assetRuntime is required");
  } else {
    if (!manifest.assetRuntime.filename) errors.push("manifest.assetRuntime.filename is required");
    if (!manifest.assetRuntime.checksum) errors.push("manifest.assetRuntime.checksum is required");
    if (typeof manifest.assetRuntime.size !== "number") errors.push("manifest.assetRuntime.size must be a number");
    if (typeof manifest.assetRuntime.mtime !== "number") errors.push("manifest.assetRuntime.mtime must be a number");
  }

  if (!manifest.assetCatalog) {
    errors.push("manifest.assetCatalog is required");
  } else {
    if (!manifest.assetCatalog.filename) errors.push("manifest.assetCatalog.filename is required");
    if (!manifest.assetCatalog.checksum) errors.push("manifest.assetCatalog.checksum is required");
    if (typeof manifest.assetCatalog.size !== "number") errors.push("manifest.assetCatalog.size must be a number");
    if (typeof manifest.assetCatalog.mtime !== "number") errors.push("manifest.assetCatalog.mtime must be a number");
  }

  if (!Array.isArray(manifest.primitives)) {
    errors.push("manifest.primitives must be an array");
  }

  if (!Array.isArray(manifest.omniAdapters)) {
    errors.push("manifest.omniAdapters must be an array");
  }

  if (!Array.isArray(manifest.commandIds)) {
    errors.push("manifest.commandIds must be an array");
  }

  if (!Array.isArray(manifest.deviceIds)) {
    errors.push("manifest.deviceIds must be an array");
  }

  if (manifest.primitives.length === 0) {
    warnings.push("manifest.primitives is empty — no primitives registered");
  }

  if (manifest.omniAdapters.length === 0) {
    warnings.push("manifest.omniAdapters is empty — no omni adapters registered");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export function fingerprintFromCode(
  mainCode: string,
  runtimeCode: string,
  catalogCode: string,
): string {
  const combined = normalizeArtifactForChecksum(mainCode) +
    "|" +
    normalizeArtifactForChecksum(runtimeCode) +
    "|" +
    normalizeArtifactForChecksum(catalogCode);

  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}
