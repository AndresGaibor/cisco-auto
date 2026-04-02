#!/usr/bin/env bun
/**
 * PT Control V2 - Build Script
 * 
 * Usage:
 *   bun run scripts/build.ts          # Full build (compile + generate + deploy)
 *   bun run scripts/build.ts --watch  # Watch mode
 *   bun run scripts/build.ts --deploy # Deploy to PT dev directory
 */

import { $ } from "bun";
import { resolve } from "node:path";
import { existsSync, mkdirSync, writeFileSync, copyFileSync } from "node:fs";
import { homedir } from "node:os";
import { RuntimeGenerator } from "@cisco-auto/pt-runtime";

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
  console.log("\n📦 Compiling TypeScript...");
  console.log("⚠️  Skipping TS compilation - using pre-built file-bridge");
  return true;
}

async function generateRuntime(): Promise<boolean> {
  console.log("\n🔧 Generating runtime files...");
  
  try {
    // Ensure generated directory exists
    if (!existsSync(GENERATED_DIR)) {
      mkdirSync(GENERATED_DIR, { recursive: true });
    }
    
    const generator = new RuntimeGenerator({
      outputDir: GENERATED_DIR,
      devDir: DEV_DIR,
      serverUrl: "http://127.0.0.1:54321",
      pollInterval: 200,
    });
    
    const { main, runtime } = await generator.generate();
    
    console.log("✅ Runtime files generated:");
    console.log(`   - ${resolve(GENERATED_DIR, "main.js")}`);
    console.log(`   - ${resolve(GENERATED_DIR, "runtime.js")}`);
    return true;
  } catch (error) {
    console.error("❌ Runtime generation error:", error);
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
    const files = ["main.js", "runtime.js", "index.html"];
    
    for (const file of files) {
      const src = resolve(GENERATED_DIR, file);
      const dest = resolve(DEV_DIR, file);
      
      if (existsSync(src)) {
        copyFileSync(src, dest);
        console.log(`   ✓ ${dest}`);
      } else {
        console.warn(`   ⚠ ${src} not found, skipping`);
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
    process.exit(1);
  }
  
  // Step 2: Generate runtime files
  const genOk = await generateRuntime();
  if (!genOk) {
    process.exit(1);
  }
  
  // Step 3: Deploy (optional)
  if (deploy) {
    const deployOk = await deployToDev();
    if (!deployOk) {
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
