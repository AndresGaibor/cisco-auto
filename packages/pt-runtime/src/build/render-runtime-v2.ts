import * as fs from "fs";
import * as path from "path";
import { transformToPtSafeAst, type AstTransformOptions } from "./ast-transform.js";
import { validatePtSafe, formatValidationResult, type ValidationResult } from "./validate-pt-safe.js";
import { getAllRuntimeFiles } from "./runtime-manifest.js";

export interface RenderRuntimeV2Options {
  srcDir: string;
  outputPath: string;
  injectDevDir?: string;
  minify?: boolean;
}

const RUNTIME_SOURCE_FILES = getAllRuntimeFiles();

export async function renderRuntimeV2(options: RenderRuntimeV2Options): Promise<string> {
  const sourceFiles = new Map<string, string>();

  for (const relPath of RUNTIME_SOURCE_FILES) {
    const filePath = path.join(options.srcDir, relPath);
    if (fs.existsSync(filePath)) {
      const content = await fs.promises.readFile(filePath, "utf-8");
      sourceFiles.set(relPath, content);
    }
  }

  const { code, validation } = transformToPtSafeAst(sourceFiles, {
    target: undefined,
    replaceConsoleWithDprint: true,
    wrapIIFE: false,
    minify: options.minify ?? false,
  });

  if (!validation.valid) {
    console.error("[render-runtime-v2] Validation FAILED:");
    for (const issue of validation.errors) {
      console.error(`  ${issue.line}:${issue.column}: ${issue.message}`);
    }
    throw new Error("runtime.js generation failed PT-safe validation");
  }

  const devDirLiteral = options.injectDevDir ? JSON.stringify(options.injectDevDir) : 'DEV_DIR + "/pt-dev"';

  let output = `
// PT Runtime - Generated from TypeScript via AST pipeline V2
// Do not edit directly - regenerate with: bun run build:runtime-v2
// Generated at: ${new Date().toISOString()}

var RUNTIME_EXPORTS = {};

(function() {
  var ipc = (typeof ipc !== "undefined") ? ipc : null;
  var dprint = (typeof dprint !== "undefined") ? dprint : function() {};
  var DEV_DIR = (typeof DEV_DIR !== "undefined") ? DEV_DIR : ${devDirLiteral};
  var fm = ipc ? ipc.systemFileManager() : null;

${code}

  var deps = createPtDepsFromGlobals({ ipc: ipc, fm: fm, dprint: dprint, DEV_DIR: DEV_DIR });

  RUNTIME_EXPORTS.dispatch = function(payload) {
    return runtimeDispatcher(payload, deps);
  };

})();

var dispatch = RUNTIME_EXPORTS.dispatch;
`;

  if (options.outputPath) {
    await fs.promises.mkdir(path.dirname(options.outputPath), { recursive: true });
    await fs.promises.writeFile(options.outputPath, output, "utf-8");
  }

  return output;
}

export function renderRuntimeV2Sync(options: RenderRuntimeV2Options): string {
  const sourceFiles = new Map<string, string>();

  for (const relPath of RUNTIME_SOURCE_FILES) {
    const filePath = path.join(options.srcDir, relPath);
    if (fs.existsSync(filePath)) {
      sourceFiles.set(relPath, fs.readFileSync(filePath, "utf-8"));
    }
  }

  const { code, validation } = transformToPtSafeAst(sourceFiles, {
    target: undefined,
    replaceConsoleWithDprint: true,
    wrapIIFE: false,
    minify: options.minify ?? false,
  });

  if (!validation.valid) {
    console.error("[render-runtime-v2] Validation FAILED:");
    for (const issue of validation.errors) {
      console.error(`  ${issue.line}:${issue.column}: ${issue.message}`);
    }
    throw new Error("runtime.js generation failed PT-safe validation");
  }

  const devDirLiteral = options.injectDevDir ? JSON.stringify(options.injectDevDir) : 'DEV_DIR + "/pt-dev"';

  let output = `
// PT Runtime - Generated from TypeScript via AST pipeline V2
// Do not edit directly - regenerate with: bun run build:runtime-v2
// Generated at: ${new Date().toISOString()}

var RUNTIME_EXPORTS = {};

(function() {
  var ipc = (typeof ipc !== "undefined") ? ipc : null;
  var dprint = (typeof dprint !== "undefined") ? dprint : function() {};
  var DEV_DIR = (typeof DEV_DIR !== "undefined") ? DEV_DIR : ${devDirLiteral};
  var fm = ipc ? ipc.systemFileManager() : null;

${code}

  var deps = createPtDepsFromGlobals({ ipc: ipc, fm: fm, dprint: dprint, DEV_DIR: DEV_DIR });

  RUNTIME_EXPORTS.dispatch = function(payload) {
    return runtimeDispatcher(payload, deps);
  };

})();

var dispatch = RUNTIME_EXPORTS.dispatch;
`;

  if (options.outputPath) {
    fs.mkdirSync(path.dirname(options.outputPath), { recursive: true });
    fs.writeFileSync(options.outputPath, output, "utf-8");
  }

  return output;
}
