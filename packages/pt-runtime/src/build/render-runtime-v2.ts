import * as fs from "fs";
import * as path from "path";
import * as ts from "typescript";
import { transformToPtSafeAst, type AstTransformOptions } from "./ast-transform.js";
import { validatePtSafe, formatValidationResult, type ValidationResult } from "./validate-pt-safe.js";
import { getAllRuntimeFiles, validateRuntimeManifestDependencies } from "./runtime-manifest.js";
import { sanitizeTypeScriptHelperGlobalThis } from "./sanitize-typescript-helpers.js";
import { assertJavaScriptSyntaxOrThrow } from "./syntax-assert.js";
import { assertNoDuplicateTopLevelSymbols } from "./top-level-symbols.js";
import { tslibHelpersTemplate } from "./templates/index.js";
import { toPtRuntimePathLiteral } from "./pt-paths.js";

export interface RenderRuntimeV2Options {
  srcDir: string;
  outputPath: string;
  injectDevDir?: string;
  minify?: boolean;
}

const RUNTIME_SOURCE_FILES = getAllRuntimeFiles();

function shouldShowValidationDetails(): boolean {
  return typeof Bun !== "undefined"
    ? Bun.env.PT_SHOW_VALIDATION_WARNINGS === "1" || Bun.env.PT_DEBUG === "1"
    : false;
}

function reportPtSafeValidation(label: string, validation: ValidationResult): void {
  if (validation.valid) {
    return;
  }

  if (!shouldShowValidationDetails()) {
    console.warn(
      `[${label}] PT-safe validation produced ` +
        `${validation.errors.length} error(s) and ${validation.warnings.length} warning(s). ` +
        `Details hidden by default. Set PT_SHOW_VALIDATION_WARNINGS=1 to inspect them.`,
    );
    return;
  }

  console.error(`[${label}] Validation FAILED:`);
  console.error(formatValidationResult(validation));
}

function assertNoEmittedTypeScriptHelpers(label: string, code: string): void {
  const forbidden = [
    "var __assign = (this && this.__assign)",
    "var __awaiter = (this && this.__awaiter)",
    "var __generator = (this && this.__generator)",
    "var __values = (this && this.__values)",
    "var __read = (this && this.__read)",
    "var __spreadArray = (this && this.__spreadArray)",
  ];

  for (const marker of forbidden) {
    if (code.includes(marker)) {
      throw new Error(`${label} still contains emitted TypeScript helper: ${marker}`);
    }
  }
}

function assembleRuntimeOutput(code: string, devDirLiteral: string): string {
  const tslibHelpers = tslibHelpersTemplate();

  return `
var __ipc = (typeof _g !== "undefined" && _g && typeof _g.ipc !== "undefined" && _g.ipc !== null) ? _g.ipc : null;
if (!__ipc && typeof self !== "undefined" && self && typeof self.ipc !== "undefined") {
  __ipc = self.ipc;
}
var __dprint = (typeof dprint !== "undefined") ? dprint
             : function(msg) { if (typeof print === "function") print(String(msg)); };
var __DEV_DIR = (typeof DEV_DIR !== "undefined") ? DEV_DIR : ${devDirLiteral};
var __fm = (typeof fm !== "undefined") ? fm : null;
if (!__fm && __ipc && typeof __ipc.systemFileManager === "function") {
  try { __fm = __ipc.systemFileManager(); } catch(e) {}
}
if (!__fm && typeof _ScriptModule !== "undefined" && _ScriptModule) {
  __fm = {
    fileExists: function(p) { try { var sz = _ScriptModule.getFileSize(p); return sz >= 0; } catch(e) { return false; } },
    directoryExists: function(p) { try { return _ScriptModule.getFileSize(p) >= 0; } catch(e) { return false; } },
    getFileContents: function(p) { return _ScriptModule.getFileContents(p); },
    writePlainTextToFile: function(p, c) { _ScriptModule.writeTextToFile(p, c); },
    makeDirectory: function(p) { try { _ScriptModule.writeTextToFile(p + "/.keep", ""); } catch(e) {} return true; },
    getFilesInDirectory: function(p) { try { return _ScriptModule.getFilesInDirectory ? _ScriptModule.getFilesInDirectory(p) : []; } catch(e) { return []; } },
    removeFile: function(p) { try { _ScriptModule.removeFile ? _ScriptModule.removeFile(p) : void 0; } catch(e) {} },
    moveSrcFileToDestFile: function(s, d, o) { try { var c = _ScriptModule.getFileContents(s); _ScriptModule.writeTextToFile(d, c); } catch(e) {} },
    getFileModificationTime: function(p) { try { return _ScriptModule.getFileModificationTime(p); } catch(e) { return 0; } },
    getFileSize: function(p) { try { return _ScriptModule.getFileSize(p); } catch(e) { return -1; } },
  };
}
var ipc = __ipc;
var DEV_DIR = __DEV_DIR;
var fm = __fm;

var __ptDebugEvents = [];
var __ptDebugSeq = 0;
function __writeDebugLog(scope, message, level) {
  try {
    var gs = (typeof self !== "undefined") ? self : (typeof _global !== "undefined") ? _global : (function() { return this; })();
    if (gs && typeof gs.__writeKernelDebugLog === "function") {
      gs.__writeKernelDebugLog(scope, message, level);
      return;
    }
  } catch (e) {}

  try {
    if (!fm || !fm.writePlainTextToFile) return;
    __ptDebugSeq += 1;
    __ptDebugEvents.push(JSON.stringify({
      seq: __ptDebugSeq,
      timestamp: new Date().toISOString(),
      scope: scope,
      message: String(message),
      level: level || "debug",
    }));
    if (__ptDebugEvents.length > 500) {
      __ptDebugEvents = __ptDebugEvents.slice(-500);
    }
    fm.writePlainTextToFile(DEV_DIR + "/logs/pt-debug.current.ndjson", __ptDebugEvents.join("\\n") + "\\n");
  } catch (e) {}
}

var dprint = function(msg) {
  __writeDebugLog("runtime", msg, "debug");
};

var _g = (typeof self !== "undefined") ? self
       : (typeof _global !== "undefined") ? _global
       : (function() { return this; })();

${tslibHelpers}

${code}

// --- INITIALIZATION BLOCK ---
try {
  if (typeof dprint === "function") dprint("[runtime] initializing handlers...");
  
  // Re-verify imports from runtime-handlers.ts are present in 'code'
  var deps = createPtDepsFromGlobals({ ipc: ipc, fm: fm, dprint: dprint, DEV_DIR: DEV_DIR });
  
  _g._ptDispatch = function(payload, api) {
    return runtimeDispatcher(payload, api || deps);
  };
  
  if (typeof dprint === "function") {
    var count = 0;
    if (typeof _g !== 'undefined' && _g.HANDLER_MAP) {
        for (var k in _g.HANDLER_MAP) { if (Object.prototype.hasOwnProperty.call(_g.HANDLER_MAP, k)) count++; }
    }
    dprint("[runtime] dispatch ready. Registered: " + count);
  }
} catch (e) {
  if (typeof dprint === "function") dprint("[runtime] INIT ERROR: " + String(e));
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
    const details = missingDependencies
      .map((file) => {
        const importedBy = findRuntimeImportersOf(sourceFiles, file);
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
    target: undefined,
    replaceConsoleWithDprint: true,
    wrapIIFE: false,
    minify,
    // Tree-shaking is disabled: RUNTIME_MANIFEST already curates the exact file list
    // in dependency order. The tree-shaker's regex cannot parse multi-line TS imports,
    // which causes handlers like vlan.ts/dhcp.ts to be silently excluded.
    treeShake: false,
  });

  assertNoEmittedTypeScriptHelpers("runtime transform output", code);

  return { code, validation };
}

export async function renderRuntimeV2(options: RenderRuntimeV2Options): Promise<string> {
  const { code, validation } = validateAndTransform(options.srcDir, options.minify ?? false);

  reportPtSafeValidation("render-runtime-v2", validation);

  const devDirLiteral = options.injectDevDir
    ? toPtRuntimePathLiteral(options.injectDevDir)
    : '"/pt-dev"';
  let output = `
// PT Runtime - Generated from TypeScript via AST pipeline V2
// Do not edit directly - regenerate with: bun run pt build
${assembleRuntimeOutput(code, devDirLiteral)}`;

  assertJavaScriptSyntaxOrThrow("runtime.js after assembleRuntimeOutput", output);

  assertNoDuplicateTopLevelSymbols(output, {
    fileName: "runtime.js",
    label: "runtime.js",
    allowDuplicateVarDeclarations: true,
  });

  output = sanitizeTypeScriptHelperGlobalThis(output);

  assertJavaScriptSyntaxOrThrow("runtime.js after sanitizeTypeScriptHelperGlobalThis", output);

  if (options.outputPath) {
    await fs.promises.mkdir(path.dirname(options.outputPath), { recursive: true });
    await fs.promises.writeFile(options.outputPath, output, "utf-8");
  }

  return output;
}

export function renderRuntimeV2Sync(options: RenderRuntimeV2Options): string {
  const { code, validation } = validateAndTransform(options.srcDir, options.minify ?? false);

  reportPtSafeValidation("render-runtime-v2 (sync)", validation);

  const devDirLiteral = options.injectDevDir
    ? toPtRuntimePathLiteral(options.injectDevDir)
    : '"/pt-dev"';
  let output = `
// PT Runtime - Generated from TypeScript via AST pipeline V2
// Do not edit directly - regenerate with: bun run pt build
${assembleRuntimeOutput(code, devDirLiteral)}`;

  assertJavaScriptSyntaxOrThrow("runtime.js after assembleRuntimeOutput (sync)", output);

  assertNoDuplicateTopLevelSymbols(output, {
    fileName: "runtime.js",
    label: "runtime.js (sync)",
    allowDuplicateVarDeclarations: true,
  });

  output = sanitizeTypeScriptHelperGlobalThis(output);

  assertJavaScriptSyntaxOrThrow("runtime.js after sanitizeTypeScriptHelperGlobalThis (sync)", output);

  if (options.outputPath) {
    fs.mkdirSync(path.dirname(options.outputPath), { recursive: true });
    fs.writeFileSync(options.outputPath, output, "utf-8");
  }

  return output;
}

/**
 * Given a set of source files and a missing dependency path, find which manifest
 * files import it so the error message tells you exactly who needs it.
 */
function findRuntimeImportersOf(sourceFiles: Map<string, string>, missingFile: string): string[] {
  const importers: string[] = [];
  const manifestFiles = new Set(getAllRuntimeFiles());

  for (const [filePath, content] of sourceFiles) {
    const sf = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    sf.forEachChild((node) => {
      if (ts.isImportDeclaration(node)) {
        const specifier = node.moduleSpecifier;
        if (!specifier || !ts.isStringLiteral(specifier)) return;
        if (node.importClause?.isTypeOnly) return;
        const resolved = resolveRuntimeImport(filePath, specifier.text, manifestFiles);
        if (resolved === missingFile) {
          importers.push(filePath);
        }
      }
    });
  }

  return importers;
}

function resolveRuntimeImport(
  fromFile: string,
  specifier: string,
  knownFiles: Set<string>,
): string | null {
  if (!specifier.startsWith(".")) return null;

  const fromDir = path.posix.dirname(fromFile);
  const normalized = path.posix.normalize(path.posix.join(fromDir, specifier));
  const candidates = new Set<string>([
    normalized,
    normalized.replace(/\.js$/, ".ts"),
    normalized.replace(/\.js$/, ".tsx"),
    normalized + ".ts",
    normalized + ".tsx",
    path.posix.join(normalized, "index.ts"),
    path.posix.join(normalized, "index.tsx"),
  ]);

  let fallback: string | null = null;

  for (const candidate of candidates) {
    if (!fallback && (candidate.endsWith(".ts") || candidate.endsWith(".tsx"))) {
      fallback = candidate;
    }
    if (knownFiles.has(candidate)) {
      return candidate;
    }
  }

  return fallback;
}
