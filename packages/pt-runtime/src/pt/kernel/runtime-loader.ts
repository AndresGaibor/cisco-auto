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
import { createFileAccess, type FileAccess } from "./file-access";

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

  const fa = createFileAccess();

  function load(force = false): void {
    if (!fa.fileExists(config.runtimeFile)) {
      dprint("[loader] runtime.js not found at " + config.runtimeFile);
      return;
    }

    const visibleLog = (message: string) => {
      try {
        const appWindow = (typeof self !== "undefined" ? self.ipc : null)?.appWindow?.();
        if (appWindow && typeof appWindow.writeToPT === "function") {
          appWindow.writeToPT(String(message) + "\n");
        }
      } catch {}
      try {
        dprint(message);
      } catch {}
      try {
        if (typeof print === "function") print(String(message));
      } catch {}
    };

    try {
      try {
        (typeof self !== "undefined" ? self : Function("return this")()).__ptRuntimeLoadAttempted =
          true;
      } catch {}

      visibleLog("[loader] Loading runtime.js...");
      const mtime = fa.getFileMtime(config.runtimeFile);
      if (!force && mtime === lastMtime && runtimeFn) {
        visibleLog("[loader] No change detected (mtime=" + mtime + "), skipping");
        return;
      }

      let code = fa.getFileContents(config.runtimeFile);
      if (!code || code.length < 50) {
        dprint(
          "[loader] Runtime file too small (" +
            (code?.length || 0) +
            " bytes), keeping previous version",
        );
        return;
      }

      visibleLog("[loader] Evaluating runtime code (" + code.length + " bytes)...");

      // Strip only the strict-mode prelude. Keep CommonJS exports intact and
      // provide `exports/module` explicitly to the function wrapper.
      code = code.replace(/^\s*"use strict";\s*/gm, "");
      // Minimal cleanup — code is pre-processed by render-runtime-v2.ts which already
      // handles imports/exports correctly.

      // Inject kernel globals as var declarations so the compiled code
      // can reference ipc/fm/dprint without getting undefined.
      const _fm = fa.getFM();
      const _ipc = typeof ipc !== "undefined" ? ipc : null;
      const _dprint =
        typeof dprint !== "undefined"
          ? dprint
          : function (msg: string) {
              try {
                if (typeof print === "function") print(String(msg));
              } catch (e) {}
            };
      const _DEV_DIR = typeof DEV_DIR !== "undefined" ? DEV_DIR : "/pt-dev";
      const _g: any = typeof self !== "undefined" ? self : Function("return this")();
      const _exports: Record<string, unknown> = {};
      const _module = { exports: _exports };
      const shim = `
if (typeof Object.fromEntries !== "function") {
  Object.fromEntries = function(entries) {
    var obj = {};
    for (var i = 0; i < entries.length; i++) {
      var entry = entries[i];
      if (entry && entry.length >= 2) {
        obj[entry[0]] = entry[1];
      }
    }
    return obj;
  };
}
`;

      visibleLog("[loader] Creating Function wrapper...");
      const fn = new Function(
        "ipc",
        "fm",
        "dprint",
        "DEV_DIR",
        "exports",
        "module",
        "_global",
        shim + code,
      );
      visibleLog("[loader] Evaluating runtime...");
      fn(_ipc, _fm, _dprint, _DEV_DIR, _exports, _module, _g);

      visibleLog("[loader] Checking _ptDispatch registration...");
      const dispatch = _g._ptDispatch;
      if (typeof dispatch !== "function") {
        visibleLog("[loader] ERROR: _ptDispatch not found on global. Check runtime init errors.");
        throw new Error("runtime.js did not register _ptDispatch — check for init errors");
      }

      runtimeFn = dispatch;
      lastGoodRuntimeFn = dispatch;
      lastMtime = mtime;
      pendingReload = false;
      _g.__ptRuntimeLoaded = true;
      try {
        (typeof self !== "undefined" ? self : Function("return this")()).__ptRuntimeLoadSucceeded =
          true;
      } catch {}
      visibleLog("[loader] SUCCESS: runtime.js loaded (mtime=" + mtime + ")");
      visibleLog("[loader] _ptDispatch registered, ready for dispatch");
    } catch (e) {
      try {
        (typeof self !== "undefined" ? self : Function("return this")()).__ptRuntimeLoaded = false;
      } catch {}
      try {
        (typeof self !== "undefined" ? self : Function("return this")()).__ptRuntimeLoadSucceeded =
          false;
      } catch {}
      try {
        (typeof self !== "undefined" ? self : Function("return this")()).__ptRuntimeLoadError =
          String(e);
      } catch {}
      visibleLog("[loader] LOAD ERROR: " + String(e));
      visibleLog("[loader] Keeping previous runtime if available");
      if (!runtimeFn && lastGoodRuntimeFn) {
        runtimeFn = lastGoodRuntimeFn;
        visibleLog("[loader] Reverted to last good runtime");
      }
    }
  }

  function loadDemo(): void {
    try {
      const _g: any = typeof self !== "undefined" ? self : Function("return this")();
      const visibleLog = (message: string) => {
        try {
          const appWindow = (typeof self !== "undefined" ? self.ipc : null)?.appWindow?.();
          if (appWindow && typeof appWindow.writeToPT === "function") {
            appWindow.writeToPT(String(message) + "\n");
          }
        } catch {}
        try {
          dprint(message);
        } catch {}
        try {
          if (typeof print === "function") print(String(message));
        } catch {}
      };

      visibleLog("[runtime-demo] Loading lightweight demo runtime...");

      runtimeFn = function (payload: Record<string, unknown>, api: RuntimeApi) {
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
      visibleLog("[runtime-demo] Demo runtime loaded");
    } catch (e) {
      try {
        dprint("[runtime-demo] Demo load error: " + String(e));
      } catch {}
      try {
        if (typeof print === "function") print("[runtime-demo] Demo load error: " + String(e));
      } catch {}
    }
  }

  function reloadIfNeeded(isBusyCheck: () => boolean): void {
    if (!fa.fileExists(config.runtimeFile)) {
      return;
    }

    const currentMtime = fa.getFileMtime(config.runtimeFile);
    const busy = isBusyCheck();

    try {
      const appWindow = (typeof self !== "undefined" ? self.ipc : null)?.appWindow?.();
      if (appWindow && typeof appWindow.writeToPT === "function") {
        appWindow.writeToPT(
          "[RELOAD] mtime=" + currentMtime + " lastMtime=" + lastMtime + " busy=" + busy + "\n",
        );
      }
    } catch {}

    console.log(
      "[runtime-loader] reloadIfNeeded: currentMtime=" +
        currentMtime +
        " lastMtime=" +
        lastMtime +
        " busy=" +
        busy,
    );

    // Sin cambios y sin recarga pendiente: no hacer nada.
    if (currentMtime === lastMtime && !pendingReload) {
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
