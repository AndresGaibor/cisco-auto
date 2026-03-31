// ============================================================================
// Minimal Loader - Runs in PT and loads/reloads the real runtime
// ============================================================================

declare var ipc: any;
declare var dprint: (msg: string) => void;
declare var DEV_DIR: string; // Injected

var fm: any = null;
var fw: any = null;
var currentRuntime: any = null;
var RUNTIME_FILE = DEV_DIR + "/runtime.js";

function load() {
  try {
    if (!fm.fileExists(RUNTIME_FILE)) return;
    
    // Stop old runtime if exists
    if (currentRuntime && currentRuntime.stop) {
      currentRuntime.stop();
    }
    
    var code = fm.getFileContents(RUNTIME_FILE);
    // The bundled runtime returns an object with start/stop/handle
    var rt = new Function("ipc", "dprint", "DEV_DIR", code + "\nreturn Runtime;")(ipc, dprint, DEV_DIR);
    
    if (rt && rt.start) {
      rt.start();
      currentRuntime = rt;
      dprint("[Loader] Runtime loaded and started");
    } else {
      dprint("[Loader] Invalid runtime format");
    }
  } catch (e: any) {
    dprint("[Loader] Error: " + String(e));
  }
}

function main() {
  try {
    fm = ipc.systemFileManager();
    fw = fm.getFileWatcher();
    
    fw.addPath(RUNTIME_FILE);
    fw.registerEvent("fileChanged", null, function(src: any, args: any) {
      if (args.path === RUNTIME_FILE) {
        // Debounce
        setTimeout(load, 100);
      }
    });
    
    load();
  } catch (e: any) {
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
