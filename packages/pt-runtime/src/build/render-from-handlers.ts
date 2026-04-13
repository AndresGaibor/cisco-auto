// packages/pt-runtime/src/build/render-from-handlers.ts
// Renderer simplificado que toma handlers y genera runtime.js PT-safe

import * as fs from "fs";
import * as path from "path";
import { transformToPtSafeAst, type AstTransformOptions } from "./ast-transform.js";
import { validatePtSafe, type ValidationResult } from "./validate-pt-safe.js";

export interface RenderFromHandlersOptions {
  handlersDir: string;
  outputPath: string;
  minify?: boolean;
}

const HANDLER_FILES = [
  "handlers/device.ts",
  "handlers/link.ts",
  "handlers/inspect.ts",
  "handlers/module.ts",
  "handlers/canvas.ts",
  "handlers/vlan.ts",
  "handlers/dhcp.ts",
  "handlers/host.ts",
  "handlers/ios-engine.ts",
  "handlers/runtime-handlers.ts",
];

function assembleHandlersOutput(code: string): string {
  return `
var RUNTIME_EXPORTS = {};

(function() {
  var ipc = (typeof ipc !== "undefined") ? ipc : null;
  var dprint = (typeof dprint !== "undefined") ? dprint : function() {};
  var DEV_DIR = (typeof DEV_DIR !== "undefined") ? DEV_DIR : "/tmp/pt-dev";
  var fm = ipc ? ipc.systemFileManager() : null;

${code}

  var deps = createPtDepsFromGlobals({ ipc: ipc, fm: fm, dprint: dprint, DEV_DIR: DEV_DIR });

  RUNTIME_EXPORTS.dispatch = function(payload) {
    return runtimeDispatcher(payload, deps);
  };

})();

var dispatch = RUNTIME_EXPORTS.dispatch;
`;
}

export function renderRuntimeFromHandlers(options: RenderFromHandlersOptions): string {
  const sourceFiles = new Map<string, string>();

  for (const relPath of HANDLER_FILES) {
    const filePath = path.join(options.handlersDir, relPath);
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
    console.error("[render-from-handlers] Validation FAILED:");
    for (const issue of validation.errors) {
      console.error(`  ${issue.line}:${issue.column}: ${issue.message}`);
    }
    throw new Error("runtime.js generation failed PT-safe validation");
  }

  const output = `
// PT Runtime - Generated from Handlers
// Generated at: ${new Date().toISOString()}
${assembleHandlersOutput(code)}`;

  if (options.outputPath) {
    fs.mkdirSync(path.dirname(options.outputPath), { recursive: true });
    fs.writeFileSync(options.outputPath, output, "utf-8");
  }

  return output;
}
