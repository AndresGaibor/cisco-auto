export function generateMainPipelineTemplate(): string {
  return String.raw`
// ============================================================================
// PT-Side Command Trace (Fase 8)
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

function readCommandTrace(cmdId) {
  try {
    var tracePath = COMMANDS_TRACE_DIR + "/" + cmdId + ".json";
    if (fm.fileExists(tracePath)) {
      var content = fm.getFileContents(tracePath);
      return JSON.parse(content);
    }
  } catch (e) {}
  return null;
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
      var seq = filename.split("-")[0];
      var cmdId = "cmd_" + padSeq(parseInt(seq, 10));
      var resultPath = RESULTS_DIR + "/" + cmdId + ".json";

      if (fm.fileExists(resultPath)) {
        try {
          fm.removeFile(inFlightPath);
          cleaned++;
        } catch (e) {}
        dprint("[PT] Cleaned in-flight (result exists): " + filename);
      } else {
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
          moveToDeadLetter(inFlightPath, e);
        }
      }
    }

    dprint("[PT] Recovery done: " + recovered + " requeued, " + cleaned + " cleaned");
  } catch (e) {
    dprint("[PT] Recovery error: " + String(e));
  }
}

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
      var restored = JSON.parse(content);
      
      // Limpiar pending commands con jobs que ya no existen
      // (el Script Module se reinició desde el último comando diferido)
      var validKeys = [];
      for (var key in restored) {
        var pending = restored[key];
        if (pending.ticket && IOS_JOBS[pending.ticket]) {
          validKeys.push(key);
        } else {
          dprint("[journal] dropping stale deferred: " + pending.id + " ticket=" + pending.ticket);
        }
      }
      
      // Mantener solo los válidos
      pendingCommands = {};
      for (var i = 0; i < validKeys.length; i++) {
        pendingCommands[validKeys[i]] = restored[validKeys[i]];
      }
      
      savePendingCommands();
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

  if (cmd && cmd.id) {
    writeCommandTracePatch(cmd.id, {
      runtimeStartedAt: startedAt,
      payloadType: cmd.payload && cmd.payload.type
    });
  }

  if (runtimeDirty && !hasPendingDeferredCommands()) {
    loadRuntime();
  }

  var result;
  try {
    result = runtimeFn
      ? runtimeFn(cmd.payload, ipc, dprint, IOS_JOBS)
      : { ok: false, error: "Runtime not loaded" };
  } catch (e) {
    result = { ok: false, error: String(e), stack: String(e.stack || "") };
  }

  if (cmd && cmd.id) {
    writeCommandTracePatch(cmd.id, {
      runtimeCompletedAt: Date.now(),
      ok: result && result.ok !== false,
      deferred: result && result.deferred === true,
      ticket: result ? result.ticket : undefined,
      error: result && result.ok === false ? result.error : undefined
    });
  }

  if (result && result.deferred === true) {
    dprint("[PT] Deferred result: ticket=" + result.ticket + " kind=" + (result.kind || "ios"));
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

    dprint("[PT] Calling startIosJob(" + result.ticket + ")");
    startIosJob(result.ticket);
    dprint("[PT] startIosJob returned");

    try {
      var inFlightPath = IN_FLIGHT_DIR + "/" + (cmd.seq + "-" + cmd.payload.type + ".json");
      if (fm.fileExists(inFlightPath)) {
        fm.removeFile(inFlightPath);
      }
    } catch (e) {}

    activeCommand = null;
    return;
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

  try {
    var inFlightPath = IN_FLIGHT_DIR + "/" + (cmd.seq + "-" + cmd.payload.type + ".json");
    if (fm.fileExists(inFlightPath)) {
      fm.removeFile(inFlightPath);
    }
  } catch (e) {}

  activeCommand = null;
  dprint("[PT] Executed: " + cmd.payload.type + " [" + cmd.id + "]");
}

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
// Deferred Commands Polling
// ============================================================================

function pollDeferredCommands() {
  if (!isRunning || isShuttingDown) return;

  checkIosJobTimeouts();

  var pendingKeys = Object.keys(pendingCommands);
  if (pendingKeys.length === 0) return;

  if (runtimeDirty && !hasPendingDeferredCommands()) {
    loadRuntime();
  }

  for (var i = 0; i < pendingKeys.length; i++) {
    var key = pendingKeys[i];
    var pending = pendingCommands[key];

    var pollResult;
    try {
      pollResult = runtimeFn
        ? runtimeFn({ type: "__pollDeferred", ticket: pending.ticket }, ipc, dprint, IOS_JOBS)
        : { done: true, ok: false, error: "Runtime not loaded" };
    } catch (e) {
      dprint("[PT] Poll error: " + String(e));
      continue;
    }

    if (!pollResult || pollResult.done !== true) {
      continue;
    }

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

    writeCommandTracePatch(pending.id, {
      deferredCompletedAt: Date.now(),
      finalStatus: envelope.status,
      ok: envelope.ok
    });

    delete pendingCommands[key];
    savePendingCommands();

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

`;
}
