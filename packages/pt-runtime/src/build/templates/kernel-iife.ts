// packages/pt-runtime/src/build/templates/kernel-iife.ts
// Kernel IIFE template + tslib helper functions
// These helpers are required because ts.transpileModule uses ES5 + downlevelIteration
// but noEmitHelpers=true means helpers are NOT auto-included.

/**
 * Returns the tslib helper functions as a string.
 * These are inlined because PT QTScript needs ES5-compatible helpers.
 */
export function tslibHelpersTemplate(): string {
  return `
var __assign = function() {
  __assign = Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
      s = arguments[i];
      for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
    }
    return t;
  };
  return __assign.apply(this, arguments);
};
var __values = function(o, markArrayFunction) {
  if (typeof Symbol !== "undefined" && o[Symbol.iterator]) {
    var it = typeof markArrayFunction === "function" ? markArrayFunction(o) : o[Symbol.iterator]();
    var next;
    return {
      next: function() {
        next = it.next();
        return next;
      }
    };
  }
  var i = -1;
  return {
    next: function() {
      i += 1;
      next = { value: o[i], done: i >= o.length };
      return next;
    }
  };
};
var __read = function(o, n) {
  if (n === undefined) n = o.length;
  var m = new Array(n);
  var i = 0;
  var r;
  if (Array.isArray(o) || (typeof o[Symbol.iterator] === "function" && !isNaN(Number(o.length)))) {
    for (var it = __values(o), s; !(s = it.next()).done; ) {
      if (i === n) break;
      m[i++] = s.value;
    }
  } else {
    for (var a = [], j = 0; j < o.length; j++) a.push(o[j]);
    m = a.slice(0, n);
  }
  return m;
};
var __spreadArray = function(to, from, pack) {
  if (pack || from.length === 0) {
    for (var i = 0, e = from.length; i < e; i++) {
      to[i + (pack ? 0 : to.length)] = from[i];
    }
  } else {
    for (var i = from.length, j = to.length; i--; ) {
      to[j--] = from[i];
    }
  }
  return to;
};
var __awaiter = function(thisArg, _arguments, P, generator) {
  function adopt(value) { return value instanceof P ? value : new P(function(resolve) { resolve(value); }); }
  return new (P || (P = Promise))(function(resolve, reject) {
    function fulfilled(value) { try { step(generator.next(value)); } catch(e) { reject(e); } }
    function rejected(value) { try { step(generator["throw"](value)); } catch(e) { reject(e); } }
    function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};
var __generator = function(thisArg, body) {
  var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] };
  var f, y, t, g;
  return g = { next: verb(0), throw: verb(1), return: verb(2) };
  function verb(n) { return function(v) { return step([n, v]); }; }
  function step(op) {
    if (f) throw new TypeError("Generator is already executing.");
    while (_) try {
      if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
      if (y = 0, t) op = [op[0] & 2, t.value];
      switch (op[0]) {
        case 0: case 1: t = op; break;
        case 4: _.label++; return { value: op[1], done: false };
        case 5: _.label++; y = op[1]; op = [0]; continue;
        case 7: op = _.ops.pop(); _.trys.pop(); continue;
        default: if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
        if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
        if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
        if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
        if (t[2]) _.ops.pop();
        _.trys.pop(); continue;
      }
      op = body.call(thisArg, _);
    } catch (e) { op = [6, e]; y = 0; t = 0; } finally { f = t = 0; }
    if (op[0] & 5) throw op[1];
    return { value: op[0] ? op[1] : void 0, done: true };
  }
};
var __rest = function(s, e) {
  var t = {};
  for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0) t[p] = s[p];
  if (s != null && typeof Object.getOwnPropertySymbols === "function") {
    for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
      if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i])) t[p[i]] = s[p[i]];
    }
  }
  return t;
};
`;
}

/**
 * Builds the kernel IIFE template string.
 * Contains all kernel + terminal source code (from MAIN_MANIFEST).
 * Exposes createKernel / shutdownKernel on the global scope (self).
 * Hot reload of runtime.js is handled internally by the kernel's
 * runtime-loader — no external setInterval needed in main.js.
 */
export function kernelIifeTemplate(params: {
  devDirLiteral: string;
  tslibHelpers: string;
  kernelCode: string;
}): string {
  const { devDirLiteral, tslibHelpers, kernelCode } = params;

  return `
(function() {
  // Bootstrap globals — PT QTScript 9.0: 'self' is undefined.
  // Use 'this' (which IS the global object) as our global scope reference.
  _g = (function() { return this; })();
  // Polyfill self so compiled kernel code using self.ipc / self.fm works transparently.
  if (typeof self === "undefined") { _g.self = _g; }
  var ipc = (typeof _g.ipc !== "undefined" && _g.ipc !== null) ? _g.ipc : null;
  if (!ipc && typeof _g.self !== "undefined" && _g.self && typeof _g.self.ipc !== "undefined") {
    ipc = _g.self.ipc;
  }
  _g.ipc = ipc;
  var __nativeDprint = (typeof _g.dprint === "function") ? _g.dprint : null;
  var __ptDebug = false;
  try {
    var _scope = (typeof self !== "undefined") ? self : Function("return this")();
    __ptDebug = _scope.PT_DEBUG === 1 || _scope.PT_DEBUG === "1" || _scope.PT_DEBUG === true;
  } catch (_ptDebugErr) {}
  var dprint = function(msg) {
    try {
      var appWindow = ipc && typeof ipc.appWindow === "function" ? ipc.appWindow() : null;
      if (__ptDebug && appWindow && typeof appWindow.writeToPT === "function") {
        appWindow.writeToPT(String(msg) + "\\n");
      }
    } catch (_dprintErr) {}
    try {
      if (__nativeDprint) __nativeDprint(String(msg));
    } catch (_nativeDprintErr) {}
    try { if (typeof print === "function") print(String(msg)); } catch (_printErr) {}
  };
  _g.dprint = dprint;
  var DEV_DIR = (typeof DEV_DIR !== "undefined") ? DEV_DIR : ${devDirLiteral};

  // fm initialization with dual-path fallback (BUG-01 fix)
  // PT 9.0: fm is NOT a global — must use ipc.systemFileManager() or _ScriptModule shim
  var fm = null;
  try {
  if (typeof ipc !== "undefined" && ipc !== null && typeof ipc.systemFileManager === "function") {
    fm = ipc.systemFileManager();
    if (fm) {
      try {
        fm.__claimMode = "atomic-move";
      } catch(_claimModeErr) {}
      _g.PT_FILE_CLAIM_MODE = "atomic-move";
    }
  }
  } catch (_fmErr) {}
  if (!fm) {
    try {
      if (typeof _ScriptModule !== "undefined" && _ScriptModule !== null) {
        fm = {
          __claimMode: "copy-delete",
          fileExists: function(p) {
            try {
              var sz = _ScriptModule.getFileSize(p);
              return sz >= 0;
            } catch(e) {
              return false;
            }
          },
          directoryExists: function(p) {
            try {
              return _ScriptModule.getFileSize(p) >= 0;
            } catch(e) {
              return false;
            }
          },
          getFileContents: function(p) {
            return _ScriptModule.getFileContents(p);
          },
          writePlainTextToFile: function(p, c) {
            _ScriptModule.writeTextToFile(p, c);
          },
          makeDirectory: function(p) {
            try {
              _ScriptModule.writeTextToFile(p + "/.keep", "");
            } catch(e) {}
            return true;
          },
          getFilesInDirectory: function(p) {
            try {
              return _ScriptModule.getFilesInDirectory ? _ScriptModule.getFilesInDirectory(p) : [];
            } catch(e) {
              return [];
            }
          },
          removeFile: function(p) {
            try {
              if (_ScriptModule.removeFile) {
                _ScriptModule.removeFile(p);
                return true;
              }
            } catch(e) {}
            return false;
          },
          moveSrcFileToDestFile: function(s, d, o) {
            try {
              var c = _ScriptModule.getFileContents(s);
              _ScriptModule.writeTextToFile(d, c);

              if (_ScriptModule.removeFile) {
                try { _ScriptModule.removeFile(s); } catch(_removeErr) {}
              }

              return true;
            } catch(e) {
              return false;
            }
          },
          moveOrCopyDelete: function(s, d, o) {
            var ok = false;
            var sourceStillExists = true;

            try {
              var c = _ScriptModule.getFileContents(s);
              _ScriptModule.writeTextToFile(d, c);
              ok = true;
            } catch(e) {
              ok = false;
            }

            try {
              if (_ScriptModule.removeFile) {
                _ScriptModule.removeFile(s);
              }
            } catch(_removeErr) {}

            try {
              var sz = _ScriptModule.getFileSize(s);
              sourceStillExists = sz >= 0;
            } catch(_sizeErr) {
              sourceStillExists = false;
            }

            return {
              ok: ok,
              mode: "copy-delete",
              sourceStillExists: sourceStillExists
            };
          },
          getFileModificationTime: function(p) {
            try {
              return _ScriptModule.getFileModificationTime(p);
            } catch(e) {
              return 0;
            }
          },
          getFileSize: function(p) {
            try {
              return _ScriptModule.getFileSize(p);
            } catch(e) {
              return -1;
            }
          }
        };
        _g.PT_FILE_CLAIM_MODE = "copy-delete";
      }
    } catch (_smErr) {}
  }
  if (!fm) {
    if (typeof dprint === "function") dprint("[KERNEL-IIFE] WARNING: fm not available — file ops disabled");
  }

  if (!_g.PT_FILE_CLAIM_MODE) {
    _g.PT_FILE_CLAIM_MODE = "unknown";
  }

  function safeFM() {
    try {
      if (typeof fm !== "undefined" && fm !== null) {
        return { available: true, fm: fm };
      }
      if (typeof ipc !== "undefined" && ipc !== null && typeof ipc.systemFileManager === "function") {
        var _fm2 = ipc.systemFileManager();
        if (_fm2) {
          _g.fm = _fm2;
          return { available: true, fm: _fm2 };
        }
      }
      if (typeof _ScriptModule !== "undefined" && _ScriptModule !== null) {
        var shim = {
          fileExists: function(p) { try { var sz = _ScriptModule.getFileSize(p); return sz >= 0; } catch(e) { return false; } },
          directoryExists: function(p) { try { return _ScriptModule.getFileSize(p) >= 0; } catch(e) { return false; } },
          getFileContents: function(p) { return _ScriptModule.getFileContents(p); },
          writePlainTextToFile: function(p, c) { _ScriptModule.writeTextToFile(p, c); },
          makeDirectory: function(p) { try { _ScriptModule.writeTextToFile(p + "/.keep", ""); } catch(e) {} return true; },
          getFilesInDirectory: function(p) { try { return _ScriptModule.getFilesInDirectory ? _ScriptModule.getFilesInDirectory(p) : []; } catch(e) { return []; } },
          removeFile: function(p) { try { _ScriptModule.removeFile ? _ScriptModule.removeFile(p) : void 0; } catch(e) {} },
          moveSrcFileToDestFile: function(s, d, o) { try { var c = _ScriptModule.getFileContents(s); _ScriptModule.writeTextToFile(d, c); } catch(e) {} },
          getFileModificationTime: function(p) { try { return _ScriptModule.getFileModificationTime(p); } catch(e) { return 0; } },
          getFileSize: function(p) { try { return _ScriptModule.getFileSize(p); } catch(e) { return -1; } },
        };
        return { available: true, fm: shim };
      }
    } catch (_safeFmErr) {}
    return { available: false, fm: null };
  }

  // Publish bootstrap globals so modules loaded later can use them
  if (!_g.dprint)  _g.dprint  = dprint;
  if (!_g.DEV_DIR) _g.DEV_DIR = DEV_DIR;
  if (!_g.fm) _g.fm = fm;
  if (!_g.safeFM) _g.safeFM = safeFM;

  var __ptDebugEvents = [];
  var __ptDebugSeq = 0;
  function __writeDebugLog(scope, message, level) {
    try {
      if (!fm || !fm.writePlainTextToFile) return;
      __ptDebugSeq += 1;
      __ptDebugEvents.push(JSON.stringify({
        seq: __ptDebugSeq,
        timestamp: new Date().toISOString(),
        scope: scope,
        message: String(message),
        level: level || "debug",
      }));
      if (__ptDebugEvents.length > 500) {
        __ptDebugEvents = __ptDebugEvents.slice(-500);
      }
      fm.writePlainTextToFile(DEV_DIR + "/logs/pt-debug.current.ndjson", __ptDebugEvents.join("\\n") + "\\n");
    } catch (e) {}
  }

  var dprint = function(msg) {
    __writeDebugLog("kernel", msg, "debug");
  };
  _g.dprint = dprint;

  // DIAGNOSTIC AUTO-RUN
  try {
    var diag_fm = safeFM();
    if (diag_fm.available) {
        var diag = {
            ts: new Date().getTime(),
            dir: DEV_DIR,
            files: diag_fm.fm.getFilesInDirectory(DEV_DIR),
            createKernel_exists: typeof createKernel !== "undefined",
            handler_map: _g.HANDLER_MAP ? Object.keys(_g.HANDLER_MAP) : "NULL"
        };
        diag_fm.fm.writePlainTextToFile(DEV_DIR + "/diagnostic.json", JSON.stringify(diag));
    }
  } catch(e) {}

  // SANITY CHECK: if this doesn't print, the IIFE itself is crashing
  if (typeof dprint === "function") dprint("[KERNEL-IIFE] running, ipc=" + (ipc ? "OK" : "NULL"));
  if (typeof dprint === "function") dprint("[KERNEL-IIFE] typeof createKernel=" + typeof createKernel);

${tslibHelpers}
${kernelCode}

  // Publish kernel factory on global scope
  if (typeof createKernel === "function") {
      _g.createKernel = createKernel;
    _g.createKernel = function(cfg) {
      return createKernel(cfg);
    };
    if (typeof dprint === "function") dprint("[KERNEL-IIFE] createKernel published OK");
  } else {
    if (typeof dprint === "function") dprint("[KERNEL-IIFE] ERROR: createKernel NOT found");
  }

  _g.shutdownKernel = function() {
    var k = _g._kernelInstance;
    if (k && typeof k.shutdown === "function") k.shutdown();
  };

})();
`;
}
