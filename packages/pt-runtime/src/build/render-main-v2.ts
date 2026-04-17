// packages/pt-runtime/src/build/render-main-v2.ts
// Genera main.js — el bootloader de PT Script Module.
//
// Responsabilidades de main.js (SOLO estas):
//   1. Kernel IIFE (compilado desde MAIN_MANIFEST)
//   2. _ptLoadModule — carga catalog.js desde disco
//   3. main() / cleanUp() — ciclo de vida de PT Script Module
//
// Hot reload es manejado por el kernel's runtime-loader.
// runtime.js se carga desde disco y se recarga automáticamente cuando cambia.
//
// NOTE: NO hay modo embedded. main.js siempre carga desde archivos en disco.

import * as fs from "fs";
import * as path from "path";
import { transformToPtSafeAst } from "./ast-transform.js";
import { formatValidationResult } from "./validate-pt-safe.js";
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
    treeShake: false, // kernel files are order-dependent; trust MAIN_MANIFEST ordering
  });

  if (!validation.valid) {
    console.error("[render-main-v2] Validation FAILED:");
    console.error(formatValidationResult(validation));
    for (const issue of validation.errors) {
      console.error(`  ${issue.line}:${issue.column}: [${issue.category}] ${issue.message}`);
      if (issue.suggestion) console.error(`    → ${issue.suggestion}`);
    }
    throw new Error(`main.js generation failed PT-safe validation (${validation.errors.length} error(s))`);
  }

  if (validation.warnings.length > 0) {
    console.warn(`[render-main-v2] ${validation.warnings.length} warning(s):`);
    for (const w of validation.warnings) {
      console.warn(`  ${w.line}:${w.column}: ${w.message}`);
    }
  }

  const devDirLiteral = options.injectDevDir
    ? JSON.stringify(options.injectDevDir)
    : '"/pt-dev"';

  const buildTimestamp = new Date().toISOString();

  // =========================================================================
  // Kernel IIFE
  // Contains all kernel + terminal source code (from MAIN_MANIFEST).
  // Exposes createKernel / shutdownKernel on the global scope (self).
  // Hot reload of runtime.js is handled internally by the kernel's
  // runtime-loader — no external setInterval needed in main.js.
  // =========================================================================
  // tslib helpers — required because ts.transpileModule uses ES5 + downlevelIteration
  // but noEmitHelpers=true means helpers are NOT auto-included.
  const tslibHelpers = `
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
var __awaiter = function(thisArg, _arguments, P, generator) {
  function adopt(value) { return value instanceof P ? value : new P(function(resolve) { resolve(value); }); }
  return new (P || (P = Promise))(function(resolve, reject) {
    function fulfilled(value) { try { step(generator.next(value)); } catch(e) { reject(e); } }
    function rejected(value) { try { step(generator["throw"](value)); } catch(e) { reject(e); } }
    function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};
var __generator = function(thisArg, body) {
  var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] };
  var f, y, t, g;
  return g = { next: verb(0), throw: verb(1), return: verb(2) };
  function verb(n) { return function(v) { return step([n, v]); }; }
  function step(op) {
    if (f) throw new TypeError("Generator is already executing.");
    while (_) try {
      if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
      if (y = 0, t) op = [op[0] & 2, t.value];
      switch (op[0]) {
        case 0: case 1: t = op; break;
        case 4: _.label++; return { value: op[1], done: false };
        case 5: _.label++; y = op[1]; op = [0]; continue;
        case 7: op = _.ops.pop(); _.trys.pop(); continue;
        default: if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
        if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
        if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
        if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
        if (t[2]) _.ops.pop();
        _.trys.pop(); continue;
      }
      op = body.call(thisArg, _);
    } catch (e) { op = [6, e]; y = 0; t = 0; } finally { f = t = 0; }
    if (op[0] & 5) throw op[1];
    return { value: op[0] ? op[1] : void 0, done: true };
  }
};
var __rest = function(s, e) {
  var t = {};
  for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0) t[p] = s[p];
  if (s != null && typeof Object.getOwnPropertySymbols === "function") {
    for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
      if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i])) t[p[i]] = s[p[i]];
    }
  }
  return t;
};
`;
  const kernelIife = `
(function() {
  // Bootstrap globals — PT QTScript 9.0: 'self' is undefined.
  // Use 'this' (which IS the global object) as our global scope reference.
  _g = (function() { return this; })();
  // Polyfill self so compiled kernel code using self.ipc / self.fm works transparently.
  if (typeof self === "undefined") { _g.self = _g; }
  var ipc = (typeof _g.ipc !== "undefined" && _g.ipc !== null) ? _g.ipc : null;
  if (!ipc && typeof _g.self !== "undefined" && _g.self && typeof _g.self.ipc !== "undefined") {
    ipc = _g.self.ipc;
  }
  _g.ipc = ipc;
  var __nativeDprint = (typeof _g.dprint === "function") ? _g.dprint : null;
  var dprint = function(msg) {
    try {
      var appWindow = ipc && typeof ipc.appWindow === "function" ? ipc.appWindow() : null;
      if (appWindow && typeof appWindow.writeToPT === "function") {
        appWindow.writeToPT(String(msg) + "\\n");
      }
    } catch (_dprintErr) {}
    try {
      if (__nativeDprint) __nativeDprint(String(msg));
    } catch (_nativeDprintErr) {}
    try { if (typeof print === "function") print(String(msg)); } catch (_printErr) {}
  };
  _g.dprint = dprint;
  var DEV_DIR = (typeof DEV_DIR !== "undefined") ? DEV_DIR : ${devDirLiteral};

  // fm initialization with dual-path fallback (BUG-01 fix)
  // PT 9.0: fm is NOT a global — must use ipc.systemFileManager() or _ScriptModule shim
  var fm = null;
  try {
    if (typeof ipc !== "undefined" && ipc !== null && typeof ipc.systemFileManager === "function") {
      fm = ipc.systemFileManager();
    }
  } catch (_fmErr) {}
  if (!fm) {
    try {
      if (typeof _ScriptModule !== "undefined" && _ScriptModule !== null) {
        fm = {
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
    } catch (_smErr) {}
  }
  if (!fm) {
    if (typeof dprint === "function") dprint("[KERNEL-IIFE] WARNING: fm not available — file ops disabled");
  }

  function safeFM() {
    try {
      if (typeof fm !== "undefined" && fm !== null) {
        return { available: true, fm: fm };
      }
      if (typeof ipc !== "undefined" && ipc !== null && typeof ipc.systemFileManager === "function") {
        var _fm2 = ipc.systemFileManager();
        if (_fm2) {
          _g.fm = _fm2;
          return { available: true, fm: _fm2 };
        }
      }
      if (typeof _ScriptModule !== "undefined" && _ScriptModule !== null) {
        var shim = {
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
        return { available: true, fm: shim };
      }
    } catch (_safeFmErr) {}
    return { available: false, fm: null };
  }

  // Publish bootstrap globals so modules loaded later can use them
  if (!_g.dprint)  _g.dprint  = dprint;
  if (!_g.DEV_DIR) _g.DEV_DIR = DEV_DIR;
  if (!_g.fm) _g.fm = fm;
  if (!_g.safeFM) _g.safeFM = safeFM;

  // SANITY CHECK: if this doesn't print, the IIFE itself is crashing
  if (typeof dprint === "function") dprint("[KERNEL-IIFE] running, ipc=" + (ipc ? "OK" : "NULL"));
  if (typeof dprint === "function") dprint("[KERNEL-IIFE] typeof createKernel=" + typeof createKernel);

${tslibHelpers}
${code}

  // Publish kernel factory on global scope
  if (typeof createKernel === "function") {
      _g.createKernel = createKernel;
    _g.createKernel = function(cfg) {
      return createKernel(cfg);
    };
    if (typeof dprint === "function") dprint("[KERNEL-IIFE] createKernel published OK");
  } else {
    if (typeof dprint === "function") dprint("[KERNEL-IIFE] ERROR: createKernel NOT found");
  }

  _g.shutdownKernel = function() {
    var k = _g._kernelInstance;
    if (k && typeof k.shutdown === "function") k.shutdown();
  };

})();
`;

  // =========================================================================
  // File loader helper — always file-based
  // main.js ONLY loads catalog.js (static constants) up-front.
  // runtime.js is loaded and hot-reloaded by the kernel's runtime-loader.
  // =========================================================================
  const fileLoader = `
function _ptLoadModule(modulePath, label) {
  try {
    // Resolve file manager: prefer fm global, fall back to _ScriptModule shim.
    var _g = (typeof self !== "undefined") ? self : Function("return this")();
    var _fm = (typeof fm !== "undefined") ? fm : (_g.fm || null);
    if (!_fm && typeof _ScriptModule !== "undefined" && _ScriptModule) {
      // _ScriptModule is always available in PT Script Module context.
      _fm = {
        fileExists: function(p) {
          try { var sz = _ScriptModule.getFileSize(p); return sz >= 0; } catch(e) { return false; }
        },
        getFileContents: function(p) { return _ScriptModule.getFileContents(p); },
      };
    }
    if (!_fm) {
      if (typeof dprint === "function") dprint("[main] fm not available — cannot load " + label);
      return false;
    }
    var exists = _fm.fileExists(modulePath);
    if (!exists || exists === "" || exists === "0" || exists === "false") {
      if (typeof dprint === "function") dprint("[main] Not found: " + modulePath);
      return false;
    }
    var code = _fm.getFileContents(modulePath);
    if (!code || code.length < 10) {
      if (typeof dprint === "function") dprint("[main] Empty: " + label);
      return false;
    }
    // Pass globals explicitly so catalog.js can use them (Fase 7 fix)
    new Function("ipc", "fm", "dprint", "DEV_DIR", "_ScriptModule", code)(
      (typeof ipc !== "undefined") ? ipc : null,
      (typeof fm !== "undefined") ? fm : null,
      (typeof dprint !== "undefined") ? dprint : function() {},
      (typeof DEV_DIR !== "undefined") ? DEV_DIR : devDir,
      (typeof _ScriptModule !== "undefined") ? _ScriptModule : null
    );
    if (typeof dprint === "function") dprint("[main] Loaded: " + label);
    return true;
  } catch (e) {
    if (typeof dprint === "function") dprint("[main] Error loading " + label + ": " + String(e));
    return false;
  }
}
`;

  // =========================================================================
  // PT Script Module lifecycle entry points
  // =========================================================================
  const entryPoints = `
// PT Script Module entry points — called by Packet Tracer lifecycle

function main() {
  var _g    = (typeof self !== "undefined") ? self : this;
  var devDir = (typeof DEV_DIR !== "undefined") ? DEV_DIR : (_g.DEV_DIR || ${devDirLiteral});

  if (typeof dprint === "function") dprint("[main] PT-SCRIPT v2 active (build: " + "${buildTimestamp}" + ")");

  // Initialize fm from ipc BEFORE any module loads.
  // In PT, 'fm' is NOT a direct global — it must be obtained from ipc.systemFileManager().
  // The kernel also does this in boot(), but _ptLoadModule runs before kernel.boot().
  if (!_g.fm) {
    var _ipc = (typeof ipc !== "undefined") ? ipc : null;
    if (_ipc && typeof _ipc.systemFileManager === "function") {
      var _fm = _ipc.systemFileManager();
      if (_fm) _g.fm = _fm;
    }
  }

  // Step 1: load static catalog (device/cable type constants)
  _ptLoadModule(devDir + "/catalog.js", "catalog");

  // Step 2: boot the kernel.
  // The kernel's internal runtime-loader handles:
  //   - loading runtime.js from devDir/runtime.js on first boot
  //   - hot-reloading whenever runtime.js file changes on disk
  try {
    if (typeof createKernel === "function") {
      _g.createKernel = createKernel;
      var kernel = createKernel({
        devDir:                 devDir,
        commandsDir:            devDir + "/commands",
        inFlightDir:            devDir + "/in-flight",
        resultsDir:             devDir + "/results",
        deadLetterDir:          devDir + "/dead-letter",
        logsDir:                devDir + "/logs",
        commandsTraceDir:       devDir + "/logs/commands",
        pollIntervalMs:         1000,
        deferredPollIntervalMs: 500,
        heartbeatIntervalMs:    5000,
        demoRuntime:            false,
      });
      _g._kernelInstance = kernel;
      try {
        kernel.boot();
      } catch(e) {
        if (typeof dprint === "function") dprint("[main] FATAL: " + String(e));
      }
      if (typeof dprint === "function") {
        dprint(
          "[main] kernel-flags boot=" + String(!!_g.__ptKernelBootEntered) +
          " leaseBypass=" + String(!!_g.__ptKernelLeaseBypass) +
          " activate=" + String(!!_g.__ptKernelActivateEntered) +
          " runtimeAttempt=" + String(!!_g.__ptRuntimeLoadAttempted) +
          " runtimeOK=" + String(!!_g.__ptRuntimeLoadSucceeded)
        );
      }
      if (_g.__ptRuntimeLoadError && typeof dprint === "function") {
        dprint("[main] runtime-error=" + String(_g.__ptRuntimeLoadError));
      }
      if (_g.__ptRuntimeLoaded === true && typeof dprint === "function") {
        dprint("[main] runtime-loaded flag = true");
      }
      if (typeof dprint === "function") dprint("[main] kernel booted — runtime hot-reload active");
    } else {
      if (typeof dprint === "function") dprint("[main] ERROR: createKernel not found");
    }
  } catch(e) {
    if (typeof dprint === "function") dprint("[main] FATAL kernel bootstrap: " + String(e));
  }
}

function cleanUp() {
  if (typeof shutdownKernel === "function") {
    shutdownKernel();
  }
}
`;

  const header = `// PT Main — Generated by cisco-auto AST pipeline V2
// Do not edit directly — regenerate with: bun run pt:build
// Generated at: ${buildTimestamp}
// Build ID: ${buildTimestamp.replace(/[:.]/g, "-")}
//
// Architecture:
//   main.js    = kernel IIFE + file loader (this file)
//   catalog.js = static PT constants (loaded once at boot)
//   runtime.js = all handlers + dispatcher (hot-reloaded by kernel)
//
// NOTE: globalThis is NOT available in PT QTScript — uses self/this instead.
`;

  const output = header + kernelIife + fileLoader + entryPoints;

  if (options.outputPath) {
    fs.mkdirSync(path.dirname(options.outputPath), { recursive: true });
    fs.writeFileSync(options.outputPath, output, "utf-8");
  }

  return output;
}
