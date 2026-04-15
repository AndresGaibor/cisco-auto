// packages/pt-runtime/src/pt/kernel/safe-fm.ts
// Safe FileManager wrapper — handles fm being null/undefined gracefully

export interface SafeFM {
  available: boolean;
  fm: {
    fileExists: (p: string) => boolean;
    directoryExists: (p: string) => boolean;
    getFileContents: (p: string) => string;
    writePlainTextToFile: (p: string, c: string) => void;
    makeDirectory: (p: string) => boolean;
    getFilesInDirectory: (p: string) => string[];
    removeFile: (p: string) => void;
    moveSrcFileToDestFile: (s: string, d: string, o: boolean) => void;
    getFileModificationTime: (p: string) => number;
    getFileSize: (p: string) => number;
  } | null;
}

export function safeFM(): SafeFM {
  try {
    try { dprint("[safeFM] enter"); } catch {}
    try {
      dprint(
        "[safeFM] state fm=" + String(typeof fm !== "undefined" && fm !== null) +
        " ipc=" + String(typeof ipc !== "undefined" && ipc !== null) +
        " _ScriptModule=" + String(typeof _ScriptModule !== "undefined" && _ScriptModule !== null)
      );
    } catch {}
    if (typeof fm !== "undefined" && fm !== null) {
      try { dprint("[safeFM] using global fm"); } catch {}
      return { available: true, fm: fm };
    }
    // Retry from ipc
    if (typeof ipc !== "undefined" && ipc !== null && typeof ipc.systemFileManager === "function") {
      try { dprint("[safeFM] ipc.systemFileManager available"); } catch {}
      var _fm = ipc.systemFileManager();
      if (_fm) {
        try { dprint("[safeFM] using ipc.systemFileManager"); } catch {}
        try {
          dprint("[safeFM] ipc.appWindow available=" + String(typeof ipc.appWindow === "function"));
        } catch {}
        try { (typeof self !== "undefined" ? self : Function("return this")()).fm = _fm; } catch {}
        return { available: true, fm: _fm };
      }
    }
    // Fallback to _ScriptModule shim
    if (typeof _ScriptModule !== "undefined" && _ScriptModule !== null) {
      try { dprint("[safeFM] using _ScriptModule shim"); } catch {}
      var shim = {
        fileExists: function(p: string) { try { var sz = _ScriptModule.getFileSize(p); return sz >= 0; } catch(e) { return false; } },
        directoryExists: function(p: string) { try { return _ScriptModule.getFileSize(p) >= 0; } catch(e) { return false; } },
        getFileContents: function(p: string) { return _ScriptModule.getFileContents(p); },
        writePlainTextToFile: function(p: string, c: string) { _ScriptModule.writeTextToFile(p, c); },
        makeDirectory: function(p: string) { try { _ScriptModule.writeTextToFile(p + "/.keep", ""); } catch(e) {} return true; },
        getFilesInDirectory: function(p: string) { try { return _ScriptModule.getFilesInDirectory ? _ScriptModule.getFilesInDirectory(p) : []; } catch(e) { return []; } },
        removeFile: function(p: string) { try { if (_ScriptModule.removeFile) _ScriptModule.removeFile(p); } catch(e) {} },
        moveSrcFileToDestFile: function(s: string, d: string, o: boolean) { try { var c = _ScriptModule.getFileContents(s); _ScriptModule.writeTextToFile(d, c); } catch(e) {} },
        getFileModificationTime: function(p: string) { try { return _ScriptModule.getFileModificationTime(p); } catch(e) { return 0; } },
        getFileSize: function(p: string) { try { return _ScriptModule.getFileSize(p); } catch(e) { return -1; } },
      };
      return { available: true, fm: shim };
    }
  } catch (e) {}
  try { dprint("[safeFM] unavailable"); } catch {}
  return { available: false, fm: null };
}
