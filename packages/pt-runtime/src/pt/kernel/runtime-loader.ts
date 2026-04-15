// packages/pt-runtime/src/pt/kernel/runtime-loader.ts
// Hot reload for runtime.js with safe reload
//
// Reload is blocked when:
// - There's an active command being executed
// - There are active deferred jobs
// - A terminal session is busy
// If runtime.js changes while work is in progress, reload is deferred
// until the system becomes idle. If load() fails, the last good runtimeFn
// is preserved.

import type { RuntimeApi } from "../../runtime/contracts";

export interface RuntimeLoader {
  load(): void;
  loadDemo(): void;
  reloadIfNeeded(isBusyCheck: () => boolean): void;
  getLastMtime(): number;
  getRuntimeFn(): ((payload: Record<string, unknown>, api: RuntimeApi) => unknown) | null;
  hasPendingReload(): boolean;
}

export function createRuntimeLoader(config: { runtimeFile: string }) {
  let lastMtime = 0;
  let runtimeFn: ((payload: Record<string, unknown>, api: RuntimeApi) => unknown) | null = null;
  let lastGoodRuntimeFn: ((payload: Record<string, unknown>, api: RuntimeApi) => unknown) | null =
    null;
  let pendingReload = false;

  // File access checked at call time (not at init) because fm is set on the global
  // AFTER createRuntimeLoader() is called (kernel.boot() sets it later).
  function getFM(): typeof fm | null {
    try {
      if (typeof fm !== "undefined" && fm !== null) return fm;
    } catch (e) {
      /* fm not declared */
    }
    return null;
  }

  function getSM(): typeof _ScriptModule | null {
    try {
      if (typeof _ScriptModule !== "undefined" && _ScriptModule !== null) return _ScriptModule;
    } catch (e) {
      /* _ScriptModule not declared */
    }
    return null;
  }

  function getFileMtime(path: string): number {
    try {
      const _fm = getFM();
      if (_fm && _fm.getFileModificationTime) {
        return _fm.getFileModificationTime(path);
      }
      const _sm = getSM();
      if (_sm) {
        return _sm.getFileModificationTime(path);
      }
      return 0;
    } catch (e) {
      return 0;
    }
  }

  function fileExists(path: string): boolean {
    try {
      const _fm = getFM();
      if (_fm) {
        return !!_fm.fileExists(path);
      }
      const _sm = getSM();
      if (_sm) {
        const sz = _sm.getFileSize(path);
        return sz >= 0;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  function getFileContents(path: string): string {
    const _fm = getFM();
    if (_fm) {
      return _fm.getFileContents(path);
    }
    const _sm = getSM();
    if (_sm) {
      return _sm.getFileContents(path);
    }
    throw new Error("No file access method available");
  }

  function load(force = false): void {
    if (!fileExists(config.runtimeFile)) {
      dprint("[runtime] No runtime.js at " + config.runtimeFile);
      return;
    }

    try {
      dprint("[runtime-loader] Loading runtime.js...");
      const mtime = getFileMtime(config.runtimeFile);
      if (!force && mtime === lastMtime && runtimeFn) {
        return; // No change, already loaded
      }

      let code = getFileContents(config.runtimeFile);
      if (!code || code.length < 50) {
        dprint("[runtime] Runtime file too small, keeping previous version");
        return;
      }

      // Strip "use strict" and top-level `var ipc/dprint/fm/DEV_DIR` declarations
      // from the compiled code — the kernel IIFE already provides these as `var`
      // in the enclosing scope, and passing them as `new Function(arguments[0])`
      // causes duplicate `var` declarations or undefined references.
      // We inject the actual values as `var` declarations inside the code.
      code = code
        .replace(/^\s*"use strict";\s*/gm, "")
        .replace(/^\s*var\s+(ipc|dprint|fm|DEV_DIR)\s*=\s*[^;]+;\s*/gm, "")
        .replace(/^\s*Object\.defineProperty\s*\(\s*exports\s*,\s*"__esModule"\s*,.*$/gm, "")
        .replace(/^exports\.\w+\s*=/gm, "// exports.");

      // Inject kernel globals as var declarations so the compiled code
      // can reference ipc/fm/dprint without getting undefined.
      const _fm = getFM();
      const _ipc = typeof ipc !== "undefined" ? ipc : null;
      const _dprint = typeof dprint !== "undefined" ? dprint : function (msg: string) {};
      const _DEV_DIR = typeof DEV_DIR !== "undefined" ? DEV_DIR : "/pt-dev";
      const _g: any = typeof self !== "undefined" ? self : Function("return this")();

      const fn = new Function("ipc", "fm", "dprint", "DEV_DIR", code);
      fn(_ipc, _fm, _dprint, _DEV_DIR);

      const dispatch = _g._ptDispatch;
      if (typeof dispatch !== "function") {
        throw new Error("runtime.js did not register _ptDispatch — check for init errors");
      }

      runtimeFn = dispatch;
      lastGoodRuntimeFn = dispatch;
      lastMtime = mtime;
      pendingReload = false;
      dprint("[runtime] Loaded OK (mtime=" + mtime + ")");
      dprint("[runtime-loader] runtime.js ready for dispatch");
    } catch (e) {
      dprint("[runtime] Load error (keeping previous): " + String(e));
      if (!runtimeFn && lastGoodRuntimeFn) {
        runtimeFn = lastGoodRuntimeFn;
      }
    }
  }

  function loadDemo(): void {
    try {
      const _g: any = typeof self !== "undefined" ? self : Function("return this")();
      dprint("[runtime-demo] Loading lightweight demo runtime...");

      runtimeFn = function(payload: Record<string, unknown>, api: RuntimeApi) {
        const type = String((payload as { type?: unknown })?.type ?? "unknown");
        api.dprint("[runtime-demo] Dispatching: " + type);
        return {
          ok: true,
          demo: true,
          value: {
            type,
            received: payload,
          },
        };
      };

      lastGoodRuntimeFn = runtimeFn;
      lastMtime = Date.now();
      pendingReload = false;
      _g.__ptRuntimeDemoLoaded = true;
      dprint("[runtime-demo] Demo runtime loaded");
    } catch (e) {
      dprint("[runtime-demo] Demo load error: " + String(e));
    }
  }

  function reloadIfNeeded(isBusyCheck: () => boolean): void {
    if (!fileExists(config.runtimeFile)) {
      return;
    }

    if (isBusyCheck()) {
      dprint("[runtime] Reload deferred (system busy)");
      pendingReload = true;
      return;
    }

    if (pendingReload) {
      dprint("[runtime] Applying pending reload (system now idle)");
      pendingReload = false;
    }

    dprint("[runtime-loader] Reloading runtime.js...");
    load(true);
  }

  function getLastMtime(): number {
    return lastMtime;
  }

  function getRuntimeFn() {
    return runtimeFn;
  }

  function hasPendingReload(): boolean {
    return pendingReload;
  }

  return { load, loadDemo, reloadIfNeeded, getLastMtime, getRuntimeFn, hasPendingReload };
}
