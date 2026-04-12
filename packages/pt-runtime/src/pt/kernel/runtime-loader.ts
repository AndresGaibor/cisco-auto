// packages/pt-runtime/src/pt/kernel/runtime-loader.ts
// Hot reload for runtime.js with safe reload

export interface RuntimeLoader {
  load(): void;
  reloadIfNeeded(checkActiveJobs: () => boolean): void;
  getLastMtime(): number;
  getRuntimeFn(): ((payload: Record<string, unknown>, api: unknown) => unknown) | null;
}

export function createRuntimeLoader(config: {
  runtimeFile: string;
}) {
  let lastMtime = 0;
  let runtimeFn: ((payload: Record<string, unknown>, api: unknown) => unknown) | null = null;

  function getFileMtime(path: string): number {
    try {
      return fm.getFileModificationTime ? fm.getFileModificationTime(path) : 0;
    } catch (e) {
      return 0;
    }
  }

  function load(): void {
    if (!fm.fileExists(config.runtimeFile)) {
      dprint("[runtime] No runtime.js found");
      runtimeFn = null;
      return;
    }

    try {
      const mtime = getFileMtime(config.runtimeFile);
      if (mtime === lastMtime && runtimeFn) {
        return;
      }

      const code = fm.getFileContents(config.runtimeFile);
      if (!code || code.length < 50) {
        dprint("[runtime] Runtime file too small");
        runtimeFn = null;
        return;
      }

      runtimeFn = new Function("payload", "api", code) as ((payload: Record<string, unknown>, api: unknown) => unknown);
      lastMtime = mtime;
      dprint("[runtime] Loaded OK (mtime=" + mtime + ")");
    } catch (e) {
      dprint("[runtime] Load error: " + String(e));
      runtimeFn = null;
    }
  }

  function reloadIfNeeded(checkActiveJobs: () => boolean): void {
    const currentMtime = getFileMtime(config.runtimeFile);
    if (currentMtime === lastMtime) {
      return;
    }

    if (checkActiveJobs()) {
      dprint("[runtime] Changed but jobs active, deferring reload");
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

  return { load, reloadIfNeeded, getLastMtime, getRuntimeFn };
}
