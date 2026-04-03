// ============================================================================
// Main.js Template - PT Script Module (Ultra Simple)
// ============================================================================
// ONLY RESPONSIBILITY: React to commands, write heartbeat
// ALL complexity moved to file-bridge (TypeScript side)
// ============================================================================

export const MAIN_JS_TEMPLATE = `
/**
 * PT Control V2 - Main Script Module (Ultra Simple)
 *
 * ONLY RESPONSIBILITY:
 * 1. Poll command.json every 500ms
 * 2. Execute runtime(payload)
 * 3. Write result to results/<id>.json
 * 4. Write heartbeat every 5s
 *
 * ALL complexity is in file-bridge (TypeScript side)
 */

// Configuration
var DEV_DIR = {{DEV_DIR_LITERAL}};
var RUNTIME_FILE = DEV_DIR + "/runtime.js";
var COMMAND_FILE = DEV_DIR + "/command.json";
var RESULTS_DIR = DEV_DIR + "/results";
var HEARTBEAT_FILE = DEV_DIR + "/heartbeat.json";

// State
var fm = null;
var runtimeFn = null;
var lastCommandId = "";
var commandPollInterval = null;
var heartbeatInterval = null;

// ============================================================================
// Main Entry Point
// ============================================================================

function main() {
  dprint("[PT] Starting...");
  
  try {
    fm = ipc.systemFileManager();
    
    // Ensure directories exist
    if (!fm.directoryExists(DEV_DIR)) {
      fm.makeDirectory(DEV_DIR);
    }
    if (!fm.directoryExists(RESULTS_DIR)) {
      fm.makeDirectory(RESULTS_DIR);
    }
    
    // Load runtime
    loadRuntime();
    
    // Start heartbeat (every 5s)
    heartbeatInterval = setInterval(writeHeartbeat, 5000);
    writeHeartbeat(); // Immediate
    
    // Start command polling (every 500ms)
    commandPollInterval = setInterval(pollCommand, 500);
    
    dprint("[PT] Ready - polling for commands");
    
  } catch (e) {
    dprint("[FATAL] " + String(e));
  }
}

// ============================================================================
// Heartbeat
// ============================================================================

function writeHeartbeat() {
  try {
    fm.writePlainTextToFile(HEARTBEAT_FILE, JSON.stringify({
      ts: Date.now(),
      pid: "pt-main"
    }));
  } catch (e) {
    // Silent fail - heartbeat is best-effort
  }
}

// ============================================================================
// Runtime Loading
// ============================================================================

function loadRuntime() {
  if (!fm.fileExists(RUNTIME_FILE)) {
    dprint("[PT] No runtime.js found - will retry on next command");
    runtimeFn = null;
    return;
  }
  
  try {
    var code = fm.getFileContents(RUNTIME_FILE);
    if (!code || code.length < 50) {
      dprint("[PT] Runtime file too small - will retry");
      runtimeFn = null;
      return;
    }
    
    // Validate syntax (smoke test)
    var testFn = new Function("payload", "ipc", "dprint", code);
    runtimeFn = testFn;
    dprint("[PT] Runtime loaded OK");
    
  } catch (e) {
    dprint("[PT] Runtime load error: " + String(e));
    runtimeFn = null;
  }
}

// ============================================================================
// Command Polling
// ============================================================================

function pollCommand() {
  if (!fm.fileExists(COMMAND_FILE)) return;
  
  var content;
  try {
    content = fm.getFileContents(COMMAND_FILE);
  } catch (e) {
    return;
  }
  
  // Empty or whitespace
  if (!content || content.trim().length === 0) return;
  
  // Parse command
  var cmd;
  try {
    cmd = JSON.parse(content);
  } catch (e) {
    dprint("[PT] Invalid JSON in command.json");
    return;
  }
  
  // Validate command structure
  if (!cmd.id || !cmd.payload) {
    dprint("[PT] Invalid command structure");
    return;
  }
  
  // Skip already-processed commands
  if (cmd.id === lastCommandId) return;
  lastCommandId = cmd.id;
  
  // Acknowledge immediately (delete file)
  try {
    fm.writePlainTextToFile(COMMAND_FILE, "");
  } catch (e) {
    dprint("[PT] Failed to clear command.json");
    return;
  }
  
  // Execute runtime
  var result;
  var startedAt = Date.now();
  
  try {
    // Recargar siempre para evitar que PT ejecute una versión cacheada
    loadRuntime();
    
    result = runtimeFn
      ? runtimeFn(cmd.payload, ipc, dprint)
      : { ok: false, error: "Runtime not loaded" };
      
  } catch (e) {
    result = {
      ok: false,
      error: String(e),
      stack: String(e.stack || "")
    };
  }
  
  // Write result envelope
  var envelope = {
    id: cmd.id,
    startedAt: startedAt,
    completedAt: Date.now(),
    status: result && result.ok !== false ? "completed" : "failed",
    ok: result && result.ok !== false,
    value: result
  };
  
  try {
    fm.writePlainTextToFile(
      RESULTS_DIR + "/" + cmd.id + ".json",
      JSON.stringify(envelope)
    );
    dprint("[PT] Executed: " + cmd.payload.type + " [" + cmd.id + "]");
  } catch (e) {
    dprint("[PT] Failed to write result: " + String(e));
  }
}

// ============================================================================
// Cleanup
// ============================================================================

function cleanUp() {
  dprint("[PT] Stopping...");
  
  if (commandPollInterval) {
    clearInterval(commandPollInterval);
    commandPollInterval = null;
  }
  
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
  
  dprint("[PT] Stopped");
}
`;
