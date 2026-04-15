// packages/pt-runtime/src/build/render-main-v2.ts
// Genera main.js — el bootloader de PT Script Module.
//
// Responsabilidades de main.js (SOLO estas):
//   1. Declarar DEV_DIR (inyectado en tiempo de build)
//   2. Contener el kernel compilado en un IIFE
//   3. Exponer main() y cleanUp() para el ciclo de vida de PT Script Module
//
// Para PT 9.0+ (sin fm/filesystem): embebe catalog y runtime inline.
// Para versiones con fm: carga desde archivos externos via _ptLoadModule.

import * as fs from "fs";
import * as path from "path";
import { transformToPtSafeAst } from "./ast-transform.js";
import { formatValidationResult } from "./validate-pt-safe.js";
import { getAllMainFiles } from "./main-manifest.js";

export interface RenderMainV2Options {
  srcDir: string;
  outputPath: string;
  injectDevDir?: string;
  /** Embedded catalog code string. If set, catalog is embedded inline (PT 9.0 no fm). */
  embeddedCatalog?: string;
  /** Embedded runtime code string. If set, runtime is embedded inline (PT 9.0 no fm). */
  embeddedRuntime?: string;
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
    treeShake: false,
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

  const useEmbedded = !!(options.embeddedCatalog || options.embeddedRuntime);

  // Kernel IIFE: Contains all kernel source code, exposes createKernel/shutdownKernel
  const kernelIife = `
(function() {
  var ipc = (typeof ipc !== "undefined") ? ipc : null;
  var dprint = (typeof dprint !== "undefined") ? dprint : function(msg) { if (typeof print === "function") print(msg); };
  var DEV_DIR = (typeof DEV_DIR !== "undefined") ? DEV_DIR : ${devDirLiteral};

  var _global = (typeof self !== "undefined") ? self : this;
  if (!_global.dprint) _global.dprint = dprint;
  if (!_global.DEV_DIR) _global.DEV_DIR = DEV_DIR;

${code}

  var _kernelInstance = null;

  if (typeof createKernel === "function") {
    _global.createKernel = function(cfg) {
      _kernelInstance = createKernel(cfg);
      return _kernelInstance;
    };
  }

  _global.shutdownKernel = function() {
    if (_kernelInstance && typeof _kernelInstance.shutdown === "function") {
      _kernelInstance.shutdown();
    }
  };

})();
`;

  // Embedded loader (PT 9.0, no fm)
  // Evaluates inline catalog/runtime code instead of reading from disk
  const embeddedLoader = useEmbedded ? `
function _ptEmbedModule(code, label) {
  if (!code || code.length < 10) {
    if (typeof dprint === "function") dprint("[main] Embedded module empty: " + label);
    return false;
  }
  try {
    new Function(code)();
    if (typeof dprint === "function") dprint("[main] Embedded OK: " + label);
    return true;
  } catch (e) {
    if (typeof dprint === "function") dprint("[main] Embedded error " + label + ": " + String(e));
    return false;
  }
}
` : "";

  // File-based loader (PT versions with fm)
  const fileLoader = !useEmbedded ? `
function _ptLoadModule(modulePath, label) {
  try {
    var _fm = (typeof fm !== "undefined") ? fm : null;
    if (!_fm) {
      if (typeof dprint === "function") dprint("[main] fm not available — cannot load " + label);
      return false;
    }
    if (!_fm.fileExists(modulePath)) {
      if (typeof dprint === "function") dprint("[main] Module not found: " + modulePath + " (" + label + ")");
      return false;
    }
    var code = _fm.getFileContents(modulePath);
    if (!code || code.length < 10) {
      if (typeof dprint === "function") dprint("[main] Module empty: " + label);
      return false;
    }
    new Function(code)();
    if (typeof dprint === "function") dprint("[main] Loaded: " + label);
    return true;
  } catch (e) {
    if (typeof dprint === "function") dprint("[main] Error loading " + label + ": " + String(e));
    return false;
  }
}
` : "";

  // main() — boots kernel, loads modules, starts polling
  const catalogArg = options.embeddedCatalog
    ? JSON.stringify(options.embeddedCatalog)
    : "null";
  const runtimeArg = options.embeddedRuntime
    ? JSON.stringify(options.embeddedRuntime)
    : "null";

  // Hot reload configuration
  const hotReloadEnabled = true;
  const hotReloadInterval = 5000; // Check every 5 seconds

  const entryPoints = `
// PT Script Module entry points — called by Packet Tracer lifecycle

// Hot reload state
var _hotReloadTimer = null;

function _startHotReload() {
  if (!${hotReloadEnabled}) return;
  if (typeof _runtimeLoader === "undefined") return;
  
  if (typeof dprint === "function") dprint("[main] Hot reload enabled — checking every ${hotReloadInterval}ms");
  
  _hotReloadTimer = setInterval(function() {
    if (typeof _runtimeLoader !== "undefined" && typeof _runtimeLoader.reloadChanged === "function") {
      var reloaded = _runtimeLoader.reloadChanged();
      if (reloaded) {
        if (typeof dprint === "function") dprint("[main] Modules reloaded — refreshing dispatcher");
      }
    }
  }, ${hotReloadInterval});
}

function _stopHotReload() {
  if (_hotReloadTimer) {
    clearInterval(_hotReloadTimer);
    _hotReloadTimer = null;
    if (typeof dprint === "function") dprint("[main] Hot reload stopped");
  }
}

function main() {
  var _g = (typeof self !== "undefined") ? self : this;
  var devDir = (typeof DEV_DIR !== "undefined") ? DEV_DIR : _g.DEV_DIR || ${devDirLiteral};

  ${useEmbedded ? `
  // Embedded mode (PT 9.0 no fm) — evaluate modules inline
  if (typeof _ptEmbedModule === "function") {
    _ptEmbedModule(${catalogArg}, "catalog");
    _ptEmbedModule(${runtimeArg}, "runtime");
  }
  ` : `
  // File mode (PT with fm) — load modules from disk
  _ptLoadModule(devDir + "/catalog.js", "catalog");
  
  // Try modular loader first (hot reload capable)
  var modularLoaded = _ptLoadModule(devDir + "/runtime-loader.js", "runtime-loader");
  
  // Fallback to monolithic runtime.js if modular not available
  if (!modularLoaded) {
    _ptLoadModule(devDir + "/runtime.js", "runtime (monolithic fallback)");
  }
  `}

  if (typeof createKernel === "function") {
    var kernel = createKernel({
      devDir: devDir,
      commandsDir: devDir + "/commands",
      inFlightDir: devDir + "/in-flight",
      resultsDir: devDir + "/results",
      deadLetterDir: devDir + "/dead-letter",
      logsDir: devDir + "/logs",
      commandsTraceDir: devDir + "/logs/commands",
      pollIntervalMs: 1000,
      deferredPollIntervalMs: 500,
      heartbeatIntervalMs: 5000,
    });
    kernel.boot();
  } else {
    if (typeof dprint === "function") dprint("[main] ERROR: createKernel not defined — kernel not loaded");
  }
  
  // Start hot reload after kernel boots
  _startHotReload();
}

function cleanUp() {
  _stopHotReload();
  if (typeof shutdownKernel === "function") {
    shutdownKernel();
  }
}
`;

  const header = `// PT Main Kernel - Generated from TypeScript via AST pipeline V2
// Do not edit directly - regenerate with: bun run build:main-v2
// Generated at: ${new Date().toISOString()}
//
// Responsibilities: Boot kernel, expose main()/cleanUp()
// Mode: ${useEmbedded ? "EMBEDDED (PT 9.0 no fm — catalog + runtime inline)" : "FILE-BASED (fm available — loads from disk)"}
// NOTE: globalThis is NOT available in PT QTScript — uses self/this instead.
`;

  const output = header + kernelIife + embeddedLoader + fileLoader + entryPoints;

  if (options.outputPath) {
    fs.mkdirSync(path.dirname(options.outputPath), { recursive: true });
    fs.writeFileSync(options.outputPath, output, "utf-8");
  }

  return output;
}
