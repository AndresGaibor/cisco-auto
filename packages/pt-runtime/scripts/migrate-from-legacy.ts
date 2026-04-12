/**
 * Migration script to switch from legacy template generation to new build system
 */

import * as fs from "fs";
import * as path from "path";

const LEGACY_FILES = [
  "src/templates/runtime-assembly.ts",
  "src/templates/main-kernel-assembly.ts",
  "src/templates/session-template.ts",
  "src/templates/dispatcher-template.ts",
  "src/templates/helpers-template.ts",
  "src/templates/constants-template.ts",
];

const NEW_FILES = [
  "src/domain/",
  "src/pt/kernel/",
  "src/pt/terminal/",
  "src/build/",
];

function backupLegacy(): void {
  console.log("Backing up legacy files...");
  
  const backupDir = "src/templates.legacy-backup";
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  for (const file of LEGACY_FILES) {
    if (fs.existsSync(file)) {
      const dest = path.join(backupDir, path.basename(file));
      fs.copyFileSync(file, dest);
      console.log(`  Backed up ${file}`);
    }
  }
}

function verifyNewFiles(): boolean {
  console.log("Verifying new files exist...");
  
  for (const dir of NEW_FILES) {
    if (!fs.existsSync(dir)) {
      console.error(`  Missing: ${dir}`);
      return false;
    }
    console.log(`  Found: ${dir}`);
  }
  
  return true;
}

function markDeprecated(): void {
  console.log("Marking legacy files as deprecated...");
  
  for (const file of LEGACY_FILES) {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, "utf-8");
      const deprecated = `/**
 * @deprecated Use src/build/ instead
 * This file will be removed in next major version
 */
${content}`;
      fs.writeFileSync(file, deprecated, "utf-8");
      console.log(`  Deprecated: ${file}`);
    }
  }
}

function main(): void {
  console.log("=== PT Runtime Migration ===\n");
  
  // Verify new files
  if (!verifyNewFiles()) {
    console.error("\nMigration failed: New files not found");
    console.error("Run Phase 1-5 first to create new structure");
    process.exit(1);
  }
  
  // Backup legacy
  backupLegacy();
  
  // Mark deprecated
  markDeprecated();
  
  console.log("\nMigration complete!");
  console.log("\nNext steps:");
  console.log("1. Update src/index.ts to export from new structure");
  console.log("2. Run bun run build:main && bun run build:runtime");
  console.log("3. Compare generated files with baseline");
  console.log("4. Run all tests");
  console.log("5. Delete src/templates.legacy-backup/ when confident");
}

main();