#!/usr/bin/env bun
/**
 * PT Control V2 - Build Script
 *
 * Uses the modern RuntimeGenerator pipeline from @cisco-auto/pt-runtime.
 * Generates main.js, runtime.js, catalog.js, and manifest.json and deploys
 * them to PT_DEV_DIR. The kernel's runtime-loader handles hot reload
 * by monitoring runtime.js mtime — no external reload trigger needed.
 *
 * Usage:
 *   bun run pt:build         # Full build + deploy to PT_DEV_DIR
 *   bun run pt:build --watch # Watch mode with auto-rebuild
 */

import { resolve } from "node:path";
import { existsSync, readFileSync, writeFileSync, mkdirSync, utimesSync } from "node:fs";
import { homedir } from "node:os";
import { createHash } from "node:crypto";

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
// Modern Runtime Generator (pipeline V2)
// ============================================================================

async function generateAndDeploy(): Promise<{
  mainChanged: boolean;
  runtimeChanged: boolean;
  catalogChanged: boolean;
} | null> {
  console.log("\n🔧 Generating runtime files via RuntimeGenerator...");

  try {
    const { RuntimeGenerator } = await import("@cisco-auto/pt-runtime");

    const generator = new RuntimeGenerator({
      devDir: DEV_DIR,
      outputDir: GENERATED_DIR,
    });

    const report = await generator.build();

    console.log("✅ Runtime files generated:");
    console.log(`   - ${GENERATED_DIR}/main.js`);
    console.log(`   - ${GENERATED_DIR}/runtime.js`);
    console.log(`   - ${GENERATED_DIR}/catalog.js`);
    console.log(`   - ${GENERATED_DIR}/manifest.json`);

    if (!existsSync(GENERATED_DIR)) {
      mkdirSync(GENERATED_DIR, { recursive: true });
    }

    const artifacts = [
      { src: "main.js", dest: resolve(DEV_DIR, "main.js") },
      { src: "runtime.js", dest: resolve(DEV_DIR, "runtime.js") },
      { src: "catalog.js", dest: resolve(DEV_DIR, "catalog.js") },
      { src: "manifest.json", dest: resolve(DEV_DIR, "manifest.json") },
    ];

    for (const { src, dest } of artifacts) {
      const srcPath = resolve(GENERATED_DIR, src);
      if (!existsSync(srcPath)) {
        console.error(`   ✗ ${src} not found, aborting deploy`);
        return null;
      }
      mkdirSync(resolve(dest, ".."), { recursive: true });
      writeFileSync(dest, readFileSync(srcPath));
      if (src === "runtime.js") {
        const now = Date.now();
        utimesSync(dest, new Date(now), new Date(now + 2000));
      }
      console.log(`   ✓ ${dest}`);
    }

    console.log("✅ Deployment complete");

    return report.changes;
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

  const changes = await generateAndDeploy();
  if (!changes) {
    console.error("\n❌ Runtime generation/deploy failed");
    process.exit(1);
  }

  const valid = validateArtifacts();
  if (!valid) {
    console.error("\n❌ Artifact validation failed");
    process.exit(1);
  }

  if (triggerReloadFlag) {
    triggerReload();
  }

  if (changes.mainChanged) {
    console.log("\n✅ Build completado. main.js y runtime.js actualizados.");
    console.log("💡 Recarga ~/pt-dev/main.js en Packet Tracer.");
  } else if (changes.runtimeChanged) {
    console.log("\n✅ Build completado. runtime.js actualizado; main.js sin cambios.");
    console.log("💡 Runtime hot-reload activo en Packet Tracer.");
  } else if (changes.catalogChanged) {
    console.log("\n✅ Build completado. Solo catalog.js cambió.");
    console.log("💡 No necesitas recargar main.js.");
  } else {
    console.log("\n✅ Build completado. Sin cambios efectivos en main.js ni runtime.js.");
    console.log("💡 No necesitas recargar main.js.");
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
