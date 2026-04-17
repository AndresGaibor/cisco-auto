// ============================================================================
// PT Runtime - Main exports
// ============================================================================

import * as path from "path";
import { RuntimeGenerator } from "./build/runtime-generator";
import { ModularRuntimeGenerator } from "./build/render-runtime-modular";

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
export { computeChecksum, normalizeArtifactForChecksum } from "./build/checksum";
export { RuntimeGenerator, type RuntimeGeneratorConfig } from "./build/runtime-generator";
export type {
  RuntimeArtifactManifest,
  RuntimeBuildChangeReport,
  RuntimeBuildReport,
} from "./build/manifest";

// Modular runtime generator (hot reload capable)
export {
  ModularRuntimeGenerator,
  type ModularGeneratorConfig,
  type ModularManifest,
} from "./build/render-runtime-modular";

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
    .catch((e: unknown) => {
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
    .catch((e: unknown) => {
      console.error("Error:", e);
      process.exit(1);
    });
}

if (typeof Bun !== "undefined" && Bun.argv.includes("modular")) {
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
    .catch((e: unknown) => {
      console.error("Error:", e);
      process.exit(1);
    });
}
