import * as fs from "fs";
import * as path from "path";
import { transformToPtSafeAst, type AstTransformOptions } from "./ast-transform.js";
import { validatePtSafe, formatValidationResult, type ValidationResult } from "./validate-pt-safe.js";
import { getAllRuntimeFiles, validateRuntimeManifestDependencies } from "./runtime-manifest.js";

export interface RenderRuntimeV2Options {
  srcDir: string;
  outputPath: string;
  injectDevDir?: string;
  minify?: boolean;
}

const RUNTIME_SOURCE_FILES = getAllRuntimeFiles();

function assembleRuntimeOutput(code: string, devDirLiteral: string): string {
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

// --- INITIALIZATION BLOCK ---
try {
  if (typeof dprint === "function") dprint("[runtime] initializing handlers...");
  
  // Re-verify imports from runtime-handlers.ts are present in 'code'
  var deps = createPtDepsFromGlobals({ ipc: ipc, fm: fm, dprint: dprint, DEV_DIR: DEV_DIR });
  
  _g._ptDispatch = function(payload) {
    return runtimeDispatcher(payload, deps);
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
    throw new Error(
      "runtime.js manifest missing transitive dependencies:\n" +
        missingDependencies.map((file) => `  - ${file}`).join("\n") +
        "\nAdd them to RUNTIME_MANIFEST before building.",
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
