// ============================================================================
// Main.js Template - Simplified (File Operations Only)
// ============================================================================
// main.js handles FILE OPERATIONS (claim, move, write result).
// Runtime handles LOGIC (IOS jobs, terminal listeners, etc).
// Main just passes commands to runtime and receives results.
// ============================================================================

export const MAIN_JS_TEMPLATE = `
/**
 * PT Control V2 - Main Script Module (Simplified)
 *
 * RESPONSABILIDADES:
 * 1. Poll commands/*.json (cola durable)
 * 2. Claim por move (mover de commands/ a in-flight/)
 * 3. Delegar ejecucion al runtime
 * 4. Escribir resultados a results/
 * 5. Trace logging para comandos
 * 6. Cleanup idempotente en stop
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
var COMMANDS_TRACE_DIR = LOGS_DIR + "/commands";
var CLEANUP_TRACE_FILE = DEV_DIR + "/cleanup-last-stage.txt";

var fm = null;
var runtimeFn = null;

var commandPollInterval = null;
var deferredPollInterval = null;
var heartbeatInterval = null;

var lastCommandId = "";
var isShuttingDown = false;
var isRunning = false;

var activeCommand = null;
var runtimeDirty = false;
var watcherArmed = false;

// ---------------------------------------------------------------------------
// SAFETY GUARDS
// ---------------------------------------------------------------------------
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
    ensureDir(COMMANDS_TRACE_DIR);

    // Phase 1: Lease-aware startup
    if (validateBridgeLease()) {
      activateRuntimeAfterLease();
    } else {
      startLeaseWaitLoop();
    }

  } catch (e) {
    dprint("[FATAL] " + String(e));
  }
}

// ============================================================================
// Lease-Aware Runtime Activation
// ============================================================================

function startLeaseWaitLoop() {
  dprint("[LEASE] No valid lease found - waiting for bridge...");

  var leaseWaitInterval = null;

  function checkLeaseAndActivate() {
    if (!isRunning || isShuttingDown) {
      if (leaseWaitInterval) clearInterval(leaseWaitInterval);
      return;
    }

    if (validateBridgeLease()) {
      dprint("[LEASE] Valid lease detected - activating runtime");
      if (leaseWaitInterval) {
        clearInterval(leaseWaitInterval);
        leaseWaitInterval = null;
      }
      activateRuntimeAfterLease();
    }
  }

  checkLeaseAndActivate();
  leaseWaitInterval = setInterval(checkLeaseAndActivate, 1000);
}

function activateRuntimeAfterLease() {
  if (commandPollInterval || deferredPollInterval || heartbeatInterval) {
    dprint("[PT] Runtime already active");
    return;
  }

  dprint("[PT] Activating runtime after lease acquired...");

  loadRuntime();

  commandPollInterval = setInterval(pollCommandQueue, 250);
  deferredPollInterval = setInterval(pollDeferredCommands, 100);

  dprint("[PT] Ready");
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
// Lease Validation
// ============================================================================

function validateBridgeLease() {
  try {
    var leaseFile = DEV_DIR + "/bridge-lease.json";
    if (!fm.fileExists(leaseFile)) {
      dprint("[LEASE] No lease file found");
      return false;
    }

    var content = fm.getFileContents(leaseFile);
    if (!content || content.trim().length === 0) {
      dprint("[LEASE] Lease file empty");
      return false;
    }

    var lease = JSON.parse(content);
    if (!lease.ownerId || !lease.expiresAt) {
      dprint("[LEASE] Lease invalid: missing ownerId or expiresAt");
      return false;
    }

    var now = Date.now();
    if (now > lease.expiresAt) {
      dprint("[LEASE] Lease expired at " + new Date(lease.expiresAt).toISOString());
      return false;
    }

    var ageMs = now - lease.updatedAt;
    if (ageMs > (lease.ttlMs * 2)) {
      dprint("[LEASE] Lease stale (age=" + ageMs + "ms, ttl=" + lease.ttlMs + "ms)");
      return false;
    }

    dprint("[LEASE] Lease valid (ownerId=" + lease.ownerId.substring(0, 8) + "..., expires_in=" + (lease.expiresAt - now) + "ms)");
    return true;
  } catch (e) {
    dprint("[LEASE] Validation error: " + String(e));
    return false;
  }
}

// ============================================================================
// Trace Logging
// ============================================================================

function writeCommandTracePatch(cmdId, patch) {
  try {
    var tracePath = COMMANDS_TRACE_DIR + "/" + cmdId + ".json";
    var existing = {};
    try {
      if (fm.fileExists(tracePath)) {
        var content = fm.getFileContents(tracePath);
        existing = JSON.parse(content) || {};
      }
    } catch (e) {}
    var updated = {};
    for (var k in existing) {
      if (existing.hasOwnProperty(k)) updated[k] = existing[k];
    }
    for (var k in patch) {
      if (patch.hasOwnProperty(k)) updated[k] = patch[k];
    }
    fm.writePlainTextToFile(tracePath, JSON.stringify(updated, null, 2));
  } catch (e) {
    dprint("[trace] write error: " + String(e));
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

    runtimeFn = new Function("payload", "ipc", "dprint", code);
    dprint("[PT] Runtime loaded OK");
    runtimeDirty = false;

  } catch (e) {
    dprint("[PT] Runtime load error: " + String(e));
    runtimeFn = null;
  }
}

// ============================================================================
// Queue Operations
// ============================================================================

function listQueuedCommandFiles() {
  try {
    var files = fm.getFilesInDirectory(COMMANDS_DIR);
    if (!files) return [];
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

function countQueueFiles() {
  try {
    var files = fm.getFilesInDirectory(COMMANDS_DIR);
    return files ? files.length : 0;
  } catch (e) {
    return 0;
  }
}

function claimNextCommand() {
  var files = listQueuedCommandFiles();

  for (var i = 0; i < files.length; i++) {
    var filename = files[i];
    var srcPath = COMMANDS_DIR + "/" + filename;
    var dstPath = IN_FLIGHT_DIR + "/" + filename;

    var moved = false;
    try {
      if (!fm.fileExists(srcPath)) continue;

      fm.moveSrcFileToDestFile(srcPath, dstPath, false);
      moved = true;
      dprint("[PT] Claimed: " + filename);
    } catch (e) {
      continue;
    }

    if (moved) {
      try {
        var content = fm.getFileContents(dstPath);
        var cmd = JSON.parse(content);

        if (cmd && cmd.id) {
          writeCommandTracePatch(cmd.id, {
            id: cmd.id,
            seq: cmd.seq,
            type: cmd.payload.type,
            claimedAt: Date.now()
          });
        }

        return { filename: filename, command: cmd };
      } catch (e) {
        dprint("[PT] Claimed file invalid: " + filename);
        moveToDeadLetter(dstPath, e);
      }
    }
  }

  return null;
}

function moveToDeadLetter(filePath, error) {
  try {
    var basename = filePath.split("/").pop() || "unknown";
    var timestamp = String(Date.now());
    var dlPath = DEAD_LETTER_DIR + "/" + timestamp + "-" + basename;
    fm.moveSrcFileToDestFile(filePath, dlPath, false);
    fm.writePlainTextToFile(dlPath + ".error.json", JSON.stringify({
      originalFile: basename,
      error: String(error),
      movedAt: Date.now()
    }));

    var cmdIdMatch = basename.match(/cmd_(\d+)/);
    if (cmdIdMatch) {
      writeCommandTracePatch("cmd_" + cmdIdMatch[1], {
        deadLetterAt: Date.now(),
        deadLetterReason: String(error)
      });
    }

    dprint("[PT] Moved to dead-letter: " + basename);
  } catch (e) {
    dprint("[PT] Dead-letter error: " + String(e));
  }
}

// ============================================================================
// Command Polling
// ============================================================================

function pollCommandQueue() {
  if (!isRunning || isShuttingDown) return;
  if (activeCommand !== null) return;

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
  var result = null;

  if (cmd && cmd.id) {
    writeCommandTracePatch(cmd.id, {
      runtimeStartedAt: startedAt,
      payloadType: cmd.payload && cmd.payload.type,
      queueStateAtStart: { pending: countQueueFiles() }
    });
  }

  if (runtimeDirty) {
    loadRuntime();
  }

  try {
    if (!runtimeFn) {
      result = { ok: false, error: "Runtime not loaded" };
    } else {
      result = runtimeFn(cmd.payload, ipc, dprint);
    }
  } catch (e) {
    result = {
      ok: false,
      error: String(e),
      stack: String(e && e.stack ? e.stack : "")
    };
  }

  if (cmd && cmd.id) {
    writeCommandTracePatch(cmd.id, {
      runtimeCompletedAt: Date.now(),
      ok: result && result.ok !== false,
      deferred: result && result.deferred === true,
      ticket: result ? result.ticket : undefined,
      error: result && result.ok === false ? result.error : undefined,
      queueStateAtEnd: { pending: countQueueFiles() }
    });
  }

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

  cleanupActiveInFlight(cmd);
  activeCommand = null;
  dprint("[PT] Executed: " + cmd.payload.type + " [" + cmd.id + "]");
}

function cleanupActiveInFlight(cmd) {
  try {
    var inFlightPath = IN_FLIGHT_DIR + "/" + (cmd.seq + "-" + cmd.payload.type + ".json");
    if (fm.fileExists(inFlightPath)) {
      fm.removeFile(inFlightPath);
    }
  } catch (e) {}
}

// ============================================================================
// Deferred Commands (delegated to runtime)
// ============================================================================

function pollDeferredCommands() {
  if (!isRunning || isShuttingDown) return;
  if (!runtimeFn) return;

  try {
    runtimeFn({ type: "__pollDeferred" }, ipc, dprint);
  } catch (e) {
    dprint("[PT] Deferred poll error: " + String(e));
  }
}

function hasPendingDeferredCommands() {
  if (!runtimeFn) return false;
  try {
    var result = runtimeFn({ type: "__hasPendingDeferred" }, ipc, dprint);
    return result && result.pending === true;
  } catch (e) {
    return false;
  }
}

// ============================================================================
// Result Writing
// ============================================================================

function writeResultEnvelope(id, envelope) {
  var finalPath = RESULTS_DIR + "/" + id + ".json";
  var tmpPath = finalPath + ".tmp";

  try {
    fm.writePlainTextToFile(tmpPath, JSON.stringify(envelope));
    fm.writePlainTextToFile(finalPath, JSON.stringify(envelope));
    fm.writePlainTextToFile(tmpPath, "");

    writeCommandTracePatch(id, {
      resultWrittenAt: Date.now(),
      resultPath: finalPath,
      status: envelope.status,
      ok: envelope.ok
    });
  } catch (e) {
    dprint("[PT] Write result error: " + String(e));
  }
}

// ============================================================================
// Cleanup
// ============================================================================

function markCleanup(stage) {
  cleanupStage = stage;
  try {
    if (fm) {
      fm.writePlainTextToFile(CLEANUP_TRACE_FILE, stage + " @" + Date.now());
    }
  } catch (e) {}
}

function cleanUp() {
  if (isShuttingDown) return;
  isShuttingDown = true;
  isRunning = false;

  dprint("[PT] Stopping...");

  try {
    markCleanup("clear-command-poll");
    if (commandPollInterval) {
      clearInterval(commandPollInterval);
      commandPollInterval = null;
    }

    markCleanup("clear-deferred-poll");
    if (deferredPollInterval) {
      clearInterval(deferredPollInterval);
      deferredPollInterval = null;
    }

    markCleanup("clear-heartbeat");
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }

    markCleanup("null-runtime");
    runtimeFn = null;

    if (activeCommand && activeCommand.id) {
      writeCommandTracePatch(activeCommand.id, {
        interruptedByCleanup: true,
        cleanupStage: cleanupStage
      });
    }

    activeCommand = null;

    markCleanup("done");

  } catch (e) {
    dprint("[cleanUp:" + cleanupStage + "] " + String(e));
  }

  dprint("[PT] Stopped");
}
`;
