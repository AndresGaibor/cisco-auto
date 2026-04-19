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

function isDebugEnabled(): boolean {
  try {
    const scope = (typeof self !== "undefined" ? self : Function("return this")()) as any;
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
    debugLog("[fm] safeFM enter");
    debugLog(
      "[fm] state fm=" +
        String(typeof fm !== "undefined" && fm !== null) +
        " ipc=" +
        String(typeof ipc !== "undefined" && ipc !== null) +
        " _ScriptModule=" +
        String(typeof _ScriptModule !== "undefined" && _ScriptModule !== null),
    );
    if (typeof fm !== "undefined" && fm !== null) {
      debugLog("[fm] backend: global fm (atomic-move)");
      return makeSafeFM(fm, "atomic-move");
    }
    if (typeof ipc !== "undefined" && ipc !== null && typeof ipc.systemFileManager === "function") {
      debugLog("[fm] trying ipc.systemFileManager");
      var _fm = ipc.systemFileManager();
      if (_fm) {
        debugLog("[fm] backend: ipc.systemFileManager (atomic-move)");
        try {
          (typeof self !== "undefined" ? self : Function("return this")()).fm = _fm;
        } catch {}
        return makeSafeFM(_fm, "atomic-move");
      } else {
        debugLog("[fm] ipc.systemFileManager returned null");
      }
    }
    if (typeof _ScriptModule !== "undefined" && _ScriptModule !== null) {
      debugLog("[fm] backend: _ScriptModule shim (copy-delete)");
      return makeSafeFM(buildScriptModuleShim(), "copy-delete");
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

function buildScriptModuleShim(): any {
  return {
    fileExists: function (p: string) {
      try {
        var sz = (_ScriptModule as any).getFileSize(p);
        return sz >= 0;
      } catch (e) {
        return false;
      }
    },
    directoryExists: function (p: string) {
      try {
        return (_ScriptModule as any).getFileSize(p) >= 0;
      } catch (e) {
        return false;
      }
    },
    getFileContents: function (p: string) {
      return (_ScriptModule as any).getFileContents(p);
    },
    writePlainTextToFile: function (p: string, c: string) {
      (_ScriptModule as any).writeTextToFile(p, c);
    },
    makeDirectory: function (p: string) {
      try {
        (_ScriptModule as any).writeTextToFile(p + "/.keep", "");
      } catch (e) {}
      return true;
    },
    getFilesInDirectory: function (p: string) {
      try {
        return (_ScriptModule as any).getFilesInDirectory
          ? (_ScriptModule as any).getFilesInDirectory(p)
          : [];
      } catch (e) {
        return [];
      }
    },
    removeFile: function (p: string) {
      try {
        if ((_ScriptModule as any).removeFile) (_ScriptModule as any).removeFile(p);
        return true;
      } catch (e) {
        return false;
      }
    },
    moveSrcFileToDestFile: function (s: string, d: string) {
      try {
        var c = (_ScriptModule as any).getFileContents(s);
        (_ScriptModule as any).writeTextToFile(d, c);
        return true;
      } catch (e) {
        return false;
      }
    },
    getFileModificationTime: function (p: string) {
      try {
        return (_ScriptModule as any).getFileModificationTime(p);
      } catch (e) {
        return 0;
      }
    },
    getFileSize: function (p: string) {
      try {
        return (_ScriptModule as any).getFileSize(p);
      } catch (e) {
        return -1;
      }
    },
  };
}