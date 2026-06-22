// packages/pt-runtime/src/build/runtime-manifest.ts
// Manifiesto completo de archivos para el runtime
// Usado por render-runtime-v2.ts para generar runtime.js

import { findMissingTransitiveDeps } from "./build-utils.js";

export const RUNTIME_MANIFEST = {
  version: 3,
  description: "Lista completa de archivos TypeScript para generar los módulos PT via AST pipeline V2",

  catalog: [
    "pt-api/pt-constants.ts",
  ],

ptApi: [
    "pt-api/pt-api-registry.ts",
    "pt-api/pt-constants.ts",
    "pt-api/pt-results.ts",
    "pt-api/pt-deps.ts",
    "pt-api/pt-call-inventory.ts",
    "pt-api/pt-types.ts",
    "pt-api/pt-processes.ts",
    "pt-api/pt-events.ts",
    "pt-api/registry/device.ts",
    "pt-api/registry/file.ts",
    "pt-api/registry/managers.ts",
    "pt-api/registry/method-index.ts",
    "pt-api/registry/network.ts",
    "pt-api/registry/port.ts",
    "pt-api/registry/terminal.ts",
    "pt-api/registry/workspace.ts",
    "pt-api/index.ts",
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
    "utils/constants.ts",
    "utils/helpers.ts",
    "utils/device-creation.ts",
    "utils/device-utils.ts",
    "utils/device-xml-parser.ts",
    "utils/xml-tag-helpers.ts",
    "utils/handler-types.ts",
    "utils/port-utils.ts",
  ],

  valueObjects: [
    "value-objects/validated-models.ts",
  ],

  core: [
  ],

  handlers: [
    "handlers/handler-registry.ts",
    "handlers/dispatcher.ts",
    "handlers/evaluate.ts",
    "handlers/device-crud.ts",
    "handlers/device-discovery.ts",
    "handlers/device-dhcp-flag.ts",
    "handlers/device-info.ts",
    "handlers/device-power.ts",
    "handlers/device.ts",
    "handlers/device-classifier.ts",
    "handlers/device-listing.ts",
    "handlers/device-config.ts",
    "handlers/inspect.ts",
    "handlers/file-operations.ts",
    "handlers/port-config.ts",
    "handlers/module/index.ts",
    "handlers/module/constants.ts",
    "handlers/module/helpers.ts",
    "handlers/module/handlers.ts",
    "handlers/module/slot-finder.ts",
    "handlers/link.ts",
    "handlers/list-links.ts",
    "handlers/add-link.ts",
    "handlers/remove-link.ts",
    "handlers/verify-link.ts",
    "handlers/canvas.ts",
    "handlers/vlan.ts",
    "handlers/dhcp.ts",
    "handlers/host.ts",
    "handlers/result-factories.ts",
    "handlers/deferred-job-factory.ts",
    "handlers/host-handler.ts",
    "handlers/terminal-plan-run.ts",
    "handlers/poll-deferred.ts",
    "handlers/terminal-native-exec.ts",
    "handlers/ios-execution.ts",
    "handlers/ios/index.ts",
    "handlers/ios/exec-ios-handler.ts",
    "handlers/ios/config-ios-handler.ts",
    "handlers/ios/deferred-poll-handler.ts",
    "handlers/ios/ping-handler.ts",
    "handlers/ios/exec-pc-handler.ts",
    "handlers/ios/read-terminal-handler.ts",
    "handlers/terminal-sanitizer.ts",
    "handlers/cable-recommender.ts",
    "handlers/project.ts",
    "handlers/runtime-handlers.ts",
    "handlers/ipc-events.ts",
    "handlers/terminal-events.ts",
    "handlers/registration/stable-handlers.ts",
    "handlers/registration/experimental-handlers.ts",
    "handlers/registration/runtime-registration.ts",
    "handlers/registration/omni-adapter.ts",
    "handlers/omniscience-environment.ts",
    "handlers/omniscience-logical.ts",
    "handlers/omniscience-physical.ts",
    "handlers/omniscience-telepathy.ts",
    "handlers/omniscience-utils.ts",
  ],

  primitives: [
    "primitives/primitive-registry.ts",
    "templates/generated-module-map.ts",
    "primitives/module/index.ts",
    "primitives/snapshot/index.ts",
    "primitives/device/index.ts",
    "primitives/link/index.ts",
    "primitives/host/index.ts",
  ],

  ptApiRegistry: [
    "pt-api/registry/index.ts",
    "pt-api/registry/all-types.ts",
  ],
} as const;

export type RuntimeManifestSection = keyof typeof RUNTIME_MANIFEST;

export function getCatalogFiles(): string[] {
  return [...RUNTIME_MANIFEST.catalog];
}

export function getAllRuntimeFiles(): string[] {
  const files: string[] = [];
  // Exclude "catalog" section — it goes to catalog.js, not runtime.js
  const excluded = new Set<string>(["version", "description", "catalog", "terminal"]);
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
  return findMissingTransitiveDeps(sourceFiles, new Set(getAllRuntimeFiles()));
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
