/**
 * PT Script Module - Main Entry Point
 * 
 * Este módulo corre DENTRO de Packet Tracer y usa FileWatcher
 * para recibir comandos desde la CLI externa.
 */

// Configuración
var DEV_DIR = "/Users/andresgaibor/pt-dev";
var RUNTIME_FILE = DEV_DIR + "/runtime.js";
var COMMAND_FILE = DEV_DIR + "/command.json";
var EVENTS_FILE = DEV_DIR + "/events.ndjson";

// Estado global
var fm = null;
var fw = null;
var runtimeFn = null;
var reloadTimer = null;
var commandTimer = null;

/**
 * Append event to NDJSON file
 */
function appendEvent(evt) {
  try {
    var prev = fm.fileExists(EVENTS_FILE) ? fm.getFileContents(EVENTS_FILE) : "";
    var line = JSON.stringify(evt) + "\n";
    fm.writePlainTextToFile(EVENTS_FILE, prev + line);
  } catch (e) {
    dprint("[ERROR] Failed to append event: " + String(e));
  }
}

/**
 * Load runtime.js and compile it
 */
function loadRuntime() {
  try {
    if (!fm.fileExists(RUNTIME_FILE)) {
      appendEvent({ type: "error", ts: Date.now(), message: "Runtime file not found" });
      return;
    }

    var code = fm.getFileContents(RUNTIME_FILE);
    runtimeFn = new Function("payload", "ipc", "dprint", code);
    
    appendEvent({ type: "runtime-loaded", ts: Date.now() });
    dprint("[OK] Runtime loaded successfully");
  } catch (e) {
    appendEvent({ 
      type: "error", 
      ts: Date.now(), 
      message: "Failed to load runtime: " + String(e),
      stack: String(e.stack || "")
    });
    dprint("[ERROR] Failed to load runtime: " + String(e));
  }
}

/**
 * Execute command from command.json
 */
function runCommand() {
  try {
    if (!fm.fileExists(COMMAND_FILE)) {
      return;
    }

    var cmdContent = fm.getFileContents(COMMAND_FILE);
    var cmd = JSON.parse(cmdContent);
    
    if (!cmd || !cmd.payload) {
      appendEvent({
        type: "error",
        ts: Date.now(),
        id: cmd.id || "unknown",
        message: "Invalid command format"
      });
      return;
    }

    var commandType = cmd.payload.type || cmd.payload.kind || "unknown";
    dprint("[INFO] Executing command: " + commandType);

    if (!runtimeFn) {
      appendEvent({
        type: "error",
        ts: Date.now(),
        id: cmd.id,
        message: "Runtime not loaded"
      });
      return;
    }

    // Execute runtime with payload
    var result = runtimeFn(cmd.payload, ipc, dprint);

    appendEvent({
      type: "result",
      ts: Date.now(),
      id: cmd.id,
      ok: true,
      value: result
    });

    dprint("[OK] Command executed successfully");

  } catch (e) {
    appendEvent({
      type: "error",
      ts: Date.now(),
      id: cmd && cmd.id ? cmd.id : "unknown",
      message: String(e),
      stack: String(e.stack || "")
    });
    dprint("[ERROR] Failed to execute command: " + String(e));
  }
}

/**
 * FileWatcher event handler
 */
function onFileChanged(src, args) {
  var path = args.path;
  
  // Debounce: wait a bit before reloading/running
  if (path === RUNTIME_FILE) {
    if (reloadTimer) clearTimeout(reloadTimer);
    reloadTimer = setTimeout(function() {
      loadRuntime();
    }, 100);
  }
  
  if (path === COMMAND_FILE) {
    if (commandTimer) clearTimeout(commandTimer);
    commandTimer = setTimeout(function() {
      runCommand();
    }, 100);
  }
}

/**
 * Main initialization
 */
function main() {
  dprint("=== PT Control Module Starting ===");
  
  try {
    // Get file manager and watcher
    fm = ipc.systemFileManager();
    fw = fm.getFileWatcher();

    // Ensure dev directory exists
    if (!fm.directoryExists(DEV_DIR)) {
      fm.makeDirectory(DEV_DIR);
      dprint("[INFO] Created dev directory: " + DEV_DIR);
    }

    // Clear events file on startup
    if (fm.fileExists(EVENTS_FILE)) {
      fm.writePlainTextToFile(EVENTS_FILE, "");
    }

    // Register file watcher
    fw.addPath(RUNTIME_FILE);
    fw.addPath(COMMAND_FILE);
    fw.registerEvent("fileChanged", null, onFileChanged);

    // Log init event
    appendEvent({ type: "init", ts: Date.now() });
    
    dprint("[OK] PT Control Module initialized");
    dprint("[INFO] Watching: " + DEV_DIR);
    dprint("[INFO] Runtime: " + RUNTIME_FILE);
    dprint("[INFO] Commands: " + COMMAND_FILE);
    dprint("[INFO] Events: " + EVENTS_FILE);

    // Load runtime if it exists
    if (fm.fileExists(RUNTIME_FILE)) {
      loadRuntime();
    }

  } catch (e) {
    dprint("[FATAL] Failed to initialize: " + String(e));
    appendEvent({
      type: "error",
      ts: Date.now(),
      message: "Failed to initialize module: " + String(e),
      stack: String(e.stack || "")
    });
  }
}

/**
 * Cleanup
 */
function cleanUp() {
  dprint("=== PT Control Module Stopping ===");
  
  if (reloadTimer) clearTimeout(reloadTimer);
  if (commandTimer) clearTimeout(commandTimer);
  
  appendEvent({ type: "log", ts: Date.now(), level: "info", message: "Module stopped" });
}
