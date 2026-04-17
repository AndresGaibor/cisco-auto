// packages/pt-runtime/src/pt/kernel/safe-fm.ts
// Safe FileManager wrapper — handles fm being null/undefined gracefully

export interface SafeFM {
  available: boolean;
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
      debugLog("[fm] using global fm");
      return { available: true, fm: fm };
    }
    if (typeof ipc !== "undefined" && ipc !== null && typeof ipc.systemFileManager === "function") {
      debugLog("[fm] trying ipc.systemFileManager");
      var _fm = ipc.systemFileManager();
      if (_fm) {
        debugLog("[fm] using ipc.systemFileManager");
        try {
          (typeof self !== "undefined" ? self : Function("return this")()).fm = _fm;
        } catch {}
        return { available: true, fm: _fm };
      } else {
        debugLog("[fm] ipc.systemFileManager returned null");
      }
    }
    if (typeof _ScriptModule !== "undefined" && _ScriptModule !== null) {
      debugLog("[fm] using _ScriptModule shim");
      var shim = {
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
      return { available: true, fm: shim };
    }
  } catch (e) {
    debugLog("[fm] safeFM error: " + String(e));
  }
  debugLog("[fm] UNAVAILABLE - no file manager found");
  return { available: false, fm: null };
}
