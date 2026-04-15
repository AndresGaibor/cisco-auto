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

function assembleRuntimeOutput(code: string, devDirLiteral: string): string {
  return `
var __ipc = ipc || null;
var __dprint = dprint || function() {};
var __DEV_DIR = DEV_DIR || ${devDirLiteral};
var __fm = fm || (__ipc ? __ipc.systemFileManager() : null);
var ipc = __ipc;
var dprint = __dprint;
var DEV_DIR = __DEV_DIR;
var fm = __fm;

var __assign = function() {
  __assign = Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
      s = arguments[i];
      for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
    }
    return t;
  };
  return __assign.apply(this, arguments);
};
var __values = function(o, markArrayFunction) {
  if (typeof Symbol !== "undefined" && o[Symbol.iterator]) {
    var it = typeof markArrayFunction === "function" ? markArrayFunction(o) : o[Symbol.iterator]();
    var next;
    return {
      next: function() {
        next = it.next();
        return next;
      }
    };
  }
  var i = -1;
  return {
    next: function() {
      i += 1;
      next = { value: o[i], done: i >= o.length };
      return next;
    }
  };
};
var __read = function(o, n) {
  if (n === undefined) n = o.length;
  var m = new Array(n);
  var i = 0;
  var r;
  if (Array.isArray(o) || (typeof o[Symbol.iterator] === "function" && !isNaN(Number(o.length)))) {
    for (var it = __values(o), s; !(s = it.next()).done; ) {
      if (i === n) break;
      m[i++] = s.value;
    }
  } else {
    for (var a = [], j = 0; j < o.length; j++) a.push(o[j]);
    m = a.slice(0, n);
  }
  return m;
};
var __spreadArray = function(to, from, pack) {
  if (pack || from.length === 0) {
    for (var i = 0, e = from.length; i < e; i++) {
      to[i + (pack ? 0 : to.length)] = from[i];
    }
  } else {
    for (var i = from.length, j = to.length; i--; ) {
      to[j--] = from[i];
    }
  }
  return to;
};

${code}

try {
  var deps = createPtDepsFromGlobals({ ipc: ipc, fm: fm, dprint: dprint, DEV_DIR: DEV_DIR });
  var _g = (typeof self !== "undefined") ? self : this;
  _g._ptDispatch = function(payload) {
    return runtimeDispatcher(payload, deps);
  };
  if (typeof dprint === "function") dprint("[runtime] dispatch ready");
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

  return { code, validation };
}

export async function renderRuntimeV2(options: RenderRuntimeV2Options): Promise<string> {
  const { code, validation } = validateAndTransform(options.srcDir, options.minify ?? false);

  if (!validation.valid) {
    console.error("[render-runtime-v2] Validation FAILED:");
    for (const issue of validation.errors) {
      console.error(`  ${issue.line}:${issue.column}: ${issue.message}`);
    }
    throw new Error("runtime.js generation failed PT-safe validation");
  }

  const devDirLiteral = options.injectDevDir ? JSON.stringify(options.injectDevDir) : 'DEV_DIR + "/pt-dev"';
  const output = `
// PT Runtime - Generated from TypeScript via AST pipeline V2
// Do not edit directly - regenerate with: bun run build:runtime-v2
// Generated at: ${new Date().toISOString()}
${assembleRuntimeOutput(code, devDirLiteral)}`;

  if (options.outputPath) {
    await fs.promises.mkdir(path.dirname(options.outputPath), { recursive: true });
    await fs.promises.writeFile(options.outputPath, output, "utf-8");
  }

  return output;
}

export function renderRuntimeV2Sync(options: RenderRuntimeV2Options): string {
  const { code, validation } = validateAndTransform(options.srcDir, options.minify ?? false);

  if (!validation.valid) {
    console.error("[render-runtime-v2] Validation FAILED:");
    for (const issue of validation.errors) {
      console.error(`  ${issue.line}:${issue.column}: ${issue.message}`);
    }
    throw new Error("runtime.js generation failed PT-safe validation");
  }

  const devDirLiteral = options.injectDevDir ? JSON.stringify(options.injectDevDir) : 'DEV_DIR + "/pt-dev"';
  const output = `
// PT Runtime - Generated from TypeScript via AST pipeline V2
// Do not edit directly - regenerate with: bun run build:runtime-v2
// Generated at: ${new Date().toISOString()}
${assembleRuntimeOutput(code, devDirLiteral)}`;

  if (options.outputPath) {
    fs.mkdirSync(path.dirname(options.outputPath), { recursive: true });
    fs.writeFileSync(options.outputPath, output, "utf-8");
  }

  return output;
}
