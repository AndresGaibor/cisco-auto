import * as fs from "fs";
import * as path from "path";
import { transformToPtSafeAst, type AstTransformOptions } from "./ast-transform.js";
import { type ValidationResult } from "./validate-pt-safe.js";
import { getAllRuntimeFiles, validateRuntimeManifestDependencies } from "./runtime-manifest.js";
import {
  assertNoEmittedTypeScriptHelpers,
  reportPtSafeValidation,
  resolveImportPath,
} from "./build-utils.js";
import { sanitizeTypeScriptHelperGlobalThis } from "./sanitize-typescript-helpers.js";
import { assertJavaScriptSyntaxOrThrow } from "./syntax-assert.js";
import { toPtRuntimePathLiteral } from "./pt-paths.js";

export interface RenderRuntimeV2Options {
  srcDir: string;
  outputPath: string;
  injectDevDir?: string;
  minify?: boolean;
}

const RUNTIME_SOURCE_FILES = getAllRuntimeFiles();

function assembleRuntimeOutput(code: string, devDirLiteral: string): string {
  return `
// runtime.js runs inside main.js kernel scope — globals already set by kernel IIFE
var _g = (typeof self !== "undefined") ? self : (function() { return this; })();

var ipc = (typeof _g.ipc !== "undefined" && _g.ipc) ? _g.ipc : null;
var fm = (typeof _g.fm !== "undefined" && _g.fm) ? _g.fm : null;
var DEV_DIR = (typeof _g.DEV_DIR !== "undefined") ? _g.DEV_DIR : ${devDirLiteral};
var dprint = (typeof _g.dprint === "function") ? _g.dprint : function(msg) {
  if (typeof print === "function") print(String(msg));
};

${code}

// --- INITIALIZATION BLOCK ---
try {
  dprint("[runtime] initializing handlers...");
  var deps = createPtDepsFromGlobals({ ipc: ipc, fm: fm, dprint: dprint, DEV_DIR: DEV_DIR });
  _g._ptDispatch = function(payload, api) {
    return runtimeDispatcher(payload, api || deps);
  };
  var count = 0;
  if (typeof _g.HANDLER_MAP !== "undefined") {
    for (var k in _g.HANDLER_MAP) {
      if (Object.prototype.hasOwnProperty.call(_g.HANDLER_MAP, k)) count++;
    }
  }
  dprint("[runtime] dispatch ready. Registered: " + count);
} catch (e) {
  dprint("[runtime] INIT ERROR: " + String(e));
}
`;
}

function validateAndTransform(srcDir: string, minify: boolean): { code: string; validation: ValidationResult } {
  const sourceFiles = new Map<string, string>();

  for (const relPath of RUNTIME_SOURCE_FILES) {
    const filePath = path.join(srcDir, relPath);
    if (fs.existsSync(filePath)) {
      sourceFiles.set(relPath, fs.readFileSync(filePath, "utf-8"));
    }
  }

  const missingDependencies = validateRuntimeManifestDependencies(sourceFiles);
  if (missingDependencies.length > 0) {
    const manifestFiles = new Set(getAllRuntimeFiles());
    const details = missingDependencies
      .map((file) => {
        const importedBy = findImportersOf(sourceFiles, file, manifestFiles);
        return `  - ${file} (imported by: ${importedBy.join(", ")})`;
      })
      .join("\n");
    throw new Error(
      `[render-runtime-v2] BUILD FAILED: runtime.js manifest is missing ${missingDependencies.length} transitive dependenc${missingDependencies.length === 1 ? "y" : "ies"}.\n` +
        `These files are imported by manifest entries but not listed in RUNTIME_MANIFEST.\n` +
        `Add them to the appropriate section in packages/pt-runtime/src/build/runtime-manifest.ts:\n` +
        details,
    );
  }

  const { code, validation } = transformToPtSafeAst(sourceFiles, {
    replaceConsoleWithDprint: true,
    minify,
    treeShake: false,
  });

  assertNoEmittedTypeScriptHelpers("runtime transform output", code);

  return { code, validation };
}

function buildPipeline(options: RenderRuntimeV2Options, label: string): string {
  const { code, validation } = validateAndTransform(options.srcDir, options.minify ?? false);

  reportPtSafeValidation(label, validation);

  const devDirLiteral = options.injectDevDir
    ? toPtRuntimePathLiteral(options.injectDevDir)
    : '"/pt-dev"';

  let output = assembleRuntimeOutput(code, devDirLiteral);

  output = sanitizeTypeScriptHelperGlobalThis(output);

  assertJavaScriptSyntaxOrThrow(label, output);

  return output;
}

export async function renderRuntimeV2(options: RenderRuntimeV2Options): Promise<string> {
  const output = buildPipeline(options, "runtime.js");

  if (options.outputPath) {
    await fs.promises.mkdir(path.dirname(options.outputPath), { recursive: true });
    await fs.promises.writeFile(options.outputPath, output, "utf-8");
  }

  return output;
}

export function renderRuntimeV2Sync(options: RenderRuntimeV2Options): string {
  const output = buildPipeline(options, "runtime.js (sync)");

  if (options.outputPath) {
    fs.mkdirSync(path.dirname(options.outputPath), { recursive: true });
    fs.writeFileSync(options.outputPath, output, "utf-8");
  }

  return output;
}

function findImportersOf(
  sourceFiles: Map<string, string>,
  missingFile: string,
  manifestFiles: Set<string>,
): string[] {
  const importers: string[] = [];
  for (const [filePath, content] of sourceFiles) {
    if (!manifestFiles.has(filePath)) continue;
    const lines = content.split("\n");
    for (const line of lines) {
      const match = line.match(/^import\s+(?:type\s+)?.*?\s+from\s+["']([^"']+)["']/);
      if (!match) continue;
      const resolved = resolveImportPath(filePath, match[1], manifestFiles);
      if (resolved === missingFile) {
        importers.push(filePath);
      }
    }
  }
  return importers;
}
