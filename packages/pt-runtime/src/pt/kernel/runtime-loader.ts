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
import { writeDebugLog } from "./debug-log.js";

export type RuntimeDispatchFn = (
  payload: Record<string, unknown>,
  api: RuntimeApi,
) => unknown;

export type RuntimeLoaderStatus = {
  runtimeFile: string;
  runtimeLoaded: boolean;
  hasRuntimeFn: boolean;
  lastMtime: number;
  pendingReload: boolean;
  reloadCount: number;
  loadAttempted: boolean;
  loadSucceeded: boolean;
  lastLoadError: string | null;
  lastReload: {
    ok: boolean;
    at: number;
    mtime: number;
    error?: string;
  } | null;
};

export type RuntimeLoadResult = {
  ok: boolean;
  loaded: boolean;
  changed: boolean;
  mtime: number;
  error?: string;
  status: RuntimeLoaderStatus;
};

export interface RuntimeLoader {
  load(force?: boolean): RuntimeLoadResult;
  loadDemo(): void;
  reloadIfNeeded(isBusyCheck: () => boolean): void;
  reloadNow(): RuntimeLoadResult;
  getLastMtime(): number;
  getRuntimeFn(): RuntimeDispatchFn | null;
  hasPendingReload(): boolean;
  getStatus(): RuntimeLoaderStatus;
}

export function createRuntimeLoader(config: { runtimeFile: string }) {
  let lastMtime = 0;
  let runtimeFn: RuntimeDispatchFn | null = null;
  let lastGoodRuntimeFn: RuntimeDispatchFn | null = null;
  let pendingReload = false;
  let reloadCount = 0;
  let loadAttempted = false;
  let loadSucceeded = false;
  let lastLoadError: string | null = null;
  let lastReload: RuntimeLoaderStatus["lastReload"] = null;

  const fa = createFileAccess();

  function getGlobalScope(): any {
    return typeof self !== "undefined" ? self : Function("return this")();
  }

  function getStatus(): RuntimeLoaderStatus {
    return {
      runtimeFile: config.runtimeFile,
      runtimeLoaded: runtimeFn !== null,
      hasRuntimeFn: typeof runtimeFn === "function",
      lastMtime,
      pendingReload,
      reloadCount,
      loadAttempted,
      loadSucceeded,
      lastLoadError,
      lastReload,
    };
  }

  function makeResult(
    ok: boolean,
    loaded: boolean,
    changed: boolean,
    mtime: number,
    error?: string,
  ): RuntimeLoadResult {
    return {
      ok,
      loaded,
      changed,
      mtime,
      error,
      status: getStatus(),
    };
  }

  function load(force = false): RuntimeLoadResult {
    loadAttempted = true;
    let previousDispatch: unknown = null;
    let previousRuntimeFn: RuntimeDispatchFn | null = runtimeFn;

    if (!fa.fileExists(config.runtimeFile)) {
      const error = "runtime.js not found at " + config.runtimeFile;
      dprint("[loader] " + error);
      try {
        getGlobalScope().__ptRuntimeLoaded = runtimeFn !== null;
      } catch {}
      try {
        getGlobalScope().__ptRuntimeLoadSucceeded = false;
      } catch {}
      try {
        getGlobalScope().__ptRuntimeLoadError = error;
      } catch {}
      lastLoadError = error;
      loadSucceeded = false;
      lastReload = {
        ok: false,
        at: Date.now(),
        mtime: lastMtime,
        error,
      };
      return makeResult(false, runtimeFn !== null, false, lastMtime, error);
    }

    const visibleLog = (message: string, level: "debug" | "info" | "warn" | "error" = "debug") => {
      try {
        writeDebugLog("loader", message, level);
      } catch {}
      try {
        dprint(message);
      } catch {}
      try {
        if (typeof print === "function") print(String(message));
      } catch {}
    };

    try {
      getGlobalScope().__ptRuntimeLoadAttempted = true;

      visibleLog("[loader] Loading runtime.js...", "info");
      const mtime = fa.getFileMtime(config.runtimeFile);
      loadAttempted = true;
      lastLoadError = null;
      if (!force && mtime === lastMtime && runtimeFn) {
        visibleLog("[loader] No change detected (mtime=" + mtime + "), skipping");
        loadSucceeded = true;
        return makeResult(true, true, false, mtime);
      }

      let code = fa.getFileContents(config.runtimeFile);
      if (!code || code.length < 50) {
        const error = "Runtime file too small (" + (code?.length || 0) + " bytes)";
        dprint("[loader] " + error + ", keeping previous version");
        try {
          getGlobalScope().__ptRuntimeLoaded = runtimeFn !== null;
        } catch {}
        try {
          getGlobalScope().__ptRuntimeLoadSucceeded = false;
        } catch {}
        try {
          getGlobalScope().__ptRuntimeLoadError = error;
        } catch {}
        loadSucceeded = false;
        lastLoadError = error;
        lastReload = {
          ok: false,
          at: Date.now(),
          mtime,
          error,
        };
        return makeResult(false, runtimeFn !== null, false, mtime, error);
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
      const _moduleExports = _exports;
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

      const _global = getGlobalScope();
      previousDispatch = _global._ptDispatch;
      previousRuntimeFn = runtimeFn;

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
      try {
        _global._ptDispatch = undefined;
      } catch {}
      fn(_ipc, _fm, _dprint, _DEV_DIR, _exports, { exports: _moduleExports }, _g);

      visibleLog("[loader] Checking _ptDispatch registration...");
      const dispatch = _g._ptDispatch;
      if (typeof dispatch !== "function") {
        visibleLog(
          "[loader] ERROR: _ptDispatch not found on global. Check runtime init errors.",
          "error",
        );
        throw new Error("runtime.js did not register _ptDispatch — check for init errors");
      }

      runtimeFn = dispatch;
      lastGoodRuntimeFn = dispatch;
      lastMtime = mtime;
      pendingReload = false;
      _g.__ptRuntimeLoaded = true;
      reloadCount += 1;
      loadSucceeded = true;
      lastLoadError = null;
      lastReload = {
        ok: true,
        at: Date.now(),
        mtime,
      };
      try {
        getGlobalScope().__ptRuntimeLoadSucceeded = true;
      } catch {}
      visibleLog("[loader] SUCCESS: runtime.js loaded (mtime=" + mtime + ")", "info");
      visibleLog("[loader] _ptDispatch registered, ready for dispatch");
      return makeResult(true, true, true, mtime);
    } catch (e) {
      const error = String(e instanceof Error ? e.message : e);
      try {
        getGlobalScope().__ptRuntimeLoaded = false;
      } catch {}
      try {
        getGlobalScope().__ptRuntimeLoadSucceeded = false;
      } catch {}
      try {
        getGlobalScope().__ptRuntimeLoadError = error;
      } catch {}
      try {
        const _global = getGlobalScope();
        if (typeof lastGoodRuntimeFn === "function") {
          _global._ptDispatch = lastGoodRuntimeFn;
        } else if (typeof previousDispatch === "function") {
          _global._ptDispatch = previousDispatch;
        }
      } catch {}

      runtimeFn =
        typeof lastGoodRuntimeFn === "function"
          ? lastGoodRuntimeFn
          : typeof previousRuntimeFn === "function"
            ? previousRuntimeFn
            : runtimeFn;

      loadSucceeded = false;
      lastLoadError = error;
      lastReload = {
        ok: false,
        at: Date.now(),
        mtime: lastMtime,
        error,
      };

      visibleLog("[loader] LOAD ERROR: " + error, "error");
      visibleLog("[loader] Keeping previous runtime if available", "warn");
      if (runtimeFn) {
        visibleLog("[loader] Reverted to last good runtime", "info");
      }

      return makeResult(false, runtimeFn !== null, false, lastMtime, error);
    }
  }

  function loadDemo(): void {
    try {
      const _g: any = typeof self !== "undefined" ? self : Function("return this")();
      const visibleLog = (
        message: string,
        level: "debug" | "info" | "warn" | "error" = "debug",
      ) => {
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

      visibleLog("[runtime-demo] Loading lightweight demo runtime...", "info");

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
      reloadCount += 1;
      loadAttempted = true;
      loadSucceeded = true;
      lastLoadError = null;
      lastReload = {
        ok: true,
        at: Date.now(),
        mtime: lastMtime,
      };
      visibleLog("[runtime-demo] Demo runtime loaded", "info");
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

  function reloadNow(): RuntimeLoadResult {
    pendingReload = false;
    return load(true);
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

  return {
    load,
    loadDemo,
    reloadIfNeeded,
    reloadNow,
    getLastMtime,
    getRuntimeFn,
    hasPendingReload,
    getStatus,
  };
}
