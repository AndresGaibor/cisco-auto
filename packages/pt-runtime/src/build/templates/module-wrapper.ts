// packages/pt-runtime/src/build/templates/module-wrapper.ts
// Module wrapper template — wraps module code in IIFE with namespace registration

/**
 * Wraps module code in an IIFE with proper PT Script Module context.
 * Registers the module in _RUNTIME_MODULES for hot reload support.
 */
export function moduleWrapperTemplate(params: {
  moduleName: string;
  devDir: string;
  code: string;
}): string {
  const { moduleName, devDir, code } = params;

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
