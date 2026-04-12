import * as fs from "fs";
import * as path from "path";
import { transformToPtSafeAst, type AstTransformOptions } from "./ast-transform.js";
import { formatValidationResult } from "./validate-pt-safe.js";

export interface RenderFromHandlersOptions {
  handlersDir: string;
  extraDirs?: string[];
  outputPath: string;
  transformOptions?: AstTransformOptions;
}

const RUNTIME_FILE_ORDER = [
  "pt-api/pt-api-registry.ts",
  "pt-api/pt-deps.ts",
  "pt-api/pt-results.ts",
  "runtime/contracts.ts",
  "utils/constants.ts",
  "utils/helpers.ts",
  "handlers/vlan.ts",
  "handlers/dhcp.ts",
  "handlers/host.ts",
  "handlers/index.ts",
];

export function renderRuntimeFromHandlers(options: RenderFromHandlersOptions): string {
  const sourceFiles = new Map<string, string>();

  for (const relativePath of RUNTIME_FILE_ORDER) {
    const fullPath = path.join(options.handlersDir, relativePath);
    if (fs.existsSync(fullPath)) {
      sourceFiles.set(relativePath, fs.readFileSync(fullPath, "utf-8"));
    }
  }

  const { code, validation } = transformToPtSafeAst(sourceFiles, {
    wrapIIFE: true,
    ...options.transformOptions,
  });

  const output = [
    "// PT Runtime - Generated from TypeScript handlers",
    "// Do not edit directly - regenerate with: bun run build:runtime",
    `// Generated at: ${new Date().toISOString()}`,
    `// Source files: ${Array.from(sourceFiles.keys()).join(", ")}`,
    "",
    code,
  ].join("\n");

  if (options.outputPath) {
    fs.mkdirSync(path.dirname(options.outputPath), { recursive: true });
    fs.writeFileSync(options.outputPath, output, "utf-8");
  }

  if (!validation.valid) {
    throw new Error(`runtime.js validation failed\n${formatValidationResult(validation)}`);
  }

  return output;
}
