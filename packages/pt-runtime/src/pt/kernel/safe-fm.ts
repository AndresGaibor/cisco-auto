// packages/pt-runtime/src/pt/kernel/safe-fm.ts
// Safe FileManager wrapper — detecta el backend y expone claimMode

export type ClaimMode = "atomic-move" | "copy-delete" | "unknown";

export interface SafeFM {
  available: boolean;
  claimMode: ClaimMode;
  fm: {
    fileExists: (p: string) => string | boolean;
    directoryExists: (p: string) => boolean;
    getFileContents: (p: string) => string;
    writePlainTextToFile: (p: string, c: string) => void;
    makeDirectory: (p: string) => boolean;
    getFilesInDirectory: (p: string) => string[];
    removeFile: (p: string) => boolean;
    moveSrcFileToDestFile: (s: string, d: string, overwrite?: boolean) => boolean;
    getFileModificationTime: (p: string) => number;
    getFileSize?: (p: string) => number;
  } | null;
  moveOrCopyDelete(src: string, dest: string, overwrite?: boolean): boolean;
}

function getGlobalScope(): any {
  if (typeof globalThis !== "undefined") return globalThis as any;
  try {
    if (typeof self !== "undefined" && self) return self as any;
  } catch {}

  try {
    return Function("return this")();
  } catch {}

  return {};
}

function getGlobalValue(name: string): any {
  try {
    const scope = getGlobalScope();
    if (scope && typeof scope[name] !== "undefined" && scope[name] !== null) {
      return scope[name];
    }
  } catch {}

  return null;
}

function isDebugEnabled(): boolean {
  try {
    const scope = getGlobalScope();
    return scope.PT_DEBUG === 1 || scope.PT_DEBUG === "1" || scope.PT_DEBUG === true;
  } catch {
    return false;
  }
}

function debugLog(message: string): void {
  if (!isDebugEnabled()) return;
  try {
    dprint(message);
  } catch {}
}

export function safeFM(): SafeFM {
  try {
    const scope = getGlobalScope();
    const globalFm = scope.fm ?? getGlobalValue("fm");
    const globalIpc = scope.ipc ?? getGlobalValue("ipc");
    const scriptModule = scope._ScriptModule ?? getGlobalValue("_ScriptModule");

    debugLog("[fm] safeFM enter");
    debugLog(
      "[fm] state fm=" +
        String(globalFm !== null) +
        " ipc=" +
        String(globalIpc !== null) +
        " _ScriptModule=" +
        String(scriptModule !== null),
    );

    if (globalFm) {
      debugLog("[fm] backend: global fm (atomic-move)");
      return makeSafeFM(globalFm, "atomic-move");
    }

    if (globalIpc && typeof globalIpc.systemFileManager === "function") {
      debugLog("[fm] trying ipc.systemFileManager");
      var _fm = globalIpc.systemFileManager();
      if (_fm) {
        debugLog("[fm] backend: ipc.systemFileManager (atomic-move)");
        try {
          getGlobalScope().fm = _fm;
        } catch {}
        return makeSafeFM(_fm, "atomic-move");
      } else {
        debugLog("[fm] ipc.systemFileManager returned null");
      }
    }

    if (scriptModule) {
      debugLog("[fm] backend: _ScriptModule shim (copy-delete)");
      return makeSafeFM(buildScriptModuleShim(scriptModule), "copy-delete");
    }
  } catch (e) {
    debugLog("[fm] safeFM error: " + String(e));
  }

  debugLog("[fm] UNAVAILABLE - no file manager found");
  return {
    available: false,
    claimMode: "unknown",
    fm: null,
    moveOrCopyDelete: () => false,
  };
}

function makeSafeFM(fm: any, mode: ClaimMode): SafeFM {
  return {
    available: true,
    claimMode: mode,
    fm: fm,
    moveOrCopyDelete: (src: string, dest: string, overwrite = false): boolean => {
      if (mode === "copy-delete") {
        try {
          const contenido = fm.getFileContents(src);
          fm.writePlainTextToFile(dest, contenido);
          fm.removeFile(src);
          debugLog("[fm] copy-delete: " + src + " -> " + dest);
          return true;
        } catch (e) {
          debugLog("[fm] copy-delete failed: " + String(e));
          return false;
        }
      }
      return fm.moveSrcFileToDestFile(src, dest, overwrite);
    },
  };
}

function buildScriptModuleShim(scriptModule: any): any {
  return {
    fileExists: function (p: string) {
      try {
        var sz = scriptModule.getFileSize(p);
        return sz >= 0;
      } catch (e) {
        return false;
      }
    },
    directoryExists: function (p: string) {
      try {
        return scriptModule.getFileSize(p) >= 0;
      } catch (e) {
        return false;
      }
    },
    getFileContents: function (p: string) {
      return scriptModule.getFileContents(p);
    },
    writePlainTextToFile: function (p: string, c: string) {
      scriptModule.writeTextToFile(p, c);
    },
    makeDirectory: function (p: string) {
      try {
        scriptModule.writeTextToFile(p + "/.keep", "");
      } catch (e) {}
      return true;
    },
    getFilesInDirectory: function (p: string) {
      try {
        return scriptModule.getFilesInDirectory
          ? scriptModule.getFilesInDirectory(p)
          : [];
      } catch (e) {
        return [];
      }
    },
    removeFile: function (p: string) {
      try {
        if (scriptModule.removeFile) scriptModule.removeFile(p);
        return true;
      } catch (e) {
        return false;
      }
    },
    moveSrcFileToDestFile: function (s: string, d: string) {
      try {
        var c = scriptModule.getFileContents(s);
        scriptModule.writeTextToFile(d, c);
        return true;
      } catch (e) {
        return false;
      }
    },
    getFileModificationTime: function (p: string) {
      try {
        return scriptModule.getFileModificationTime(p);
      } catch (e) {
        return 0;
      }
    },
    getFileSize: function (p: string) {
      try {
        return scriptModule.getFileSize(p);
      } catch (e) {
        return -1;
      }
    },
  };
}