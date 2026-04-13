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
export * from "./build";

// Build utilities
import { validatePtSafe } from "./build/validate-pt-safe";
import { renderRuntimeV2Sync } from "./build/render-runtime-v2";
import { renderMainV2 } from "./build/render-main-v2";
import * as fs from "fs";
import * as path from "path";

export interface RuntimeGeneratorConfig {
  outputDir: string;
  devDir: string;
}

export interface RuntimeArtifactManifest {
  cliVersion: string;
  protocolVersion: number;
  mainChecksum: string;
  runtimeChecksum: string;
  generatedAt: number;
}

function computeChecksum(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

export class RuntimeGenerator {
  config: RuntimeGeneratorConfig;

  constructor(config: RuntimeGeneratorConfig) {
    this.config = config;
  }

  generateMain(): string {
    return renderMainV2({
      srcDir: path.resolve(__dirname),
      outputPath: "",
      injectDevDir: this.config.devDir,
    });
  }

  generateRuntime(): string {
    return renderRuntimeV2Sync({
      srcDir: path.resolve(__dirname),
      outputPath: "",
      injectDevDir: this.config.devDir,
    });
  }

  async generate(): Promise<{ main: string; runtime: string }> {
    const main = this.generateMain();
    const runtime = this.generateRuntime();

    await fs.promises.mkdir(this.config.outputDir, { recursive: true });
    await fs.promises.writeFile(path.join(this.config.outputDir, "main.js"), main, "utf-8");
    await fs.promises.writeFile(path.join(this.config.outputDir, "runtime.js"), runtime, "utf-8");

    return { main, runtime };
  }

  async validateGenerated(): Promise<void> {
    const { main, runtime } = await this.generate();
    const mainValidation = validatePtSafe(main);
    const runtimeValidation = validatePtSafe(runtime);
    if (!mainValidation.valid || !runtimeValidation.valid) {
      throw new Error("Generated code validation failed");
    }
  }

  async writeManifest(
    main: string,
    runtime: string,
    outputDir: string,
  ): Promise<RuntimeArtifactManifest> {
    const manifest: RuntimeArtifactManifest = {
      cliVersion: "0.2.0",
      protocolVersion: 2,
      mainChecksum: computeChecksum(main),
      runtimeChecksum: computeChecksum(runtime),
      generatedAt: Date.now(),
    };

    await fs.promises.mkdir(outputDir, { recursive: true });
    const manifestPath = path.join(outputDir, "manifest.json");
    await fs.promises.writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");
    return manifest;
  }

  async deploy(): Promise<void> {
    const { main, runtime } = await this.generate();
    const devDir = this.config.devDir;

    await fs.promises.mkdir(devDir, { recursive: true });
    await fs.promises.writeFile(path.join(devDir, "main.js"), main, "utf-8");
    await fs.promises.writeFile(path.join(devDir, "runtime.js"), runtime, "utf-8");
    await this.writeManifest(main, runtime, devDir);
  }

  async build(): Promise<void> {
    const { main, runtime } = await this.generate();
    const outputDir = this.config.outputDir;

    await fs.promises.mkdir(outputDir, { recursive: true });
    await fs.promises.writeFile(path.join(outputDir, "main.js"), main, "utf-8");
    await fs.promises.writeFile(path.join(outputDir, "runtime.js"), runtime, "utf-8");
    await this.writeManifest(main, runtime, outputDir);
  }
}
