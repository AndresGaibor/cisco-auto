import * as fs from "fs";
import * as path from "path";
import { transformToPtSafeAst, type AstTransformOptions } from "./ast-transform.js";
import { validatePtSafe, formatValidationResult, type ValidationResult } from "./validate-pt-safe.js";
import { getAllMainFiles } from "./main-manifest.js";

export interface RenderMainV2Options {
  srcDir: string;
  outputPath: string;
  injectDevDir?: string;
}

const KERNEL_SOURCE_FILES = getAllMainFiles();

export function renderMainV2(options: RenderMainV2Options): string {
  const sourceFiles = new Map<string, string>();

  for (const relPath of KERNEL_SOURCE_FILES) {
    const filePath = path.join(options.srcDir, relPath);
    if (fs.existsSync(filePath)) {
      sourceFiles.set(relPath, fs.readFileSync(filePath, "utf-8"));
    }
  }

  const { code, validation } = transformToPtSafeAst(sourceFiles, {
    target: undefined,
    replaceConsoleWithDprint: true,
    wrapIIFE: false,
    inlineConstants: {},
  });

  if (!validation.valid) {
    console.error("[render-main-v2] Validation FAILED:");
    for (const issue of validation.errors) {
      console.error(`  ${issue.line}:${issue.column}: ${issue.message}`);
    }
    throw new Error("main.js generation failed PT-safe validation");
  }

  const devDirLiteral = options.injectDevDir
    ? JSON.stringify(options.injectDevDir)
    : 'DEV_DIR + "/pt-dev"';

  let output = `
// PT Main Kernel - Generated from TypeScript via AST pipeline V2
// Do not edit directly - regenerate with: bun run build:main-v2
// Generated at: ${new Date().toISOString()}

(function() {
  var ipc = (typeof ipc !== "undefined") ? ipc : null;
  var dprint = (typeof dprint !== "undefined") ? dprint : function() {};
  var DEV_DIR = (typeof DEV_DIR !== "undefined") ? DEV_DIR : ${devDirLiteral};
  var fm = ipc ? ipc.systemFileManager() : null;

${code}

})();

// PT Script Module entry points
function main() {
  if (typeof bootKernel === "function") {
    bootKernel({ devDir: DEV_DIR });
  } else if (typeof createKernel === "function") {
    var kernel = createKernel({
      devDir: DEV_DIR,
      commandsDir: DEV_DIR + "/commands",
      inFlightDir: DEV_DIR + "/in-flight",
      resultsDir: DEV_DIR + "/results",
      deadLetterDir: DEV_DIR + "/dead-letter",
      logsDir: DEV_DIR + "/logs",
      commandsTraceDir: DEV_DIR + "/logs/commands",
      pollIntervalMs: 1000,
      deferredPollIntervalMs: 500,
      heartbeatIntervalMs: 5000,
    });
    kernel.boot();
  }
}

function cleanUp() {
  if (typeof shutdownKernel === "function") {
    shutdownKernel();
  }
}
`;

  if (options.outputPath) {
    fs.mkdirSync(path.dirname(options.outputPath), { recursive: true });
    fs.writeFileSync(options.outputPath, output, "utf-8");
  }

  return output;
}
