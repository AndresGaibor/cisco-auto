/**
 * TEMPLATE FRAGMENTS FOR RUNTIME MAIN.JS
 * 
 * Fragmentos reutilizables para el template main.js
 */

export const TEMPLATE_HELPERS = `
// ============================================================================
// Helper Functions
// ============================================================================

function appendEvent(evt) {
  try {
    var line = JSON.stringify(evt) + "\\n";
    fm.appendToFile(EVENTS_FILE, line);
  } catch (e) {
    logError("appendEvent", e);
  }
}

function writeState(state) {
  try {
    var json = JSON.stringify(state, null, 2);
    fm.writeFile(STATE_FILE, json);
  } catch (e) {
    logError("writeState", e);
  }
}

function safeValue(getter, fallback) {
  try {
    return getter();
  } catch (e) {
    return fallback;
  }
}

function logError(context, error) {
  var timestamp = new Date().toISOString();
  var msg = "[" + timestamp + "] ERROR in " + context + ": " + error;
  try {
    fm.appendToFile(LOGS_DIR + "/errors.log", msg + "\\n");
  } catch (e) {
    // Silent fail
  }
}

function ensureDirectory(path) {
  try {
    if (!fm.directoryExists(path)) {
      fm.createDirectory(path);
    }
  } catch (e) {
    logError("ensureDirectory", e);
  }
}
`;

export const TEMPLATE_INITIALIZATION = `
// ============================================================================
// Initialization
// ============================================================================

function loadRuntime() {
  try {
    if (!fm.fileExists(RUNTIME_FILE)) {
      throw new Error("runtime.js not found at " + RUNTIME_FILE);
    }
    var code = fm.readFile(RUNTIME_FILE);
    eval(code);
    return true;
  } catch (e) {
    logError("loadRuntime", e);
    return false;
  }
}

function setupDirectories() {
  ensureDirectory(COMMANDS_DIR);
  ensureDirectory(IN_FLIGHT_DIR);
  ensureDirectory(RESULTS_DIR);
  ensureDirectory(LOGS_DIR);
  ensureDirectory(DEV_DIR + "/sessions");
}
`;

export const TEMPLATE_STATE_MANAGEMENT = `
// ============================================================================
// State Management
// ============================================================================

function generateSnapshot() {
  try {
    var devices = collectDevices();
    var snapshot = {
      timestamp: new Date().toISOString(),
      deviceCount: devices.length,
      devices: devices,
      version: "1.0"
    };
    return snapshot;
  } catch (e) {
    logError("generateSnapshot", e);
    return null;
  }
}

function collectDevices() {
  var devices = [];
  try {
    var list = pt.network.getDeviceList();
    for (var i = 0; i < list.length; i++) {
      var dev = list[i];
      devices.push({
        name: dev.getName(),
        type: dev.getDeviceType(),
        state: dev.getState()
      });
    }
  } catch (e) {
    logError("collectDevices", e);
  }
  return devices;
}

function writeHeartbeat() {
  try {
    var heartbeat = {
      timestamp: new Date().toISOString(),
      runtime: "main.js",
      status: "alive"
    };
    fm.writeFile(HEARTBEAT_PATH, JSON.stringify(heartbeat));
  } catch (e) {
    logError("writeHeartbeat", e);
  }
}
`;

export const TEMPLATE_COMMAND_EXECUTION = `
// ============================================================================
// Command Processing
// ============================================================================

function pickNextCommand() {
  try {
    var files = fm.listFiles(COMMANDS_DIR);
    if (!files || files.length === 0) return null;
    
    // Sort by name to ensure order
    files.sort();
    
    var cmdFile = files[0];
    var content = fm.readFile(COMMANDS_DIR + "/" + cmdFile);
    var cmd = JSON.parse(content);
    
    // Move to in-flight
    var inFlightPath = IN_FLIGHT_DIR + "/" + cmdFile;
    fm.writeFile(inFlightPath, content);
    fm.deleteFile(COMMANDS_DIR + "/" + cmdFile);
    
    return { id: cmdFile.replace(".json", ""), ...cmd };
  } catch (e) {
    logError("pickNextCommand", e);
    return null;
  }
}

function runCommand(cmd) {
  try {
    var result = {
      id: cmd.id,
      command: cmd.command,
      status: "executing",
      timestamp: new Date().toISOString()
    };
    
    // Execute command here
    result.output = "EXECUTED";
    result.status = "completed";
    
    // Write result
    var resultFile = RESULTS_DIR + "/" + cmd.id + ".json";
    fm.writeFile(resultFile, JSON.stringify(result));
    
    // Clean up in-flight
    fm.deleteFile(IN_FLIGHT_DIR + "/" + cmd.id + ".json");
    
    return result;
  } catch (e) {
    logError("runCommand", e);
    return null;
  }
}
`;
