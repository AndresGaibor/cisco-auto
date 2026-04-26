// packages/pt-runtime/src/build/templates/file-loader.ts
// File loader template — _ptLoadModule function
// main.js ONLY loads catalog.js (static constants) up-front.
// runtime.js is loaded and hot-reloaded by the kernel's runtime-loader.

/**
 * Returns the file loader template string.
 * Always file-based — loads module code from disk using PT's file system APIs.
 */
export function fileLoaderTemplate(): string {
  return `
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
    if (typeof dprint === "function") dprint("[main] loading " + label + " from " + modulePath);
    // Pass globals explicitly so catalog.js can use them (Fase 7 fix)
    try {
        var loader = new Function("ipc", "fm", "dprint", "DEV_DIR", "_ScriptModule", "_g", code);
        if (typeof dprint === "function") dprint("[main] executing loader for " + label);
        loader(
          (typeof ipc !== "undefined") ? ipc : null,
          (typeof fm !== "undefined") ? fm : null,
          (typeof dprint !== "undefined") ? dprint : function() {},
          (typeof DEV_DIR !== "undefined") ? DEV_DIR : devDir,
          (typeof _ScriptModule !== "undefined") ? _ScriptModule : null,
          _g
        );
    } catch(syntaxErr) {
        if (typeof dprint === "function") dprint("[main] FATAL SYNTAX ERROR in " + label + ": " + String(syntaxErr));
        if (_fm.writePlainTextToFile) {
            _fm.writePlainTextToFile(modulePath + ".error.txt", String(syntaxErr) + "\\n\\n" + code.substring(0, 1000));
        }
        return false;
    }
    if (typeof dprint === "function") dprint("[main] Loaded: " + label);
    return true;
  } catch (e) {
    if (typeof dprint === "function") dprint("[main] Error loading " + label + ": " + String(e));
    return false;
  }
}
`;
}
