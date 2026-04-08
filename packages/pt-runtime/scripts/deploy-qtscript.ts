import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { homedir, platform } from "node:os";
import { fileURLToPath } from "node:url";
import { formatValidationErrors, validateGeneratedArtifacts, validateQtScriptArtifacts } from "../src/runtime-validator.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const devDir = process.env.DEV_DIR || (platform() === "win32"
  ? resolve(process.env.USERPROFILE || homedir(), "pt-dev")
  : resolve(homedir(), "pt-dev"));

const distDir = resolve(ROOT, "dist-qtscript");

console.log("[Deploy] Deploying Qt Script files to:", devDir);

const mainJs = readFileSync(resolve(distDir, "main.js"), "utf-8");
let runtimeJs = readFileSync(resolve(distDir, "runtime.js"), "utf-8");

const legacyValidation = validateGeneratedArtifacts(mainJs, runtimeJs);
if (!legacyValidation.ok) {
  console.error(formatValidationErrors(legacyValidation));
  process.exit(1);
}

const qtscriptValidation = validateQtScriptArtifacts(mainJs, runtimeJs);
if (!qtscriptValidation.ok) {
  console.error(formatValidationErrors(qtscriptValidation));
  process.exit(1);
}

const mainWithDevDir = mainJs.replace(/\{\{DEV_DIR\}\}/g, devDir);

runtimeJs = runtimeJs + "\nreturn Runtime;\n";

writeFileSync(resolve(devDir, "main.js"), mainWithDevDir, "utf-8");
writeFileSync(resolve(devDir, "runtime.js"), runtimeJs, "utf-8");

console.log("[Deploy] Deployed main.js and runtime.js to", devDir);
