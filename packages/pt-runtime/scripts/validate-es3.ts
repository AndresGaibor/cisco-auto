import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "acorn";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

function validateES3(code: string, filename: string): boolean {
  console.log(`[Validate] Checking ${filename}...`);
  
  try {
    parse(code, { ecmaVersion: 3 });
    console.log(`[Validate] ${filename}: OK`);
    return true;
  } catch (e: any) {
    console.error(`[Validate] ${filename}: FAILED`);
    console.error(`  Line ${e.loc?.line || "?"}: ${e.message}`);
    return false;
  }
}

function main(): void {
  const files = [
    "generated/runtime.js",
    "generated/main.js"
  ];
  
  let allValid = true;
  
  for (const file of files) {
    const code = readFileSync(resolve(ROOT, file), "utf-8");
    if (!validateES3(code, file)) {
      allValid = false;
    }
  }
  
  if (allValid) {
    console.log("[Validate] All files pass ES3 validation");
    process.exit(0);
  } else {
    console.error("[Validate] ES3 validation FAILED");
    process.exit(1);
  }
}

main();
