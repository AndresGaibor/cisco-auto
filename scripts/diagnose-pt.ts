#!/usr/bin/env bun

/**
 * Diagnostic script for PT Control
 */

import { readFileSync, writeFileSync, existsSync } from "fs";

const DEV_DIR = `${process.env.HOME ?? "/Users/andresgaibor"}/pt-dev`;

console.log("🔍 PT Control Diagnostics\n");

// Check files
console.log("📁 Checking files:");
const files = ["main.js", "runtime.js", "commands/", "in-flight/", "results/", "logs/events.current.ndjson"];
for (const file of files) {
  const path = `${DEV_DIR}/${file}`;
  const exists = existsSync(path);
  console.log(`   ${exists ? "✅" : "❌"} ${file}`);
  if (exists) {
    const stats = require("fs").statSync(path);
    console.log(`      Size: ${stats.size} bytes`);
    console.log(`      Modified: ${stats.mtime.toISOString()}`);
  }
}

console.log();

// Check events
console.log("📋 Recent events:");
if (existsSync(`${DEV_DIR}/logs/events.current.ndjson`)) {
  const content = readFileSync(`${DEV_DIR}/logs/events.current.ndjson`, "utf-8");
  const lines = content.trim().split("\n").filter(l => l.trim());
  
  if (lines.length === 0) {
    console.log("   (no events yet)");
  } else {
    lines.slice(-5).forEach(line => {
      try {
        const event = JSON.parse(line);
        console.log(`   ${event.type} @ ${new Date(event.ts).toISOString()}`);
        if (event.message) console.log(`      ${event.message}`);
      } catch (e) {
        console.log(`   ${line.slice(0, 80)}...`);
      }
    });
  }
} else {
  console.log("   (events file not found)");
}

console.log();

// Write a test command
console.log("🧪 Writing test command...");
const testCmd = {
  id: "test_" + Date.now(),
  ts: Date.now(),
  payload: { kind: "snapshot" }
};

const commandsDir = `${DEV_DIR}/commands/`;
const fs = require("fs");
if (!fs.existsSync(commandsDir)) fs.mkdirSync(commandsDir, { recursive: true });
writeFileSync(`${commandsDir}${testCmd.id}.json`, JSON.stringify(testCmd, null, 2));
console.log("   ✅ Command written (V2 layout)");
console.log(`   ID: ${testCmd.id}`);

console.log();
console.log("⏳ Waiting 5 seconds for PT to respond...");

await new Promise(resolve => setTimeout(resolve, 5000));

// Check for response
console.log();
console.log("📬 Checking for response:");
const afterContent = readFileSync(`${DEV_DIR}/logs/events.current.ndjson`, "utf-8");
const afterLines = afterContent.trim().split("\n").filter(l => l.trim());
const newLines = afterLines.slice(-(afterLines.length));

let foundResponse = false;
for (const line of newLines) {
  try {
    const event = JSON.parse(line);
    if (event.id === testCmd.id) {
      console.log(`   ✅ Response received!`);
      console.log(`   Type: ${event.type}`);
      console.log(`   OK: ${event.ok ?? "N/A"}`);
      foundResponse = true;
      break;
    }
  } catch (e) {}
}

if (!foundResponse) {
  console.log("   ❌ No response from PT");
  console.log();
  console.log("💡 Possible issues:");
  console.log("   1. PT module not loaded (check Extensions → Scripting → Debug)");
  console.log("   2. Runtime not loaded (should see 'Runtime loaded' in Debug)");
  console.log("   3. FileWatcher not working (check Security Privileges)");
  console.log();
  console.log("🔧 Try this:");
  console.log("   1. Open PT: Extensions → Scripting → Debug");
  console.log("   2. Look for errors after the 'PT Control Module initialized' message");
  console.log("   3. If you see 'Runtime file not found', the runtime needs to be copied");
  console.log("   4. If FileWatcher isn't triggering, try:");
  console.log("      - Restart PT");
  console.log("      - Check Security Privileges are enabled");
  console.log("      - Try: echo 'test' > " + DEV_DIR + "/runtime.js");
}

console.log();
console.log("📊 Summary:");
console.log(`   Events total: ${afterLines.length}`);
console.log(`   Runtime exists: ${existsSync(`${DEV_DIR}/runtime.js`) ? "Yes" : "No"}`);
console.log(`   PT responding: ${foundResponse ? "Yes" : "No"}`);
