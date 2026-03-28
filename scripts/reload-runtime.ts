#!/usr/bin/env bun

/**
 * Force PT to load runtime by triggering FileWatcher
 */

import { copyFileSync, existsSync, readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

const DEV_DIR = `${process.env.HOME ?? "/Users/andresgaibor"}/pt-dev`;
const RUNTIME_SRC = resolve(import.meta.dir, "../pt-extension/runtime.js");
const RUNTIME_DEST = `${DEV_DIR}/runtime.js`;

console.log("🔄 Forcing PT runtime reload...\n");

// Read the runtime source
if (!existsSync(RUNTIME_SRC)) {
  console.error("❌ Runtime source not found:", RUNTIME_SRC);
  process.exit(1);
}

const runtimeContent = readFileSync(RUNTIME_SRC, "utf-8");

// Write it fresh (this will trigger FileWatcher)
console.log("📝 Writing runtime.js...");
writeFileSync(RUNTIME_DEST, runtimeContent, "utf-8");
console.log("✅ Runtime written");

console.log("\n⏳ Waiting for PT to detect and load runtime...");
await new Promise(resolve => setTimeout(resolve, 1000));

// Check if runtime was loaded
const eventsFile = `${DEV_DIR}/events.ndjson`;
if (existsSync(eventsFile)) {
  const content = readFileSync(eventsFile, "utf-8");
  const lines = content.trim().split("\n");
  
  const hasRuntimeLoaded = lines.some(line => {
    try {
      const event = JSON.parse(line);
      return event.type === "runtime-loaded";
    } catch {
      return false;
    }
  });
  
  if (hasRuntimeLoaded) {
    console.log("✅ Runtime loaded successfully!");
    console.log("\n🎉 PT Control is ready!");
    console.log("\nTry: bun run scripts/demo-network.ts");
  } else {
    console.log("⚠️  Runtime not loaded yet. Check PT Debug console.");
    console.log("\nIf you see errors in PT, try:");
    console.log("  1. Close PT completely");
    console.log("  2. Delete " + DEV_DIR);
    console.log("  3. Restart PT");
    console.log("  4. Run this script again");
  }
}
