#!/usr/bin/env bun
// scripts/pre-release-check.ts
// Pre-release validation script - runs all checks before a release

import { execSync } from "child_process";

interface Check {
  name: string;
  command: string;
  required: boolean;
}

const checks: Check[] = [
  { name: "Typecheck", command: "bun run typecheck", required: true },
  { name: "Lint", command: "bun run lint", required: true },
  { name: "Unit Tests", command: "bun test", required: true },
  { name: "Architecture Checks", command: "bun run architecture:check", required: true },
  { name: "Build pt-runtime", command: "cd packages/pt-runtime && bun run build", required: true },
  { name: "PT-Safe Validation", command: "cd packages/pt-runtime && bun run validate-pt-safe", required: true },
];

console.log("=".repeat(60));
console.log("PRE-RELEASE VALIDATION");
console.log("=".repeat(60));

let failed = false;

for (const check of checks) {
  console.log(`\nRunning: ${check.name}...`);
  try {
    execSync(check.command, { stdio: "inherit" });
    console.log(`  ✓ PASSED`);
  } catch (e) {
    console.log(`  ✗ FAILED`);
    if (check.required) {
      failed = true;
    }
  }
}

console.log("\n" + "=".repeat(60));
if (failed) {
  console.log("❌ Pre-release checks FAILED. Fix the issues above.");
  process.exit(1);
} else {
  console.log("✅ All pre-release checks PASSED. Ready to release.");
}
