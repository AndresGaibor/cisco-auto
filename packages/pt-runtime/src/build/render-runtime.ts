// packages/pt-runtime/src/build/render-runtime.ts
// Generate runtime.js from TypeScript handler modules

import { transformToPtSafe, wrapRuntimeBootstrap } from "./pt-safe-transforms";
import { validatePtSafe, formatValidationResult } from "./validate-pt-safe";
import * as fs from "fs";
import * as path from "path";

export interface RenderRuntimeOptions {
  inputDir: string;
  outputPath: string;
}

export async function renderRuntimeSource(options: RenderRuntimeOptions): Promise<string> {
  // Read handler and domain source files
  const runtimeFiles = [
    "domain/contracts.ts",
    "domain/deferred-job-plan.ts",
    "domain/runtime-result.ts",
    "runtime/contracts.ts",
    "runtime/types.ts",
    "runtime/constants.ts",
    "handlers/runtime-handlers.ts",
    "handlers/config.ts",
    "handlers/device.ts",
    "handlers/link.ts",
    "handlers/inspect.ts",
  ];
  
  let combined = "";
  
  for (const file of runtimeFiles) {
    const filePath = path.join(options.inputDir, file);
    if (fs.existsSync(filePath)) {
      const content = await fs.promises.readFile(filePath, "utf-8");
      combined += `\n// --- ${file} ---\n`;
      combined += content;
    }
  }
  
  // Transform to PT-safe
  const transformed = transformToPtSafe(combined, {
    wrapInFunction: true,
    functionName: "dispatch",
    injectGlobals: ["ipc", "dprint"],
  });
  
  // Wrap with bootstrap
  const bootstrapped = wrapRuntimeBootstrap(transformed);
  
  // Validate
  const validation = validatePtSafe(bootstrapped);
  console.log(formatValidationResult(validation));
  
  if (!validation.valid) {
    throw new Error("runtime.js validation failed");
  }
  
  return bootstrapped;
}

export async function buildRuntime(options: RenderRuntimeOptions): Promise<void> {
  const code = await renderRuntimeSource(options);
  await fs.promises.writeFile(options.outputPath, code, "utf-8");
  console.log(`Generated ${options.outputPath}`);
}