// packages/pt-runtime/src/build/templates/runtime-loader.ts
// Runtime loader template — inline JS string for hot-reload engine

/**
 * Returns the runtime loader template string.
 * Handles hot reloading of runtime modules when files change on disk.
 */
export function runtimeLoaderTemplate(params: {
  devDir: string;
  modules: string[];
}): string {
  const { devDir, modules } = params;

  return `
// ============================================================
// Runtime Loader - Hot Reload Engine
// Auto-generated - DO NOT EDIT
// ============================================================

(function() {
  var ipc = (typeof ipc !== "undefined") ? ipc : null;
  var DEV_DIR = (typeof DEV_DIR !== "undefined") ? DEV_DIR : "${devDir}";
  var fm = ipc ? ipc.systemFileManager() : null;

  var _g = (typeof self !== "undefined") ? self : this;

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
    __writeDebugLog("loader", msg, "debug");
  };

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
