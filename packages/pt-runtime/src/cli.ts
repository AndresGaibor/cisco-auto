// ============================================================================
// PT Runtime - CLI Entry Point
// ============================================================================
// bun run src/cli.ts <command>
// Comandos: generate, deploy, modular

import * as path from "path";
import { RuntimeGenerator } from "./build/runtime-generator.js";
import { ModularRuntimeGenerator } from "./build/render-runtime-modular.js";

const args = Bun.argv.slice(2);
const command = args[0] ?? "help";

async function main() {
  switch (command) {
    case "generate": {
      const generator = new RuntimeGenerator({
        outputDir: path.join(path.resolve(__dirname), "../dist-qtscript"),
        devDir: process.env.PT_DEV_DIR || "/Users/andresgaibor/pt-dev",
      });
      await generator.generate();
      console.log("Generated: dist-qtscript/");
      break;
    }

    case "deploy": {
      const generator = new RuntimeGenerator({
        outputDir: path.join(path.resolve(__dirname), "../dist-qtscript"),
        devDir: process.env.PT_DEV_DIR || "/Users/andresgaibor/pt-dev",
      });
      await generator.deploy();
      console.log("Deployed to: " + generator.config.devDir);
      break;
    }

    case "modular": {
      const generator = new ModularRuntimeGenerator({
        outputDir: path.join(path.resolve(__dirname), "../dist-modular"),
        devDir: process.env.PT_DEV_DIR || "/Users/andresgaibor/pt-dev",
        splitModules: true,
      });
      const { modules, manifest } = await generator.generate();
      console.log("✅ Modular generation complete!");
      console.log(`   Modules: ${modules.size}`);
      console.log(`   Path: ${path.join(path.resolve(__dirname), "../dist-modular")}`);
      console.log(`   Manifest: ${JSON.stringify(manifest.modulePaths)}`);
      break;
    }

    case "help":
    default: {
      console.log("Usage: bun run src/cli.ts <command>");
      console.log("Commands:");
      console.log("  generate  - Generate runtime artifacts to dist-qtscript/");
      console.log("  deploy    - Generate and deploy to PT dev directory");
      console.log("  modular   - Generate modular runtime with hot-reload");
      break;
    }
  }
}

main().catch((e: unknown) => {
  console.error("Error:", e);
  process.exit(1);
});