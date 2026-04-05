// ============================================================================
// Main.js Template - PT Script Module (Fase 5)
// ============================================================================
// PIPELINE DURABLE: commands/, in-flight/, results/, dead-letter/, journal NDJSON
// ============================================================================

export const MAIN_JS_TEMPLATE = `
/**
 * PT Control V2 - Main Script Module (Fase 5)
 *
 * RESPONSABILIDADES (Pipeline Durable):
 * 1. Poll commands/*.json (en lugar de command.json)
 * 2. Claim por move (mover de commands/ a in-flight/)
 * 3. Mantener journal de comandos para recovery
 * 4. Soportar resultados inmediatos Y diferidos (IOS)
 * 5. Polling de jobs IOS hasta completar
 * 6. Hot reload seguro de runtime.js (solo sin jobs activos)
 * 7. Cleanup idempotente en stop
 * 8. Recovery de in-flight/ al iniciar
 * 9. Compatibilidad legacy con command.json
 */

// ============================================================================
// Directory Paths
// ============================================================================

var DEV_DIR = {{DEV_DIR_LITERAL}};
var RUNTIME_FILE = DEV_DIR + "/runtime.js";
var COMMANDS_DIR = DEV_DIR + "/commands";
var IN_FLIGHT_DIR = DEV_DIR + "/in-flight";
var RESULTS_DIR = DEV_DIR + "/results";
var DEAD_LETTER_DIR = DEV_DIR + "/dead-letter";
var LOGS_DIR = DEV_DIR + "/logs";
var HEARTBEAT_FILE = DEV_DIR + "/heartbeat.json";
var SESSIONS_DIR = DEV_DIR + "/sessions";
var JOURNAL_DIR = DEV_DIR + "/journal";
var PENDING_COMMANDS_FILE = JOURNAL_DIR + "/pending-commands.json";

// Legacy compatibility
var COMMAND_FILE = DEV_DIR + "/command.json";
var CURRENT_COMMAND_FILE = JOURNAL_DIR + "/current-command.json";

var fm = null;
var runtimeFn = null;

var commandPollInterval = null;
var heartbeatInterval = null;
var deferredPollInterval = null;

var lastCommandId = "";
var isShuttingDown = false;
var isRunning = false;

var pendingCommands = {};
var activeCommand = null;

var runtimeDirty = false;
var fw = null;
var watcherArmed = false;

// ---------------------------------------------------------------------------
// SAFETY GUARDS (crash hotfix)
// ---------------------------------------------------------------------------
// Packet Tracer watcher queda DESACTIVADO por defecto hasta validar estabilidad.
var ENABLE_FILE_WATCHER = false;
var WATCH_RUNTIME_FILE = false;
var WATCH_COMMANDS_DIR = false;

var cleanupStage = "idle";

// ============================================================================
// Main Entry Point
// ============================================================================

function main() {
  dprint("[PT] Starting...");
  
  try {
    isShuttingDown = false;
    isRunning = true;
    
    fm = ipc.systemFileManager();
    
    ensureDir(DEV_DIR);
    ensureDir(COMMANDS_DIR);
    ensureDir(IN_FLIGHT_DIR);
    ensureDir(RESULTS_DIR);
    ensureDir(DEAD_LETTER_DIR);
    ensureDir(LOGS_DIR);
    ensureDir(SESSIONS_DIR);
    ensureDir(JOURNAL_DIR);
    
    // Migrar command.json legacy si existe
    migrateLegacyCommand();
    
    loadRuntime();
    recoverInFlightOnStartup();
    loadPendingCommands();
    
    heartbeatInterval = setInterval(writeHeartbeat, 5000);
    commandPollInterval = setInterval(pollCommandQueue, 250);
    deferredPollInterval = setInterval(pollDeferredCommands, 100);
    
    setupFileWatcher();
    writeHeartbeat();
    
    dprint("[PT] Ready");
    
  } catch (e) {
    dprint("[FATAL] " + String(e));
  }
}

// ============================================================================
// Legacy Migration (Fase 5 - Transición)
// ============================================================================

function migrateLegacyCommand() {
  try {
    if (fm.fileExists(COMMAND_FILE)) {
      var content = fm.getFileContents(COMMAND_FILE);
      if (content && content.trim().length > 0) {
        try {
          var cmd = JSON.parse(content);
          if (cmd && cmd.id && cmd.seq) {
            // Convertir a formato de cola
            var filename = padSeq(cmd.seq) + "-" + (cmd.payload && cmd.payload.type ? cmd.payload.type : "unknown") + ".json";
            var targetPath = COMMANDS_DIR + "/" + filename;
            fm.writePlainTextToFile(targetPath, JSON.stringify(cmd));
            dprint("[PT] Migrated legacy command.json to " + filename);
          }
        } catch (e) {
          dprint("[PT] Invalid legacy command.json - ignoring");
        }
      }
      // Limpiar archivo legacy
      try { fm.writePlainTextToFile(COMMAND_FILE, ""); } catch (e) {}
    }
  } catch (e) {
    dprint("[PT] Legacy migration error: " + String(e));
  }
}

function padSeq(n) {
  var s = String(n);
  while (s.length < 12) s = "0" + s;
  return s;
}

// ============================================================================
// Directory Management
// ============================================================================

function ensureDir(path) {
  try {
    if (!fm.directoryExists(path)) {
      fm.makeDirectory(path);
    }
  } catch (e) {
    dprint("[ensureDir] " + String(e));
  }
}

// ============================================================================
// File Watcher (for runtime hot reload nudge)
// ============================================================================

function setupFileWatcher() {
  if (!ENABLE_FILE_WATCHER) {
    dprint("[watcher] disabled by safety guard");
    return;
  }
  
  if (watcherArmed) {
    return;
  }
  
  try {
    if (!fm || typeof fm.getFileWatcher !== "function") {
      dprint("[watcher] SystemFileWatcher unavailable");
      return;
    }
    
    fw = fm.getFileWatcher();
    if (!fw) {
      dprint("[watcher] getFileWatcher returned null");
      return;
    }
    
    if (WATCH_RUNTIME_FILE) {
      try {
        if (!fw.addPath(RUNTIME_FILE)) {
          dprint("[watcher] addPath(runtime.js) returned false");
        }
      } catch (e1) {
        dprint("[watcher] addPath(runtime.js): " + String(e1));
      }
    }
    
    if (WATCH_COMMANDS_DIR) {
      try {
        if (!fw.addPath(COMMANDS_DIR)) {
          dprint("[watcher] addPath(commands/) returned false");
        }
      } catch (e2) {
        dprint("[watcher] addPath(commands/): " + String(e2));
      }
    }
    
    if (typeof fw.registerEvent === "function") {
      fw.registerEvent("fileChanged", null, onWatchedFileChanged);
      fw.registerEvent("directoryChanged", null, onWatchedDirChanged);
      watcherArmed = true;
      dprint("[watcher] armed");
    } else {
      dprint("[watcher] registerEvent unavailable");
    }
    
  } catch (e) {
    dprint("[watcher] " + String(e));
  }
}

function getWatchedPath(args) {
  if (!args) return "";
  if (typeof args === "string") return args;
  if (args.path) return args.path;
  return "";
}

function onWatchedFileChanged(src, args) {
  if (isShuttingDown || !isRunning) return;
  
  var path = getWatchedPath(args);
  if (path === RUNTIME_FILE) {
    runtimeDirty = true;
    dprint("[watcher] runtime.js changed");
  }
}

function onWatchedDirChanged(src, args) {
  if (isShuttingDown || !isRunning) return;
  if (!WATCH_COMMANDS_DIR) return;
  
  var path = getWatchedPath(args);
  if (path === COMMANDS_DIR) {
    dprint("[watcher] commands/ changed - nudge");
  }
}

function teardownFileWatcher() {
  if (!fw) {
    watcherArmed = false;
    return;
  }
  
  try {
    if (typeof fw.unregisterEvent === "function") {
      try { fw.unregisterEvent("fileChanged", null, onWatchedFileChanged); } catch (e1) {}
      try { fw.unregisterEvent("directoryChanged", null, onWatchedDirChanged); } catch (e2) {}
    }
    
    if (typeof fw.removePath === "function") {
      if (WATCH_RUNTIME_FILE) {
        try { fw.removePath(RUNTIME_FILE); } catch (e3) {}
      }
      if (WATCH_COMMANDS_DIR) {
        try { fw.removePath(COMMANDS_DIR); } catch (e4) {}
      }
    }
  } catch (e) {
    dprint("[watcher-teardown] " + String(e));
  }
  
  fw = null;
  watcherArmed = false;
}

function hasPendingDeferredCommands() {
  var key;
  for (key in pendingCommands) {
    if (pendingCommands.hasOwnProperty(key)) return true;
  }
  return false;
}

// ============================================================================
// Heartbeat
// ============================================================================

function writeHeartbeat() {
  try {
    fm.writePlainTextToFile(HEARTBEAT_FILE, JSON.stringify({
      ts: Date.now(),
      pid: "pt-main",
      running: isRunning,
      pending: Object.keys(pendingCommands).length,
      active: activeCommand ? activeCommand.id : null,
      queue: countQueueFiles()
    }));
  } catch (e) {
    // Silent fail
  }
}

function countQueueFiles() {
  try {
    var files = fm.getFilesInDirectory(COMMANDS_DIR);
    return files ? files.length : 0;
  } catch (e) {
    return 0;
  }
}

// ============================================================================
// Runtime Loading
// ============================================================================

function loadRuntime() {
  if (!fm.fileExists(RUNTIME_FILE)) {
    dprint("[PT] No runtime.js found");
    runtimeFn = null;
    return;
  }
  
  try {
    var code = fm.getFileContents(RUNTIME_FILE);
    if (!code || code.length < 50) {
      dprint("[PT] Runtime file too small");
      runtimeFn = null;
      return;
    }
    
    var testFn = new Function("payload", "ipc", "dprint", code);
    runtimeFn = testFn;
    dprint("[PT] Runtime loaded OK");
    runtimeDirty = false;
    
  } catch (e) {
    dprint("[PT] Runtime load error: " + String(e));
    runtimeFn = null;
  }
}

// ============================================================================
// Queue Operations (Fase 5)
// ============================================================================

/**
 * Lista archivos de comando en cola, ordenados por nombre (seq)
 */
function listQueuedCommandFiles() {
  try {
    var files = fm.getFilesInDirectory(COMMANDS_DIR);
    if (!files) return [];
    // Filtrar solo .json y ordenar
    var jsonFiles = [];
    for (var i = 0; i < files.length; i++) {
      if (files[i].indexOf(".json") !== -1) {
        jsonFiles.push(files[i]);
      }
    }
    jsonFiles.sort();
    return jsonFiles;
  } catch (e) {
    dprint("[queue] list error: " + String(e));
    return [];
  }
}

/**
 * Reclama el siguiente comando moviéndolo de commands/ a in-flight/
 * Usa moveSrcFileToDestFile() de SystemFileManager
 */
function claimNextCommand() {
  var files = listQueuedCommandFiles();
  
  for (var i = 0; i < files.length; i++) {
    var filename = files[i];
    var srcPath = COMMANDS_DIR + "/" + filename;
    var dstPath = IN_FLIGHT_DIR + "/" + filename;
    
    // Intentar claim por move
    var moved = false;
    try {
      // Verificar que existe
      if (!fm.fileExists(srcPath)) continue;
      
      // Mover a in-flight/
      fm.moveSrcFileToDestFile(srcPath, dstPath, false);
      moved = true;
      dprint("[PT] Claimed: " + filename);
    } catch (e) {
      // Otro proceso ya lo tomó o error
      continue;
    }
    
    if (moved) {
      try {
        var content = fm.getFileContents(dstPath);
        var cmd = JSON.parse(content);
        return { filename: filename, command: cmd };
      } catch (e) {
        dprint("[PT] Claimed file invalid: " + filename);
        // Mover a dead-letter
        moveToDeadLetter(dstPath, e);
      }
    }
  }
  
  return null;
}

/**
 * Mueve un archivo a dead-letter/
 */
function moveToDeadLetter(filePath, error) {
  try {
    var basename = filePath.split("/").pop() || "unknown";
    var timestamp = String(Date.now());
    var dlPath = DEAD_LETTER_DIR + "/" + timestamp + "-" + basename;
    fm.moveSrcFileToDestFile(filePath, dlPath, false);
    // Escribir error info
    fm.writePlainTextToFile(dlPath + ".error.json", JSON.stringify({
      originalFile: basename,
      error: String(error),
      movedAt: Date.now()
    }));
    dprint("[PT] Moved to dead-letter: " + basename);
  } catch (e) {
    dprint("[PT] Dead-letter error: " + String(e));
  }
}

// ============================================================================
// Recovery on Startup (Fase 5)
// ============================================================================

function recoverInFlightOnStartup() {
  try {
    if (!fm.directoryExists(IN_FLIGHT_DIR)) return;
    
    var files = fm.getFilesInDirectory(IN_FLIGHT_DIR);
    if (!files || files.length === 0) {
      dprint("[PT] No in-flight to recover");
      return;
    }
    
    var recovered = 0;
    var cleaned = 0;
    
    for (var i = 0; i < files.length; i++) {
      var filename = files[i];
      if (filename.indexOf(".json") === -1) continue;
      
      var inFlightPath = IN_FLIGHT_DIR + "/" + filename;
      
      // Extraer cmdId del filename
      var seq = filename.split("-")[0];
      var cmdId = "cmd_" + padSeq(parseInt(seq, 10));
      var resultPath = RESULTS_DIR + "/" + cmdId + ".json";
      
      // Si ya existe resultado, limpiar in-flight
      if (fm.fileExists(resultPath)) {
        try {
          fm.removeFile(inFlightPath);
          cleaned++;
        } catch (e) {}
        dprint("[PT] Cleaned in-flight (result exists): " + filename);
      } else {
        // Re-queue: mover de vuelta a commands/
        var cmdPath = COMMANDS_DIR + "/" + filename;
        try {
          var content = fm.getFileContents(inFlightPath);
          var cmd = JSON.parse(content);
          cmd.attempt = (cmd.attempt || 1) + 1;
          if (cmd.attempt <= 3) {
            fm.writePlainTextToFile(cmdPath, JSON.stringify(cmd));
            fm.removeFile(inFlightPath);
            recovered++;
            dprint("[PT] Requeued: " + filename + " attempt=" + cmd.attempt);
          } else {
            // Max retries - escribir resultado fallido
            var failResult = {
              protocolVersion: 2,
              id: cmdId,
              seq: cmd.seq,
              completedAt: Date.now(),
              status: "failed",
              ok: false,
              error: {
                code: "MAX_RETRIES",
                message: "Command failed after " + cmd.attempt + " attempts",
                phase: "execute"
              }
            };
            fm.writePlainTextToFile(resultPath, JSON.stringify(failResult));
            fm.removeFile(inFlightPath);
            dprint("[PT] Max retries: " + filename);
          }
        } catch (e) {
          // Archivo corrupto - mover a dead-letter
          moveToDeadLetter(inFlightPath, e);
        }
      }
    }
    
    dprint("[PT] Recovery done: " + recovered + " requeued, " + cleaned + " cleaned");
    
  } catch (e) {
    dprint("[PT] Recovery error: " + String(e));
  }
}

// ============================================================================
// Pending Commands Persistence
// ============================================================================

function savePendingCommands() {
  try {
    fm.writePlainTextToFile(PENDING_COMMANDS_FILE, JSON.stringify(pendingCommands));
  } catch (e) {
    dprint("[journal] save pending error: " + String(e));
  }
}

function loadPendingCommands() {
  if (!fm.fileExists(PENDING_COMMANDS_FILE)) return;
  
  try {
    var content = fm.getFileContents(PENDING_COMMANDS_FILE);
    if (content && content.trim().length > 0) {
      pendingCommands = JSON.parse(content);
      dprint("[journal] restored " + Object.keys(pendingCommands).length + " pending commands");
    }
  } catch (e) {
    dprint("[journal] load pending error: " + String(e));
  }
}

// ============================================================================
// Command Polling (Queue-based - Fase 5)
// ============================================================================

function pollCommandQueue() {
  if (!isRunning || isShuttingDown) return;
  if (activeCommand !== null) return;
  
  // Claim siguiente comando
  var claimed = claimNextCommand();
  if (!claimed) return;
  
  activeCommand = claimed.command;
  lastCommandId = claimed.command.id;
  
  executeActiveCommand();
}

function executeActiveCommand() {
  if (!activeCommand) return;
  
  var startedAt = Date.now();
  var cmd = activeCommand;
  
  // Hot reload: only if no pending jobs
  if (runtimeDirty && !hasPendingDeferredCommands()) {
    loadRuntime();
  }
  
  var result;
  try {
    result = runtimeFn
      ? runtimeFn(cmd.payload, ipc, dprint)
      : { ok: false, error: "Runtime not loaded" };
  } catch (e) {
    result = { ok: false, error: String(e), stack: String(e.stack || "") };
  }
  
  // Check for deferred result
  if (result && result.deferred === true) {
    pendingCommands[cmd.id] = {
      id: cmd.id,
      ticket: result.ticket,
      kind: result.kind || "ios",
      startedAt: startedAt,
      payloadType: cmd.payload.type,
      command: cmd,
      filename: cmd.seq + "-" + cmd.payload.type + ".json"
    };
    savePendingCommands();
    dprint("[PT] Deferred: " + cmd.payload.type + " [" + cmd.id + "] ticket=" + result.ticket);
    
    // Limpiar in-flight (el job está en progreso)
    try {
      var inFlightPath = IN_FLIGHT_DIR + "/" + (cmd.seq + "-" + cmd.payload.type + ".json");
      if (fm.fileExists(inFlightPath)) {
        fm.removeFile(inFlightPath);
      }
    } catch (e) {}
    
    activeCommand = null;
    return;
  }
  
  // Immediate result - escribir resultado final
  writeResultEnvelope(cmd.id, {
    protocolVersion: 2,
    id: cmd.id,
    seq: cmd.seq,
    startedAt: startedAt,
    completedAt: Date.now(),
    status: result && result.ok !== false ? "completed" : "failed",
    ok: result && result.ok !== false,
    value: result
  });
  
  // Limpiar in-flight
  try {
    var inFlightPath = IN_FLIGHT_DIR + "/" + (cmd.seq + "-" + cmd.payload.type + ".json");
    if (fm.fileExists(inFlightPath)) {
      fm.removeFile(inFlightPath);
    }
  } catch (e) {}
  
  activeCommand = null;
  dprint("[PT] Executed: " + cmd.payload.type + " [" + cmd.id + "]");
}

// ============================================================================
// Result Writing (Safe - write to .tmp then final)
// ============================================================================

function writeResultEnvelope(id, envelope) {
  var finalPath = RESULTS_DIR + "/" + id + ".json";
  var tmpPath = finalPath + ".tmp";
  
  try {
    fm.writePlainTextToFile(tmpPath, JSON.stringify(envelope));
    fm.writePlainTextToFile(finalPath, JSON.stringify(envelope));
    fm.writePlainTextToFile(tmpPath, "");
  } catch (e) {
    dprint("[PT] Write result error: " + String(e));
  }
}

// ============================================================================
// Deferred Commands Polling
// ============================================================================

function pollDeferredCommands() {
  if (!isRunning || isShuttingDown) return;
  
  var pendingKeys = Object.keys(pendingCommands);
  if (pendingKeys.length === 0) return;
  
  // Hot reload check
  if (runtimeDirty && !hasPendingDeferredCommands()) {
    loadRuntime();
  }
  
  for (var i = 0; i < pendingKeys.length; i++) {
    var key = pendingKeys[i];
    var pending = pendingCommands[key];
    
    var pollResult;
    try {
      pollResult = runtimeFn
        ? runtimeFn({ type: "__pollDeferred", ticket: pending.ticket }, ipc, dprint)
        : { done: true, ok: false, error: "Runtime not loaded" };
    } catch (e) {
      dprint("[PT] Poll error: " + String(e));
      continue;
    }
    
    if (!pollResult || pollResult.done !== true) {
      continue;
    }
    
    // Job completado
    var envelope = {
      protocolVersion: 2,
      id: pending.id,
      seq: pending.command ? pending.command.seq : 0,
      startedAt: pending.startedAt,
      completedAt: Date.now(),
      status: pollResult.ok ? "completed" : "failed",
      ok: !!pollResult.ok,
      value: pollResult.ok ? pollResult.value : {
        ok: false,
        error: pollResult.error || "Deferred command failed",
        code: pollResult.code || "UNKNOWN"
      }
    };
    
    writeResultEnvelope(pending.id, envelope);
    
    delete pendingCommands[key];
    savePendingCommands();
    
    // Limpiar in-flight si existe
    if (pending.filename) {
      try {
        var inFlightPath = IN_FLIGHT_DIR + "/" + pending.filename;
        if (fm.fileExists(inFlightPath)) {
          fm.removeFile(inFlightPath);
        }
      } catch (e) {}
    }
    
    dprint("[PT] Deferred completed: " + pending.id + " status=" + envelope.status);
  }
}

// ============================================================================
// Cleanup (Idempotent)
// ============================================================================

function invokeRuntimeCleanupHook() {
  if (!runtimeFn) return;
  
  try {
    runtimeFn({ type: "__cleanup__" }, ipc, dprint);
  } catch (e) {
    // Hook best-effort: no interrumpir stop
    dprint("[PT] Runtime cleanup hook ignored: " + String(e));
  }
}

function cleanUp() {
  if (isShuttingDown) return;
  isShuttingDown = true;
  isRunning = false;
  
  dprint("[PT] Stopping...");
  
  try {
    cleanupStage = "clear-command-poll";
    if (commandPollInterval) {
      clearInterval(commandPollInterval);
      commandPollInterval = null;
    }
    
    cleanupStage = "clear-deferred-poll";
    if (deferredPollInterval) {
      clearInterval(deferredPollInterval);
      deferredPollInterval = null;
    }
    
    cleanupStage = "clear-heartbeat";
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }
    
    cleanupStage = "teardown-watcher";
    // IMPORTANTE: desregistrar watcher ANTES de soltar referencia
    teardownFileWatcher();
    
    cleanupStage = "save-pending";
    savePendingCommands();
    
    cleanupStage = "runtime-cleanup-hook";
    // Preparar futuro detach de listeners del runtime
    invokeRuntimeCleanupHook();
    
  } catch (e) {
    dprint("[cleanUp:" + cleanupStage + "] " + String(e));
  }
  
  runtimeFn = null;
  activeCommand = null;
  pendingCommands = {};
  
  dprint("[PT] Stopped");
}
`;