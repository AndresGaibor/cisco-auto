#!/usr/bin/env bun
/**
 * PT Control V2 - Build Script
 *
 * Usage:
 *   bun run scripts/build.ts          # Full build (compile + generate + deploy)
 *   bun run scripts/build.ts --watch  # Watch mode
 *   bun run scripts/build.ts --deploy # Deploy to PT dev directory
 */

import { resolve } from "node:path";
import { existsSync, mkdirSync, copyFileSync, readFileSync } from "node:fs";
import { homedir } from "node:os";

// ============================================================================
// Configuration
// ============================================================================

const ROOT_DIR = resolve(import.meta.dirname, "..");
const DIST_DIR = resolve(ROOT_DIR, "dist");
const GENERATED_DIR = resolve(ROOT_DIR, "generated");
const DEV_DIR = process.env.PT_DEV_DIR || `${process.env.HOME ?? homedir()}/pt-dev`;

// ============================================================================
// Build Steps
// ============================================================================

async function compileTypeScript(): Promise<boolean> {
  console.log("\n📦 Skipping TypeScript compilation - using JavaScript templates");
  return true;
}

async function generateRuntime(): Promise<{ main: string; runtime: string } | null> {
  console.log("\n🔧 Generating runtime files from templates...");

  try {
    if (!existsSync(GENERATED_DIR)) {
      mkdirSync(GENERATED_DIR, { recursive: true });
    }

    const { execSync } = await import("node:child_process");
    const result = execSync("bun run scripts/assemble.js", {
      cwd: resolve(ROOT_DIR, "..", "pt-runtime"),
      encoding: "utf-8"
    });
    console.log(result);

    const mainPath = resolve(GENERATED_DIR, "main.js");
    const runtimePath = resolve(GENERATED_DIR, "runtime.js");

    if (!existsSync(mainPath) || !existsSync(runtimePath)) {
      throw new Error("Assembly failed - output files not found");
    }

    console.log("✅ Runtime files generated:");
    console.log(`   - ${mainPath}`);
    console.log(`   - ${runtimePath}`);
    return { main: mainPath, runtime: runtimePath };
  } catch (error) {
    console.error("❌ Runtime generation error:", error);
    return null;
  }
}

/**
 * Validate generated artifacts are PT-safe.
 * Returns true if both main.js and runtime.js pass validation.
 */
function validateArtifacts(main: string, runtime: string): boolean {
  console.log("\n🔍 Validating generated artifacts...");

  try {
    if (!existsSync(main)) {
      console.error("❌ main.js not found");
      return false;
    }
    if (!existsSync(runtime)) {
      console.error("❌ runtime.js not found");
      return false;
    }

    const mainContent = readFileSync(main, "utf-8");
    const runtimeContent = readFileSync(runtime, "utf-8");

    if (mainContent.length < 100) {
      console.error("❌ main.js is too short");
      return false;
    }
    if (runtimeContent.length < 100) {
      console.error("❌ runtime.js is too short");
      return false;
    }

    if (!mainContent.includes("createKernel")) {
      console.error("❌ main.js missing 'createKernel'");
      return false;
    }
    console.log("✅ main.js contains 'createKernel'");

    if (!runtimeContent.includes("_ptDispatch")) {
      console.error("❌ runtime.js missing '_ptDispatch'");
      return false;
    }
    console.log("✅ runtime.js contains '_ptDispatch'");

    return true;
  } catch (e) {
    console.error("❌ Validation error:", e);
    return false;
  }
}

async function deployToDev(): Promise<boolean> {
  console.log(`\n🚀 Deploying to ${DEV_DIR}...`);

  try {
    // Ensure dev directory exists
    if (!existsSync(DEV_DIR)) {
      mkdirSync(DEV_DIR, { recursive: true });
    }

    // Copy generated files to dev directory
    const files = ["main.js", "runtime.js"];

    for (const file of files) {
      const src = resolve(GENERATED_DIR, file);
      const dest = resolve(DEV_DIR, file);

      if (existsSync(src)) {
        copyFileSync(src, dest);
        console.log(`   ✓ ${dest}`);
      } else {
        console.error(`   ✗ ${src} not found, aborting deploy`);
        return false;
      }
    }

    console.log("✅ Deployment complete");
    return true;
  } catch (error) {
    console.error("❌ Deployment error:", error);
    return false;
  }
}

async function watchMode(): Promise<void> {
  console.log("\n👀 Watch mode enabled - monitoring for changes...\n");

  const { watch } = await import("node:fs");

  // Initial build
  await build(false);

  // Watch for changes
  const srcDir = resolve(ROOT_DIR, "src");

  watch(srcDir, { recursive: true }, async (event, filename) => {
    if (filename?.endsWith(".ts")) {
      console.log(`\n📝 Change detected: ${filename}`);
      await build(false);
    }
  });

  console.log("Watching for changes in:", srcDir);

  // Keep process alive
  process.stdin.resume();
}

// ============================================================================
// Main Build
// ============================================================================

async function build(deploy: boolean = true): Promise<boolean> {
  console.log("═══════════════════════════════════════════");
  console.log("       PT Control V2 - Build");
  console.log("═══════════════════════════════════════════");

  // Step 1: Compile TypeScript
  const tsOk = await compileTypeScript();
  if (!tsOk) {
    console.error("\n❌ TypeScript compilation failed");
    process.exit(1);
  }

  // Step 2: Generate runtime files
  const generated = await generateRuntime();
  if (!generated) {
    console.error("\n❌ Runtime generation failed");
    process.exit(1);
  }

  // Step 3: Validate PT-safe (MANDATORY - aborts deploy if fails)
  const valid = validateArtifacts(generated.main, generated.runtime);
  if (!valid) {
    console.error("\n❌ PT-safe validation failed - artifacts will NOT be deployed");
    process.exit(1);
  }

  // Step 4: Deploy (optional)
  if (deploy) {
    const deployOk = await deployToDev();
    if (!deployOk) {
      console.error("\n❌ Deployment failed");
      process.exit(1);
    }
  }

  console.log("\n═══════════════════════════════════════════");
  console.log("✅ Build completed successfully!");
  console.log("═══════════════════════════════════════════\n");

  return true;
}

// ============================================================================
// CLI Entry Point
// ============================================================================

const args = process.argv.slice(2);

if (args.includes("--watch")) {
  watchMode().catch(console.error);
} else if (args.includes("--no-deploy")) {
  build(false).catch(console.error);
} else {
  build(true).catch(console.error);
}
