// packages/pt-runtime/src/build/render-main-v2.ts
// Genera main.js — el bootloader de PT Script Module.
//
// Responsabilidades de main.js (SOLO estas):
//   1. Declarar DEV_DIR (inyectado en tiempo de build)
//   2. Contener el kernel compilado en un IIFE
//   3. Exponer main() y cleanUp() para el ciclo de vida de PT Script Module
//
// main.js NO contiene lógica de handlers ni catálogos.
// Delega toda la lógica al runtime cargado dinámicamente desde runtime.js.

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

  // El wrapper IIFE del kernel:
  // - ipc y fm se inyectan SOLO desde el scope seguro de PT (sin globalThis)
  // - _global usa self (disponible en QTScript) o this como fallback
  const kernelIife = `
(function() {
  var ipc = (typeof ipc !== "undefined") ? ipc : null;
  var dprint = (typeof dprint !== "undefined") ? dprint : function(msg) { if (typeof print === "function") print(msg); };
  var DEV_DIR = (typeof DEV_DIR !== "undefined") ? DEV_DIR : ${devDirLiteral};
  var fm = (ipc && typeof ipc.systemFileManager === "function") ? ipc.systemFileManager() : null;

  // PT QTScript does NOT have globalThis — use self or this as fallback
  var _global = (typeof self !== "undefined") ? self : this;

  // Expose fm and dprint globally so the runtime and kernel can access them
  if (fm && !_global.fm) _global.fm = fm;
  if (!_global.dprint) _global.dprint = dprint;
  if (!_global.DEV_DIR) _global.DEV_DIR = DEV_DIR;

${code}

  // Hold kernel instance so cleanUp() can reach it
  var _kernelInstance = null;

  // Expose kernel factory to global scope (main() calls createKernel)
  if (typeof createKernel === "function") {
    _global.createKernel = function(cfg) {
      _kernelInstance = createKernel(cfg);
      return _kernelInstance;
    };
  }

  // Expose shutdown function
  _global.shutdownKernel = function() {
    if (_kernelInstance && typeof _kernelInstance.shutdown === "function") {
      _kernelInstance.shutdown();
    }
  };

})();
`;

  // -------------------------------------------------------------------------
  // loadModule: helper inlined into main.js to load catalog.js / runtime.js
  // Packet Tracer Script Module puede cargar solo UN archivo .js.
  // Los módulos adicionales se cargan usando fm.getFileContents + new Function().
  // -------------------------------------------------------------------------
  const loaderHelper = `
function _ptLoadModule(modulePath, label) {
  try {
    var _g = (typeof self !== "undefined") ? self : this;
    var _fm = _g.fm || (typeof fm !== "undefined" ? fm : null);
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
`;

  // -------------------------------------------------------------------------
  // main() y cleanUp() — ciclo de vida de PT Script Module
  // -------------------------------------------------------------------------
  const entryPoints = `
// PT Script Module entry points — called by Packet Tracer lifecycle

function main() {
  var _g = (typeof self !== "undefined") ? self : this;
  var devDir = (typeof DEV_DIR !== "undefined") ? DEV_DIR : _g.DEV_DIR || ${devDirLiteral};

  // Paso 1: Cargar catalog.js (constantes estáticas — rara vez cambia)
  _ptLoadModule(devDir + "/catalog.js", "catalog");

  // Paso 2: Cargar runtime.js (lógica de handlers — cambia con cada deploy)
  // Si runtime.js no existe, el kernel arranca sin runtime (degraded mode)
  _ptLoadModule(devDir + "/runtime.js", "runtime");

  // Paso 3: Boot del kernel
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
}

function cleanUp() {
  if (typeof shutdownKernel === "function") {
    shutdownKernel();
  }
}
`;

  const header = `// PT Main Kernel - Generated from TypeScript via AST pipeline V2
// Do not edit directly - regenerate with: bun run build:main-v2
// Generated at: ${new Date().toISOString()}
//
// Responsibilities: Boot kernel, load catalog.js + runtime.js, expose main()/cleanUp()
// NOTE: globalThis is NOT available in PT QTScript — this file uses self/this instead.
`;

  const output = header + kernelIife + loaderHelper + entryPoints;

  if (options.outputPath) {
    fs.mkdirSync(path.dirname(options.outputPath), { recursive: true });
    fs.writeFileSync(options.outputPath, output, "utf-8");
  }

  return output;
}
