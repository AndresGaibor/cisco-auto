#!/usr/bin/env bun
/**
 * PT Control V2 - Build Script
 *
 * Uses the modern RuntimeGenerator pipeline from @cisco-auto/pt-runtime.
 * Generates main.js, runtime.js, catalog.js, and manifest.json and deploys
 * them to PT_DEV_DIR. Hot reload is decided from real file hashes;
 * __ping is only used as a wake-up when non-main artifacts change.
 *
 * Usage:
 *   bun run pt:build         # Full build + deploy to PT_DEV_DIR
 *   bun run pt:build --watch # Watch mode with auto-rebuild
 */

import { resolve, join } from "node:path";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import {
  classifyDeploy,
  computeDeployDiff,
  copyChangedArtifacts,
  shortHash,
} from "../src/build/deploy-diff.js";
import { resolveDevDir } from "../src/build/dev-dir.js";
import { isForeignWindowsPathOnThisHost } from "../src/system/paths.js";

// ============================================================================
// Configuration
// ============================================================================

const ROOT_DIR = resolve(import.meta.dirname, "..");
const GENERATED_DIR = resolve(ROOT_DIR, "generated");
const DEV_DIR = resolveDevDir();
const DEPLOY_ENABLED = !isForeignWindowsPathOnThisHost(DEV_DIR);
const COMMANDS_DIR = join(DEV_DIR, "commands");
const RESULTS_DIR = join(DEV_DIR, "results");
const PROTOCOL_SEQ = join(DEV_DIR, "protocol.seq.json");

// ============================================================================
// Modern Runtime Generator (pipeline V2)
// ============================================================================

async function generateAndDeploy(): Promise<{
  diff: ReturnType<typeof computeDeployDiff>;
  deployed: boolean;
} | null> {
  console.log("\n🔧 Generating runtime files via RuntimeGenerator...");

  try {
    const { RuntimeGenerator } = await import("@cisco-auto/pt-runtime");

    const generator = new RuntimeGenerator({
      devDir: DEV_DIR,
      outputDir: GENERATED_DIR,
    });

    await generator.build();

    console.log("✅ Runtime files generated:");
    console.log(`   - ${GENERATED_DIR}/main.js`);
    console.log(`   - ${GENERATED_DIR}/runtime.js`);
    console.log(`   - ${GENERATED_DIR}/catalog.js`);
    console.log(`   - ${GENERATED_DIR}/manifest.json`);

    if (!DEPLOY_ENABLED) {
      console.log("\n⚠ PT_DEV_DIR parece una ruta Windows y este host no es Windows.");
      console.log("   Se generaron artefactos para validación, pero se omitió el deploy local.");
      console.log(`   PT_DEV_DIR=${DEV_DIR}`);

      return { diff: [], deployed: false };
    }

    if (!existsSync(GENERATED_DIR)) {
      mkdirSync(GENERATED_DIR, { recursive: true });
    }

    const diff = computeDeployDiff(GENERATED_DIR, DEV_DIR);

    console.log("\n📦 Deployment diff:");
    for (const item of diff) {
      const label = item.changed ? "changed" : "unchanged";
      console.log(`   ${item.name}: ${label} ${shortHash(item.beforeHash)} -> ${shortHash(item.afterHash)}`);
    }

    copyChangedArtifacts(diff);

    console.log("✅ Deployment complete");

    return { diff, deployed: true };
  } catch (error) {
    console.error("❌ Runtime generation/deploy error:", error);
    return null;
  }
}

// ============================================================================
// Artifact Validation
// ============================================================================

function validateArtifacts(): boolean {
  console.log("\n🔍 Validating generated artifacts...");

  const files = [
    { path: resolve(DEV_DIR, "main.js"), name: "main.js" },
    { path: resolve(DEV_DIR, "runtime.js"), name: "runtime.js" },
    { path: resolve(DEV_DIR, "catalog.js"), name: "catalog.js" },
    { path: resolve(DEV_DIR, "manifest.json"), name: "manifest.json" },
  ];

  for (const { path, name } of files) {
    if (!existsSync(path)) {
      console.error(`❌ ${name} not found`);
      return false;
    }
    const content = readFileSync(path, "utf-8");
    if (content.length < 50) {
      console.error(`❌ ${name} is too short (${content.length} bytes)`);
      return false;
    }
  }

  const mainContent = readFileSync(resolve(DEV_DIR, "main.js"), "utf-8");
  if (!mainContent.includes("createKernel")) {
    console.error("❌ main.js missing 'createKernel'");
    return false;
  }
  console.log("✅ main.js contains 'createKernel'");

  const runtimeContent = readFileSync(resolve(DEV_DIR, "runtime.js"), "utf-8");
  if (!runtimeContent.includes("_ptDispatch")) {
    console.error("❌ runtime.js missing '_ptDispatch'");
    return false;
  }
  console.log("✅ runtime.js contains '_ptDispatch'");

  return true;
}

function validateGeneratedArtifactsOrThrow(): void {
  const files = [
    { path: resolve(GENERATED_DIR, "main.js"), name: "main.js" },
    { path: resolve(GENERATED_DIR, "runtime.js"), name: "runtime.js" },
    { path: resolve(GENERATED_DIR, "catalog.js"), name: "catalog.js" },
    { path: resolve(GENERATED_DIR, "manifest.json"), name: "manifest.json" },
  ];

  for (const { path, name } of files) {
    if (!existsSync(path)) {
      throw new Error(`${name} not found in generated dir`);
    }

    const content = readFileSync(path, "utf-8");
    if (content.length < 50) {
      throw new Error(`${name} is too short (${content.length} bytes)`);
    }
  }

  const mainContent = readFileSync(resolve(GENERATED_DIR, "main.js"), "utf-8");
  if (!mainContent.includes("createKernel")) {
    throw new Error("generated main.js missing createKernel");
  }

  const runtimeContent = readFileSync(resolve(GENERATED_DIR, "runtime.js"), "utf-8");
  if (!runtimeContent.includes("_ptDispatch")) {
    throw new Error("generated runtime.js missing _ptDispatch");
  }

  console.log("✅ generated main.js contains 'createKernel'");
  console.log("✅ generated runtime.js contains '_ptDispatch'");
}

// ============================================================================
// Runtime Wakeup
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

function triggerRuntimeWakeup(): void {
  if (!existsSync(COMMANDS_DIR)) {
    mkdirSync(COMMANDS_DIR, { recursive: true });
  }

  bumpSeq();
  const seq = getNextSeq();
  const cmdFile = resolve(COMMANDS_DIR, `${String(seq).padStart(12, "0")}-__ping.json`);
  const createdAt = Date.now();
  const payload = { type: "__ping" };
  const cmd = JSON.stringify({
    protocolVersion: 2,
    id: `reload-${createdAt}`,
    seq,
    createdAt,
    type: "__ping",
    payload,
    attempt: 1,
    expiresAt: createdAt + 2000,
    checksum: createHash("sha256").update(JSON.stringify({ type: "__ping", payload })).digest("hex"),
  });
  writeFileSync(cmdFile, cmd);
  console.log(`🔄 Runtime wake-up triggered: ${cmdFile}`);

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

  watch(srcDir, { recursive: true }, async (_event, filename) => {
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

  const deploy = await generateAndDeploy();
  if (!deploy) {
    console.error("\n❌ Runtime generation/deploy failed");
    process.exit(1);
  }

  if (deploy.deployed) {
    const valid = validateArtifacts();
    if (!valid) {
      console.error("\n❌ Artifact validation failed");
      process.exit(1);
    }
  } else {
    console.log("\n🔍 Validating generated artifacts only...");
    validateGeneratedArtifactsOrThrow();
  }

  if (!deploy.deployed) {
    console.log("\n✅ Build generado para validación cross-platform.");
    console.log("💡 No se desplegó porque esta ruta PT_DEV_DIR pertenece a Windows y el host actual no es Windows.");
    return true;
  }

  const classification = classifyDeploy(deploy.diff);

  if (triggerReloadFlag && classification.runtimeWakeupRecommended) {
    triggerRuntimeWakeup();
    console.log("🔄 Runtime wake-up triggered via __ping.");
  }

  if (classification.noReloadRequired) {
    console.log("\n✅ Build idempotente: sin cambios funcionales.");
    console.log("💡 No necesitas recargar main.js.");
  } else if (classification.manualMainReloadRequired) {
    console.log("\n✅ Build completado. main.js cambió.");
    console.log(`💡 Recarga ${DEV_DIR.replace(/\\/g, "/")}/main.js en Packet Tracer.`);
  } else if (classification.runtimeWakeupRecommended) {
    console.log("\n✅ Build completado. main.js sin cambios.");
    console.log("💡 Runtime hot-reload activo; no necesitas recargar main.js.");
  } else {
    console.log("\n✅ Build completado.");
  }

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
