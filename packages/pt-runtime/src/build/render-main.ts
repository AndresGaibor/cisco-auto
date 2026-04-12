// packages/pt-runtime/src/build/render-main.ts
// Generate main.js from TypeScript kernel modules

import { transformToPtSafe, wrapMainBootstrap } from "./pt-safe-transforms";
import { validatePtSafe, formatValidationResult } from "./validate-pt-safe";
import * as fs from "fs";
import * as path from "path";

export interface RenderMainOptions {
  inputDir: string;
  outputPath: string;
  devDir: string;
}

export async function renderMainSource(options: RenderMainOptions): Promise<string> {
  // Read kernel source files
  const kernelFiles = [
    "pt/kernel/queue.ts",
    "pt/kernel/heartbeat.ts",
    "pt/kernel/runtime-loader.ts",
    "pt/kernel/cleanup.ts",
    "pt/kernel/main.ts",
  ];
  
  let combined = "";
  
  for (const file of kernelFiles) {
    const filePath = path.join(options.inputDir, file);
    if (fs.existsSync(filePath)) {
      const content = await fs.promises.readFile(filePath, "utf-8");
      combined += `\n// --- ${file} ---\n`;
      combined += content;
    }
  }
  
  // Transform to PT-safe
  const transformed = transformToPtSafe(combined, {
    wrapInFunction: false,
  });
  
  // Inject DEV_DIR
  const withDevDir = transformed.replace(/{{DEV_DIR_LITERAL}}/g, `"${options.devDir}"`);
  
  // Wrap with bootstrap
  const bootstrapped = wrapMainBootstrap(withDevDir);
  
  // Validate
  const validation = validatePtSafe(bootstrapped);
  console.log(formatValidationResult(validation));
  
  if (!validation.valid) {
    throw new Error("main.js validation failed");
  }
  
  return bootstrapped;
}

export async function buildMain(options: RenderMainOptions): Promise<void> {
  const code = await renderMainSource(options);
  await fs.promises.writeFile(options.outputPath, code, "utf-8");
  console.log(`Generated ${options.outputPath}`);
}