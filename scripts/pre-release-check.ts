#!/usr/bin/env bun
// scripts/pre-release-check.ts
// Pre-release validation script - runs all checks before a release

const { execSync } = require("child_process");

interface Check {
  name: string;
  command: string;
  required: boolean;
}

const checks: Check[] = [
  { name: "Typecheck", command: "bun run typecheck", required: true },
  { name: "Build pt-runtime", command: "cd packages/pt-runtime && bun run build", required: true },
  { name: "PT-Safe Validation", command: "cd packages/pt-runtime && bun --eval \"const { renderRuntimeV2Sync } = require('./src/build/render-runtime-v2.ts'); const { validatePtSafe } = require('./src/build/validate-pt-safe.ts'); const r = renderRuntimeV2Sync({ srcDir: './src', outputPath: '', injectDevDir: '~/pt-dev' }); const v = validatePtSafe(r); if (!v.valid) { console.error('PT-safe validation FAILED'); process.exit(1); }\"", required: true },
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
