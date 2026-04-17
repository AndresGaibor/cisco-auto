#!/usr/bin/env bun
/**
 * PT Control V2 - Build Script
 *
 * Usage:
 *   bun run pt:build         # Full build (generate + validate + deploy to PT_DEV_DIR)
 *   bun run pt:build --watch # Watch mode with auto-rebuild
 */

import { resolve } from "node:path";
import {
  existsSync,
  mkdirSync,
  copyFileSync,
  readFileSync,
  writeFileSync,
  utimesSync,
} from "node:fs";
import { homedir } from "node:os";

// ============================================================================
// Configuration
// ============================================================================

const ROOT_DIR = resolve(import.meta.dirname, "..");
const GENERATED_DIR = resolve(ROOT_DIR, "generated");
const DEV_DIR = process.env.PT_DEV_DIR || `${process.env.HOME ?? homedir()}/pt-dev`;
const COMMANDS_DIR = resolve(DEV_DIR, "commands");
const RESULTS_DIR = resolve(DEV_DIR, "results");
const PROTOCOL_SEQ = resolve(DEV_DIR, "protocol.seq.json");

// ============================================================================
// Build Steps
// ============================================================================

async function generateRuntime(): Promise<{ main: string; runtime: string } | null> {
  console.log("\n🔧 Generating runtime files from templates...");

  try {
    if (!existsSync(GENERATED_DIR)) {
      mkdirSync(GENERATED_DIR, { recursive: true });
    }

    const { execSync } = await import("node:child_process");
    const result = execSync("bun run scripts/assemble.js", {
      cwd: resolve(ROOT_DIR, "..", "pt-runtime"),
      encoding: "utf-8",
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
    if (!existsSync(DEV_DIR)) {
      mkdirSync(DEV_DIR, { recursive: true });
    }

    const files = ["runtime.js"];

    for (const file of files) {
      const src = resolve(GENERATED_DIR, file);
      const dest = resolve(DEV_DIR, file);

      if (existsSync(src)) {
        copyFileSync(src, dest);
        if (file === "runtime.js") {
          const now = Date.now();
          utimesSync(dest, new Date(now), new Date(now + 2000));
        }
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

// ============================================================================
// Reload Trigger
// ============================================================================

function getNextSeq(): number {
  try {
    if (!existsSync(PROTOCOL_SEQ)) {
      return 1;
    }
    const content = JSON.parse(readFileSync(PROTOCOL_SEQ, "utf-8"));
    return content.nextSeq ?? 1;
  } catch {
    return 1;
  }
}

function bumpSeq(): void {
  try {
    const seq = getNextSeq();
    writeFileSync(PROTOCOL_SEQ, JSON.stringify({ nextSeq: seq + 1 }));
  } catch {}
}

function triggerReload(): void {
  if (!existsSync(COMMANDS_DIR)) {
    mkdirSync(COMMANDS_DIR, { recursive: true });
  }

  bumpSeq();
  const seq = getNextSeq();
  const cmdFile = resolve(COMMANDS_DIR, `${String(seq).padStart(12, "0")}-__ping.json`);
  const cmd = JSON.stringify({
    type: "__ping",
    id: `reload-${Date.now()}`,
    payload: { type: "__ping" },
  });
  writeFileSync(cmdFile, cmd);
  console.log(`🔄 Reload triggered: ${cmdFile}`);

  setTimeout(() => {
    try {
      const resultFile = resolve(RESULTS_DIR, `${String(seq).padStart(12, "0")}-__ping.json`);
      if (existsSync(resultFile)) {
        const result = JSON.parse(readFileSync(resultFile, "utf-8"));
        console.log(`   ↳ Result: ${result.ok ? "OK" : "ERROR"} ${result.error ?? ""}`);
      }
    } catch {}
  }, 2000);
}

// ============================================================================
// Watch Mode
// ============================================================================

async function watchMode(): Promise<void> {
  console.log("\n👀 Watch mode enabled - monitoring for changes...\n");

  const { watch } = await import("node:fs");

  await build(true);

  const srcDir = resolve(ROOT_DIR, "src");

  watch(srcDir, { recursive: true }, async (event, filename) => {
    if (filename?.endsWith(".ts")) {
      console.log(`\n📝 Change detected: ${filename}`);
      await build(true);
    }
  });

  console.log("Watching for changes in:", srcDir);

  process.stdin.resume();
}

// ============================================================================
// Main Build
// ============================================================================

async function build(triggerReloadFlag: boolean = true): Promise<boolean> {
  console.log("═══════════════════════════════════════════");
  console.log("       PT Control V2 - Build");
  console.log("═══════════════════════════════════════════");

  const generated = await generateRuntime();
  if (!generated) {
    console.error("\n❌ Runtime generation failed");
    process.exit(1);
  }

  const valid = validateArtifacts(generated.main, generated.runtime);
  if (!valid) {
    console.error("\n❌ PT-safe validation failed - artifacts will NOT be deployed");
    process.exit(1);
  }

  const deployOk = await deployToDev();
  if (!deployOk) {
    console.error("\n❌ Deployment failed");
    process.exit(1);
  }

  if (triggerReloadFlag) {
    triggerReload();
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
} else {
  build(true).catch(console.error);
}
