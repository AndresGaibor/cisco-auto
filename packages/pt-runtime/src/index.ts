// ============================================================================
// PT Runtime - Main exports
// ============================================================================

// PT Compatibility Contract — público para pt-control
export * from "./contracts/pt-compatibility.js";

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
export {
  renderRuntimeV2,
  renderRuntimeV2Sync,
  renderRuntimeV2Sync as renderRuntimeSource,
} from "./build/render-runtime-v2";
export { renderMainV2, renderMainV2 as renderMainSource } from "./build/render-main-v2";
export { renderCatalog } from "./build/render-catalog";
export * from "./build";

// Modular runtime generator (hot reload capable)
export {
  ModularRuntimeGenerator,
  type ModularGeneratorConfig,
  type ModularManifest,
} from "./build/render-runtime-modular";

// Build utilities
import { validatePtSafe } from "./build/validate-pt-safe";
import {
  validateBalancedSyntax,
  validateMainBootstrapContract,
  validateRuntimeBootstrapContract,
} from "./build/syntax-preflight";
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
  outputDir?: string;
  devDir: string;
}

export class RuntimeGenerator {
  config: RuntimeGeneratorConfig;

  constructor(config: RuntimeGeneratorConfig) {
    this.config = config;
  }

  private resolveOutputDir(): string {
    return this.config.outputDir ?? this.config.devDir;
  }

  generateMain(): string {
    return renderMainV2({
      srcDir: path.resolve(__dirname),
      outputPath: "",
      injectDevDir: this.config.devDir,
    });
  }

  generateCatalog(): string {
    return renderCatalog({
      srcDir: path.resolve(__dirname),
    });
  }

  generateRuntime(): string {
    return renderRuntimeV2Sync({
      srcDir: path.resolve(__dirname),
      outputPath: "",
      injectDevDir: this.config.devDir,
    });
  }

  private validateArtifacts(main: string, catalog: string, runtime: string): void {
    const mainSyntax = validateBalancedSyntax(main);
    const catalogSyntax = validateBalancedSyntax(catalog);
    const runtimeSyntax = validateBalancedSyntax(runtime);
    const mainContract = validateMainBootstrapContract(main);
    const runtimeContract = validateRuntimeBootstrapContract(runtime);
    const mainValidation = validatePtSafe(main);
    const catalogValidation = validatePtSafe(catalog);
    const runtimeValidation = validatePtSafe(runtime);

    const allValid =
      mainSyntax.valid &&
      catalogSyntax.valid &&
      runtimeSyntax.valid &&
      mainContract.valid &&
      runtimeContract.valid &&
      mainValidation.valid &&
      catalogValidation.valid &&
      runtimeValidation.valid;

    if (!allValid) {
      const errors: string[] = [];
      if (!mainSyntax.valid) {
        errors.push(`main.js syntax: ${mainSyntax.errors.length} error(s)`);
        console.error("main.js syntax errors:", JSON.stringify(mainSyntax.errors, null, 2));
      }
      if (!catalogSyntax.valid)
        errors.push(`catalog.js syntax: ${catalogSyntax.errors.length} error(s)`);
      if (!runtimeSyntax.valid) {
        errors.push(`runtime.js syntax: ${runtimeSyntax.errors.length} error(s)`);
        console.error(
          "runtime.js syntax errors:",
          JSON.stringify(runtimeValidation.errors, null, 2),
        );
      }
      if (!mainContract.valid)
        errors.push(`main.js contract: ${mainContract.errors.length} error(s)`);
      if (!runtimeContract.valid)
        errors.push(`runtime.js contract: ${runtimeContract.errors.length} error(s)`);
      if (!mainValidation.valid) errors.push(`main.js: ${mainValidation.errors.length} error(s)`);
      if (!catalogValidation.valid)
        errors.push(`catalog.js: ${catalogValidation.errors.length} error(s)`);
      if (!runtimeValidation.valid)
        errors.push(`runtime.js: ${runtimeValidation.errors.length} error(s)`);
      throw new Error("Generated code validation failed: " + errors.join(", "));
    }
  }

  async generate(): Promise<{ main: string; catalog: string; runtime: string }> {
    const catalog = this.generateCatalog();
    const runtime = this.generateRuntime();
    const main = this.generateMain();

    const outDir = this.resolveOutputDir();
    await fs.promises.mkdir(outDir, { recursive: true });
    await fs.promises.writeFile(path.join(outDir, "main.js"), main, "utf-8");
    await fs.promises.writeFile(path.join(outDir, "catalog.js"), catalog, "utf-8");
    await fs.promises.writeFile(path.join(outDir, "runtime.js"), runtime, "utf-8");

    this.validateArtifacts(main, catalog, runtime);

    return { main, catalog, runtime };
  }

  async validateGenerated(): Promise<void> {
    const { main, catalog, runtime } = await this.generate();
    this.validateArtifacts(main, catalog, runtime);
  }

  async deploy(): Promise<void> {
    const catalog = this.generateCatalog();
    const runtime = this.generateRuntime();
    const main = this.generateMain();

    this.validateArtifacts(main, catalog, runtime);

    await fs.promises.mkdir(this.config.devDir, { recursive: true });
    await fs.promises.writeFile(path.join(this.config.devDir, "main.js"), main, "utf-8");
    await fs.promises.writeFile(path.join(this.config.devDir, "catalog.js"), catalog, "utf-8");
    await fs.promises.writeFile(path.join(this.config.devDir, "runtime.js"), runtime, "utf-8");
    await this.writeManifest(main, catalog, runtime, this.config.devDir);
  }

  async build(): Promise<void> {
    const catalog = this.generateCatalog();
    const runtime = this.generateRuntime();
    const main = this.generateMain();

    this.validateArtifacts(main, catalog, runtime);

    const outDir = this.resolveOutputDir();
    await fs.promises.mkdir(outDir, { recursive: true });
    await fs.promises.writeFile(path.join(outDir, "main.js"), main, "utf-8");
    await fs.promises.writeFile(path.join(outDir, "catalog.js"), catalog, "utf-8");
    await fs.promises.writeFile(path.join(outDir, "runtime.js"), runtime, "utf-8");
    await this.writeManifest(main, catalog, runtime, outDir);
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

// ============================================================================
// CLI entry point — bun run src/index.ts <command>
// ============================================================================
if (typeof Bun !== "undefined" && Bun.argv.includes("generate")) {
  const generator = new RuntimeGenerator({
    outputDir: path.join(path.resolve(__dirname), "../dist-qtscript"),
    devDir: process.env.PT_DEV_DIR || "/Users/andresgaibor/pt-dev",
  });
  generator
    .generate()
    .then(() => {
      console.log("Generated: dist-qtscript/");
    })
    .catch((e) => {
      console.error("Error:", e);
      process.exit(1);
    });
}

if (typeof Bun !== "undefined" && Bun.argv.includes("deploy")) {
  const generator = new RuntimeGenerator({
    outputDir: path.join(path.resolve(__dirname), "../dist-qtscript"),
    devDir: process.env.PT_DEV_DIR || "/Users/andresgaibor/pt-dev",
  });
  generator
    .deploy()
    .then(() => {
      console.log("Deployed to: " + generator.config.devDir);
    })
    .catch((e) => {
      console.error("Error:", e);
      process.exit(1);
    });
}

if (typeof Bun !== "undefined" && Bun.argv.includes("modular")) {
  const { ModularRuntimeGenerator } = require("./build/render-runtime-modular");
  const generator = new ModularRuntimeGenerator({
    outputDir: path.join(path.resolve(__dirname), "../dist-modular"),
    devDir: process.env.PT_DEV_DIR || "/Users/andresgaibor/pt-dev",
    splitModules: true,
  });
  generator
    .generate()
    .then(({ modules, manifest }: any) => {
      console.log("✅ Modular generation complete!");
      console.log(`   Modules: ${modules.size}`);
      console.log(`   Path: ${path.join(path.resolve(__dirname), "../dist-modular")}`);
      console.log(`   Manifest: ${JSON.stringify(manifest.modulePaths)}`);
    })
    .catch((e: any) => {
      console.error("Error:", e);
      process.exit(1);
    });
}
