// ============================================================================
// Minimal Loader - Runs in PT and loads/reloads the real runtime
// ============================================================================

// Type definitions are in pt-runtime.d.ts
// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./pt-runtime.d.ts" />

var fm: PTFileManager | null = null;
var fw: PTFileWatcher | null = null;
var currentRuntime: { start?: () => void; stop?: () => void } | null = null;
var RUNTIME_FILE = DEV_DIR + "/runtime.js";

function load() {
  try {
    if (!fm!.fileExists(RUNTIME_FILE)) return;

    // Stop old runtime if exists
    if (currentRuntime && currentRuntime.stop) {
      currentRuntime.stop();
    }

    var code = fm!.getFileContents(RUNTIME_FILE);
    // The bundled runtime returns an object with start/stop/handle
    var rt = new Function("ipc", "dprint", "DEV_DIR", code + "\nreturn Runtime;")(ipc, dprint, DEV_DIR);

    if (rt && rt.start) {
      rt.start();
      currentRuntime = rt;
      dprint("[Loader] Runtime loaded and started");
    } else {
      dprint("[Loader] Invalid runtime format");
    }
  } catch (e) {
    dprint("[Loader] Error: " + String(e));
  }
}

function main() {
  try {
    fm = ipc.systemFileManager();
    // @ts-ignore - getFileWatcher no existe en PTFileManager type definitions
    fw = fm.getFileWatcher();

    if (!fw) return;
    fw.addPath(RUNTIME_FILE);
    fw.registerEvent("fileChanged", null, function(src: string, args: { path: string; type: string }) {
      if (args.path === RUNTIME_FILE) {
        // Debounce
        setTimeout(load, 100);
      }
    });

    load();
  } catch (e) {
    dprint("[Loader] Fatal: " + String(e));
  }
}

function cleanUp() {
  if (currentRuntime && currentRuntime.stop) {
    currentRuntime.stop();
  }
}

// @ts-ignore
globalThis.main = main;
// @ts-ignore
globalThis.cleanUp = cleanUp;
