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

// Modular runtime generator (hot reload capable)
export {
  ModularRuntimeGenerator,
  type ModularGeneratorConfig,
  type ModularManifest,
} from "./build/render-runtime-modular";

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

  /**
   * generate() — writes 3 files to outputDir (catalog.js, runtime.js, main.js)
   * Always file-based: main.js loads catalog.js + hot-reloads runtime.js from disk.
   */
  async generate(): Promise<{ main: string; catalog: string; runtime: string }> {
    const catalog = this.generateCatalog();
    const runtime = this.generateRuntime();
    const main = this.generateMain();

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
      if (!catalogValidation.valid)
        errors.push(`catalog.js: ${catalogValidation.errors.length} error(s)`);
      if (!runtimeValidation.valid)
        errors.push(`runtime.js: ${runtimeValidation.errors.length} error(s)`);
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

  /**
   * deploy() — writes 3 files to devDir (~/pt-dev/ by default).
   * main.js loads catalog.js once, then runtime.js is hot-reloaded by kernel.
   */
  async deploy(): Promise<void> {
    const catalog = this.generateCatalog();
    const runtime = this.generateRuntime();
    const main = this.generateMain();

    await fs.promises.mkdir(this.config.devDir, { recursive: true });
    await fs.promises.writeFile(path.join(this.config.devDir, "main.js"), main, "utf-8");
    await fs.promises.writeFile(path.join(this.config.devDir, "catalog.js"), catalog, "utf-8");
    await fs.promises.writeFile(path.join(this.config.devDir, "runtime.js"), runtime, "utf-8");
    await this.writeManifest(main, catalog, runtime, this.config.devDir);
  }

  /**
   * build() — writes to outputDir (dist-qtscript/) for testing/CI.
   * Same architecture as deploy(): 3 separate files, always file-based.
   */
  async build(): Promise<void> {
    const catalog = this.generateCatalog();
    const runtime = this.generateRuntime();
    const main = this.generateMain();

    await fs.promises.mkdir(this.config.outputDir, { recursive: true });
    await fs.promises.writeFile(path.join(this.config.outputDir, "main.js"), main, "utf-8");
    await fs.promises.writeFile(path.join(this.config.outputDir, "catalog.js"), catalog, "utf-8");
    await fs.promises.writeFile(path.join(this.config.outputDir, "runtime.js"), runtime, "utf-8");
    await this.writeManifest(main, catalog, runtime, this.config.outputDir);
  }
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
    .then(({ modules, manifest }) => {
      console.log("✅ Modular generation complete!");
      console.log(`   Modules: ${modules.size}`);
      console.log(`   Path: ${path.join(path.resolve(__dirname), "../dist-modular")}`);
      console.log(`   Manifest: ${JSON.stringify(manifest.modulePaths)}`);
    })
    .catch((e) => {
      console.error("Error:", e);
      process.exit(1);
    });
}
