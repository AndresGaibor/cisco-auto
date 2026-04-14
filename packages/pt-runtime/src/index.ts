// ============================================================================
// PT Runtime - Main exports
// ============================================================================

// Domain layer
export * from "./domain";

// Runtime core
export * from "./runtime";

// Core utilities
export * from "./core";

// Handlers
export * from "./handlers";

// PT Kernel (for PT Script Module)
export * from "./pt/kernel";

// PT Terminal
export * from "./pt/terminal";

// Runtime artifacts (snapshots)
export { listRuntimeSnapshots, restoreRuntimeSnapshot } from "./runtime-artifacts";

// Build system exports
export { validatePtSafe, formatValidationResult } from "./build/validate-pt-safe";
export { renderRuntimeV2, renderRuntimeV2Sync } from "./build/render-runtime-v2";
export { renderMainV2 } from "./build/render-main-v2";
export { renderCatalog } from "./build/render-catalog";
export * from "./build";

// Build utilities
import { validatePtSafe } from "./build/validate-pt-safe";
import { renderRuntimeV2Sync } from "./build/render-runtime-v2";
import { renderMainV2 } from "./build/render-main-v2";
import { renderCatalog } from "./build/render-catalog";
import * as fs from "fs";
import * as path from "path";

function computeChecksum(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

export interface RuntimeGeneratorConfig {
  outputDir: string;
  devDir: string;
}

export interface RuntimeArtifactManifest {
  cliVersion: string;
  protocolVersion: number;
  mainChecksum: string;
  runtimeChecksum: string;
  catalogChecksum: string;
  generatedAt: number;
  modules: {
    main: string;
    catalog: string;
    runtime: string;
  };
}

export class RuntimeGenerator {
  config: RuntimeGeneratorConfig;

  constructor(config: RuntimeGeneratorConfig) {
    this.config = config;
  }

  /**
   * Generate main.js — the PT Script Module bootloader.
   * Responsibilities: declare DEV_DIR, load catalog.js + runtime.js, expose main()/cleanUp().
   * PT calls main() by lifecycle — we must NOT auto-execute it.
   */
  generateMain(): string {
    return renderMainV2({
      srcDir: path.resolve(__dirname),
      outputPath: '',
      injectDevDir: this.config.devDir,
    });
  }

  /**
   * Generate catalog.js — static PT constants (device types, cable types).
   * This file changes rarely and can be kept cached on disk.
   */
  generateCatalog(): string {
    return renderCatalog({
      srcDir: path.resolve(__dirname),
    });
  }

  /**
   * Generate runtime.js — all handler logic and dispatch.
   * This file changes with each feature update.
   */
  generateRuntime(): string {
    return renderRuntimeV2Sync({
      srcDir: path.resolve(__dirname),
      outputPath: "",
      injectDevDir: this.config.devDir,
    });
  }

  async generate(): Promise<{ main: string; catalog: string; runtime: string }> {
    const main = this.generateMain();
    const catalog = this.generateCatalog();
    const runtime = this.generateRuntime();

    await fs.promises.mkdir(this.config.outputDir, { recursive: true });
    await fs.promises.writeFile(path.join(this.config.outputDir, "main.js"), main, "utf-8");
    await fs.promises.writeFile(path.join(this.config.outputDir, "catalog.js"), catalog, "utf-8");
    await fs.promises.writeFile(path.join(this.config.outputDir, "runtime.js"), runtime, "utf-8");

    return { main, catalog, runtime };
  }

  async validateGenerated(): Promise<void> {
    const { main, catalog, runtime } = await this.generate();
    const mainValidation = validatePtSafe(main);
    const catalogValidation = validatePtSafe(catalog);
    const runtimeValidation = validatePtSafe(runtime);
    const allValid = mainValidation.valid && catalogValidation.valid && runtimeValidation.valid;
    if (!allValid) {
      const errors: string[] = [];
      if (!mainValidation.valid) errors.push(`main.js: ${mainValidation.errors.length} error(s)`);
      if (!catalogValidation.valid) errors.push(`catalog.js: ${catalogValidation.errors.length} error(s)`);
      if (!runtimeValidation.valid) errors.push(`runtime.js: ${runtimeValidation.errors.length} error(s)`);
      throw new Error("Generated code validation failed: " + errors.join(", "));
    }
  }

  async writeManifest(
    main: string,
    catalog: string,
    runtime: string,
    outputDir: string,
  ): Promise<RuntimeArtifactManifest> {
    const manifest: RuntimeArtifactManifest = {
      cliVersion: "0.3.0",
      protocolVersion: 3,
      mainChecksum: computeChecksum(main),
      catalogChecksum: computeChecksum(catalog),
      runtimeChecksum: computeChecksum(runtime),
      generatedAt: Date.now(),
      modules: {
        main: "main.js",
        catalog: "catalog.js",
        runtime: "runtime.js",
      },
    };

    await fs.promises.mkdir(outputDir, { recursive: true });
    const manifestPath = path.join(outputDir, "manifest.json");
    await fs.promises.writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");
    return manifest;
  }

  async deploy(): Promise<void> {
    const { main, catalog, runtime } = await this.generate();
    const devDir = this.config.devDir;

    await fs.promises.mkdir(devDir, { recursive: true });
    await fs.promises.writeFile(path.join(devDir, "main.js"), main, "utf-8");
    await fs.promises.writeFile(path.join(devDir, "catalog.js"), catalog, "utf-8");
    await fs.promises.writeFile(path.join(devDir, "runtime.js"), runtime, "utf-8");
    await this.writeManifest(main, catalog, runtime, devDir);
  }

  async build(): Promise<void> {
    const { main, catalog, runtime } = await this.generate();
    const outputDir = this.config.outputDir;

    await fs.promises.mkdir(outputDir, { recursive: true });
    await fs.promises.writeFile(path.join(outputDir, "main.js"), main, "utf-8");
    await fs.promises.writeFile(path.join(outputDir, "catalog.js"), catalog, "utf-8");
    await fs.promises.writeFile(path.join(outputDir, "runtime.js"), runtime, "utf-8");
    await this.writeManifest(main, catalog, runtime, outputDir);
  }
}
