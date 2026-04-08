import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { formatValidationErrors, validateGeneratedArtifacts, validateQtScriptArtifacts } from "../src/runtime-validator.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const DIST_DIR = resolve(ROOT, "dist-qtscript");

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

try {
  const mainJs = readFileSync(resolve(DIST_DIR, "main.js"), "utf-8");
  const runtimeJs = readFileSync(resolve(DIST_DIR, "runtime.js"), "utf-8");

  const legacyResult = validateGeneratedArtifacts(mainJs, runtimeJs);
  const qtscriptResult = validateQtScriptArtifacts(mainJs, runtimeJs);

  if (!legacyResult.ok) {
    fail(formatValidationErrors(legacyResult));
  }

  if (!qtscriptResult.ok) {
    fail(formatValidationErrors(qtscriptResult));
  }

  if (legacyResult.warnings.length > 0) {
    console.log("[Validate] Legacy warnings:");
    for (const warning of legacyResult.warnings) {
      console.log(` - ${warning}`);
    }
  }

  if (qtscriptResult.warnings.length > 0) {
    console.log("[Validate] QtScript warnings:");
    for (const warning of qtscriptResult.warnings) {
      console.log(` - ${warning}`);
    }
  }

  console.log("[Validate] QtScript artifacts OK");
} catch (error) {
  fail(`[Validate] Failed to validate QtScript artifacts: ${String(error)}`);
}
