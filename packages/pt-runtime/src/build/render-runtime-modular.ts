/**
 * Runtime Modular Generator
 * 
 * Genera runtime.js como un solo archivo (backwards compatible) PLUS
 * módulos separados opcionales para hot reload selectivo.
 * 
 * Estructura de salida:
 *   dist/
 *   ├── main.js           (kernel + loader)
 *   ├── catalog.js        (constantes estáticas)
 *   ├── runtime.js        (TODO: monolithic, backwards compat - opcional)
 *   └── runtime/
 *       ├── core.js       (helpers, constants base)
 *       ├── device.js     (device handler)
 *       ├── dhcp.js       (dhcp handler)
 *       ├── vlan.js       (vlan handler)
 *       ├── link.js       (link handler)
 *       ├── ios.js        (ios session + commands)
 *       ├── canvas.js     (canvas operations)
 *       ├── inspect.js    (inspection)
 *       ├── registry.js   (handler registry + dispatcher)
 *       └── loader.js     (hot reload engine)
 */

import * as fs from "fs";
import * as path from "path";
import { RUNTIME_MANIFEST, getCatalogFiles, getAllRuntimeFiles, type RuntimeManifestSection } from "./runtime-manifest";
import { transformToPtSafeAst, type AstTransformOptions } from "./ast-transform";
import { validatePtSafe, formatValidationResult, type ValidationResult } from "./validate-pt-safe";

// ============================================================================
// Config
// ============================================================================

export interface ModularGeneratorConfig {
  outputDir: string;
  devDir: string;
  /** Si true, genera módulos separados en runtime/ subdirectorio */
  splitModules?: boolean;
  /** Si true, genera runtime.js monolítico (backwards compat) */
  generateMonolithic?: boolean;
}

// ============================================================================
// Module grouping
// ============================================================================

const MODULE_GROUPS = {
  core: {
    files: [
      ...RUNTIME_MANIFEST.utils,
      ...RUNTIME_MANIFEST.runtime,
    ],
    description: "Core utilities and runtime helpers",
  },
  device: {
    files: ["handlers/device.ts"],
    description: "Device add/remove/move operations",
  },
  dhcp: {
    files: ["handlers/dhcp.ts"],
    description: "DHCP server configuration",
  },
  vlan: {
    files: ["handlers/vlan.ts"],
    description: "VLAN management",
  },
  link: {
    files: ["handlers/link.ts"],
    description: "Network link operations",
  },
  host: {
    files: ["handlers/host.ts"],
    description: "Host/endpoints operations",
  },
  ios: {
    files: [
      "handlers/ios-output-classifier.ts",
      "handlers/parsers/ios-parsers.ts",
    ],
    description: "IOS CLI execution and terminal",
  },
  canvas: {
    files: ["handlers/canvas.ts"],
    description: "Canvas and UI operations",
  },
  inspect: {
    files: ["handlers/inspect.ts"],
    description: "Topology inspection",
  },
  module: {
    files: ["handlers/module.ts"],
    description: "Module management",
  },
  // NOTE: kernel is NOT a runtime module — it lives exclusively in main.js (MAIN_MANIFEST).
} as const;

type ModuleGroup = keyof typeof MODULE_GROUPS;

// ============================================================================
// Single file compilation
// ============================================================================

function compileFilesToModule(
  srcDir: string,
  files: string[],
  moduleName: string,
  options?: { minify?: boolean }
): { code: string; validation: ValidationResult } {
  const sourceFiles = new Map<string, string>();

  for (const relPath of files) {
    const filePath = path.join(srcDir, relPath);
    if (fs.existsSync(filePath)) {
      sourceFiles.set(relPath, fs.readFileSync(filePath, "utf-8"));
    } else {
      console.warn(`[modular-gen] Warning: File not found: ${filePath}`);
    }
  }

  const { code, validation } = transformToPtSafeAst(sourceFiles, {
    target: undefined,
    replaceConsoleWithDprint: true,
    wrapIIFE: false,
    minify: options?.minify ?? false,
  });

  return { code, validation };
}

// ============================================================================
// Module generators
// ============================================================================

function wrapModuleCode(code: string, moduleName: string, devDir: string): string {
  return `
// ============================================================
// Module: ${moduleName}
// Auto-generated - DO NOT EDIT
// ============================================================

(function() {
  var ipc = (typeof ipc !== "undefined") ? ipc : null;
  var dprint = (typeof dprint !== "undefined") ? dprint : function() {};
  var DEV_DIR = (typeof DEV_DIR !== "undefined") ? DEV_DIR : ${JSON.stringify(devDir)};
  var fm = ipc ? ipc.systemFileManager() : null;

  // Module namespace
  var MODULE_NS = {};
  
  ${code}

  // Register module globally for hot reload
  var _g = (typeof self !== "undefined") ? self : this;
  if (!_g._RUNTIME_MODULES) _g._RUNTIME_MODULES = {};
  _g._RUNTIME_MODULES["${moduleName}"] = MODULE_NS;

  if (typeof dprint === "function") dprint("[runtime] Loaded module: ${moduleName}");

})();
`;
}

// ============================================================================
// Main Generator Class
// ============================================================================

export class ModularRuntimeGenerator {
  config: ModularGeneratorConfig;

  constructor(config: ModularGeneratorConfig) {
    this.config = {
      splitModules: true,
      generateMonolithic: false,
      ...config,
    };
  }

  async generate(): Promise<{
    catalog: string;
    runtimeLoader: string;
    modules: Map<ModuleGroup, string>;
    manifest: ModularManifest;
  }> {
    const { outputDir, devDir, splitModules } = this.config;

    // Ensure directories
    await fs.promises.mkdir(outputDir, { recursive: true });

    // 1. Generate catalog.js
    console.log("[modular-gen] Generating catalog.js...");
    const catalogCode = await this.generateCatalog();
    await fs.promises.writeFile(
      path.join(outputDir, "catalog.js"),
      catalogCode,
      "utf-8"
    );

    const modules = new Map<ModuleGroup, string>();
    const modulePaths: string[] = [];

    // 2. Generate split modules
    if (splitModules) {
      console.log("[modular-gen] Generating split modules...");
      
      const modulesDir = path.join(outputDir, "runtime");
      await fs.promises.mkdir(modulesDir, { recursive: true });

      for (const [moduleName, group] of Object.entries(MODULE_GROUPS) as [ModuleGroup, typeof MODULE_GROUPS[ModuleGroup]][]) {
        console.log(`  [modular-gen] Compiling ${moduleName}...`);
        
        const { code, validation } = compileFilesToModule(
          path.resolve(__dirname, ".."),
          [...group.files],
          moduleName
        );

        if (!validation.valid) {
          console.error(`[modular-gen] Validation FAILED for ${moduleName}:`);
          for (const issue of validation.errors) {
            console.error(`  ${issue.line}:${issue.column}: ${issue.message}`);
          }
          throw new Error(`Module ${moduleName} failed PT-safe validation`);
        }

        const wrappedCode = wrapModuleCode(code, moduleName, devDir);
        const moduleFileName = `${moduleName}.js`;
        const modulePath = path.join(modulesDir, moduleFileName);
        
        await fs.promises.writeFile(modulePath, wrappedCode, "utf-8");
        modules.set(moduleName, wrappedCode);
        modulePaths.push(`runtime/${moduleFileName}`);
        
        console.log(`  [modular-gen] ✓ ${moduleFileName}`);
      }
    }

    // 3. Generate runtime-loader.js (hot reload engine)
    console.log("[modular-gen] Generating runtime-loader.js...");
    const loaderCode = this.generateRuntimeLoader(modulePaths);
    await fs.promises.writeFile(
      path.join(outputDir, "runtime-loader.js"),
      loaderCode,
      "utf-8"
    );

    // 4. Generate manifest
    const manifest = this.generateManifest(catalogCode, loaderCode, modules);

    return {
      catalog: catalogCode,
      runtimeLoader: loaderCode,
      modules,
      manifest,
    };
  }

  private async generateCatalog(): Promise<string> {
    const catalogFiles = getCatalogFiles();
    const srcDir = path.resolve(__dirname, "..");

    const sourceFiles = new Map<string, string>();
    for (const relPath of catalogFiles) {
      const filePath = path.join(srcDir, relPath);
      if (fs.existsSync(filePath)) {
        sourceFiles.set(relPath, fs.readFileSync(filePath, "utf-8"));
      }
    }

    const { code, validation } = transformToPtSafeAst(sourceFiles, {
      target: undefined,
      replaceConsoleWithDprint: true,
      wrapIIFE: false,
    });

    if (!validation.valid) {
      console.error("[modular-gen] Catalog validation FAILED:");
      for (const issue of validation.errors) {
        console.error(`  ${issue.line}:${issue.column}: ${issue.message}`);
      }
      throw new Error("catalog.js failed PT-safe validation");
    }

    return `
// ============================================================
// PT Catalog - Constants and Static Data
// Auto-generated - DO NOT EDIT
// ============================================================

(function() {
  var ipc = (typeof ipc !== "undefined") ? ipc : null;
  var dprint = (typeof dprint !== "undefined") ? dprint : function() {};
  var DEV_DIR = (typeof DEV_DIR !== "undefined") ? DEV_DIR : "${this.config.devDir}";
  var fm = ipc ? ipc.systemFileManager() : null;

  // Catalog namespace
  var CATALOG = {};

  ${code}

  // Expose catalog globally
  var _g = (typeof self !== "undefined") ? self : this;
  _g.CATALOG = CATALOG;

  if (typeof dprint === "function") dprint("[catalog] Loaded - " + Object.keys(CATALOG).length + " entries");

})();
`;
  }

  private generateRuntimeLoader(modules: string[]): string {
    return `
// ============================================================
// Runtime Loader - Hot Reload Engine
// Auto-generated - DO NOT EDIT
// ============================================================

(function() {
  var ipc = (typeof ipc !== "undefined") ? ipc : null;
  var dprint = (typeof dprint !== "undefined") ? dprint : function() {};
  var DEV_DIR = (typeof DEV_DIR !== "undefined") ? DEV_DIR : "${this.config.devDir}";
  var fm = ipc ? ipc.systemFileManager() : null;

  var _g = (typeof self !== "undefined") ? self : this;

  // Module registry
  if (!_g._RUNTIME_MODULES) _g._RUNTIME_MODULES = {};
  var modules = _g._RUNTIME_MODULES;

  // Last modification times for hot reload
  var _modTimes = {};

  // ============================================================
  // Module Loading
  // ============================================================

  function loadModule(modulePath, moduleName) {
    try {
      var fullPath = DEV_DIR + "/runtime/" + modulePath;
      if (!fm.fileExists(fullPath)) {
        dprint("[loader] Module not found: " + modulePath);
        return false;
      }
      
      var code = fm.getFileContents(fullPath);
      if (!code || code.length < 10) {
        dprint("[loader] Module empty: " + modulePath);
        return false;
      }

      new Function(code)();
      dprint("[loader] Loaded: " + moduleName);
      return true;
    } catch (e) {
      dprint("[loader] Error loading " + moduleName + ": " + String(e));
      return false;
    }
  }

  function loadAllModules() {
    var moduleList = ${JSON.stringify(modules)};
    for (var i = 0; i < moduleList.length; i++) {
      var modulePath = moduleList[i];
      var moduleName = modulePath.replace(/^runtime\\//, "").replace(/\\.js$/, "");
      loadModule(modulePath, moduleName);
    }
  }

  // ============================================================
  // Hot Reload
  // ============================================================

  function checkModuleChanged(modulePath) {
    if (!fm) return false;
    
    var fullPath = DEV_DIR + "/runtime/" + modulePath;
    if (!fm.fileExists(fullPath)) return false;

    try {
      var mtime = fm.getFileModificationTime(fullPath);
      if (_modTimes[modulePath] === undefined) {
        _modTimes[modulePath] = mtime;
        return false;
      }
      if (mtime !== _modTimes[modulePath]) {
        _modTimes[modulePath] = mtime;
        return true;
      }
    } catch (e) {
      // Ignore
    }
    return false;
  }

  function reloadChangedModules() {
    var moduleList = ${JSON.stringify(modules)};
    var changed = [];
    
    for (var i = 0; i < moduleList.length; i++) {
      if (checkModuleChanged(moduleList[i])) {
        changed.push(moduleList[i]);
      }
    }

    if (changed.length > 0) {
      dprint("[loader] Hot reload: " + changed.join(", "));
      for (var i = 0; i < changed.length; i++) {
        var modulePath = changed[i];
        var moduleName = modulePath.replace(/^runtime\\//, "").replace(/\\.js$/, "");
        loadModule(modulePath, moduleName);
      }
      return true;
    }
    return false;
  }

  // ============================================================
  // Expose API
  // ============================================================

  _g._runtimeLoader = {
    loadAll: loadAllModules,
    reloadChanged: reloadChangedModules,
    modules: modules,
    DEV_DIR: DEV_DIR,
  };

  // Auto-load all modules on startup
  loadAllModules();

  if (typeof dprint === "function") {
    dprint("[runtime-loader] Ready - " + moduleList.length + " modules loaded");
  }

})();
`;
  }

  private generateManifest(
    catalog: string,
    loader: string,
    modules: Map<ModuleGroup, string>
  ): ModularManifest {
    function computeChecksum(content: string): string {
      let hash = 0;
      for (let i = 0; i < content.length; i++) {
        const char = content.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash;
      }
      return Math.abs(hash).toString(16);
    }

    return {
      version: 1,
      generatedAt: Date.now(),
      catalogChecksum: computeChecksum(catalog),
      loaderChecksum: computeChecksum(loader),
      modules: Object.fromEntries(
        Array.from(modules.entries()).map(([name, code]) => [
          name,
          { checksum: computeChecksum(code), name }
        ])
      ) as Record<ModuleGroup, { checksum: string; name: ModuleGroup }>,
      modulePaths: Array.from(modules.keys()).map(k => `runtime/${k}.js`),
    };
  }
}

// ============================================================================
// Types
// ============================================================================

export interface ModularManifest {
  version: number;
  generatedAt: number;
  catalogChecksum: string;
  loaderChecksum: string;
  modules: Record<ModuleGroup, { checksum: string; name: ModuleGroup }>;
  modulePaths: string[];
}

// ============================================================================
// CLI
// ============================================================================

if (typeof Bun !== "undefined" && Bun.argv.includes("modular-generate")) {
  const generator = new ModularRuntimeGenerator({
    outputDir: path.join(path.resolve(__dirname), "../dist-modular"),
    devDir: process.env.PT_DEV_DIR || "/Users/andresgaibor/pt-dev",
    splitModules: true,
  });

  generator.generate().then(({ modules, manifest }) => {
    console.log("\n✅ Modular generation complete!");
    console.log(`   Modules: ${modules.size}`);
    console.log(`   Manifest:`, JSON.stringify(manifest, null, 2));
  }).catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  });
}
