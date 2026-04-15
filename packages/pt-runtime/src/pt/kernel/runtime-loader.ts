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

export interface RuntimeLoader {
  load(): void;
  reloadIfNeeded(isBusyCheck: () => boolean): void;
  getLastMtime(): number;
  getRuntimeFn(): ((payload: Record<string, unknown>, api: unknown) => unknown) | null;
  hasPendingReload(): boolean;
}

export function createRuntimeLoader(config: {
  runtimeFile: string;
}) {
  let lastMtime = 0;
  let runtimeFn: ((payload: Record<string, unknown>, api: unknown) => unknown) | null = null;
  let lastGoodRuntimeFn: ((payload: Record<string, unknown>, api: unknown) => unknown) | null = null;
  let pendingReload = false;

  // Determine file access method
  // fm = ipc.systemFileManager() when available
  // _ScriptModule = fallback for PT versions without fm
  const useFm = typeof fm !== "undefined" && fm !== null;
  const useScriptModule = typeof _ScriptModule !== "undefined" && _ScriptModule !== null;

  function getFileMtime(path: string): number {
    try {
      if (useFm && fm.getFileModificationTime) {
        return fm.getFileModificationTime(path);
      }
      if (useScriptModule) {
        return _ScriptModule.getFileModificationTime(path);
      }
      return 0;
    } catch (e) {
      return 0;
    }
  }

  function fileExists(path: string): boolean {
    try {
      if (useFm) {
        return !!fm.fileExists(path);
      }
      if (useScriptModule) {
        var sz = _ScriptModule.getFileSize(path);
        return sz >= 0;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  function getFileContents(path: string): string {
    if (useFm) {
      return fm.getFileContents(path);
    }
    if (useScriptModule) {
      return _ScriptModule.getFileContents(path);
    }
    throw new Error("No file access method available");
  }

  function load(): void {
    if (!fileExists(config.runtimeFile)) {
      dprint("[runtime] No runtime.js found");
      return;
    }

    try {
      const mtime = getFileMtime(config.runtimeFile);
      if (mtime === lastMtime && runtimeFn) {
        return; // Already loaded, no change
      }

      const code = fm.getFileContents(config.runtimeFile);
      if (!code || code.length < 50) {
        dprint("[runtime] Runtime file too small, keeping previous version");
        return;
      }

      // Try to eval new runtime - if it fails, keep last good one
      const newFn = new Function("payload", "api", code) as ((payload: Record<string, unknown>, api: unknown) => unknown);
      runtimeFn = newFn;
      lastGoodRuntimeFn = newFn; // Update last good only after successful load
      lastMtime = mtime;
      pendingReload = false;
      dprint("[runtime] Loaded OK (mtime=" + mtime + ")");
    } catch (e) {
      dprint("[runtime] Load error (keeping previous version): " + String(e));
      // Preserve last good runtimeFn - don't set to null on failure
      if (!runtimeFn && lastGoodRuntimeFn) {
        runtimeFn = lastGoodRuntimeFn;
      }
    }
  }

  function reloadIfNeeded(isBusyCheck: () => boolean): void {
    if (!fileExists(config.runtimeFile)) {
      return;
    }

    const currentMtime = getFileMtime(config.runtimeFile);
    if (currentMtime === lastMtime) {
      // No file change, but check if we have a pending reload
      if (pendingReload && !isBusyCheck()) {
        dprint("[runtime] Applying pending reload (system now idle)");
        load();
      }
      return;
    }

    // File has changed
    if (isBusyCheck()) {
      dprint("[runtime] Changed but system busy, deferring reload");
      pendingReload = true;
      return;
    }

    dprint("[runtime] Reloading (mtime changed)...");
    load();
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

  return { load, reloadIfNeeded, getLastMtime, getRuntimeFn, hasPendingReload };
}
