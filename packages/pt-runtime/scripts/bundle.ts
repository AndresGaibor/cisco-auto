/**
 * Bundle Script - Copies dist-qtscript files to generated/
 * The actual deploy uses scripts/deploy-qtscript.ts to copy to ~/pt-dev/
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir, platform } from "node:os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const generatedDir = resolve(ROOT, "generated");
const distDir = resolve(ROOT, "dist-qtscript");
const devDir = process.env.PT_DEV_DIR || (platform() === "win32"
  ? resolve(process.env.USERPROFILE || homedir(), "pt-dev")
  : resolve(homedir(), "pt-dev"));

console.log("[Bundle] Starting...");

if (!existsSync(generatedDir)) {
  mkdirSync(generatedDir, { recursive: true });
}

// Read dist-qtscript files
const runtimePath = resolve(distDir, "runtime.js");
const mainPath = resolve(distDir, "main.js");

if (!existsSync(runtimePath)) {
  console.error("[Bundle] dist-qtscript/runtime.js not found. Run: bun run build:qtscript");
  process.exit(1);
}
if (!existsSync(mainPath)) {
  console.error("[Bundle] dist-qtscript/main.js not found. Run: bun run build:qtscript");
  process.exit(1);
}

// Copy main.js (replace DEV_DIR placeholder)
let mainCode = readFileSync(mainPath, "utf-8");
mainCode = mainCode.replace(/\{\{DEV_DIR\}\}/g, devDir);

// Copy runtime.js (append "return Runtime;" for module pattern)
let runtimeCode = readFileSync(runtimePath, "utf-8");
runtimeCode = runtimeCode + "\nreturn Runtime;\n";

writeFileSync(resolve(generatedDir, "runtime.js"), runtimeCode, "utf-8");
writeFileSync(resolve(generatedDir, "main.js"), mainCode, "utf-8");

console.log("[Bundle] Generated generated/main.js (" + mainCode.length + " chars)");
console.log("[Bundle] Generated generated/runtime.js (" + runtimeCode.length + " chars)");
console.log("[Bundle] Done.");
console.log("[Bundle] To deploy: bun run deploy:qtscript");
