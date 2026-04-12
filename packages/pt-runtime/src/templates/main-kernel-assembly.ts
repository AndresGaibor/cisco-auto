// ============================================================================
// Main.js Template - Kernel Mínimo / Runtime Lógica de Negocio
// ============================================================================
//
// PRINCIPIO: "main no sabe de negocio; runtime no sabe de lifecycle persistente"
//
// Responsabilidades de main:
//   1. Bootstrap y cleanup
//   2. Carga/recarga de runtime.js (hot reload seguro)
//   3. Cola durable (poll, claim, move)
//   4. Kernel mínimo de jobs diferidos (ejecuta planes, no conoce lógica)
//   5. Estado persistente (DEVICE_SESSIONS, ACTIVE_JOBS)
//   6. Resultados finales
//
// Responsabilidades de runtime:
//   1. Validar payloads
//   2. Decidir qué hacer con cada comando
//   3. Implementar handlers de dominio
//   4. Construir planes de ejecución (DeferredJobPlan)
//   5. Parsear resultados
//   6. Toda la lógica de negocio
//
// Contrato: runtimeFn(payload, api) donde api es inyectado por main
// ============================================================================

export const MAIN_JS_TEMPLATE = `
/**
 * PT Control V2 - Main Script Module (Kernel)
 *
 * Arquitectura: main = kernel estable, runtime = lógica recargable
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

// ============================================================================
// File Manager & Runtime Reference
// ============================================================================

var fm = null;
var runtimeFn = null;

// ============================================================================
// Polling Intervals
// ============================================================================

var commandPollInterval = null;
var deferredPollInterval = null;
var heartbeatInterval = null;

// ============================================================================
// State Variables
// ============================================================================

var lastCommandId = "";
var isShuttingDown = false;
var isRunning = false;

var activeCommand = null;
var activeCommandFilename = null;
var runtimeLastMtime = 0;

// ============================================================================
// Kernel State - Persistent across hot reloads
// ============================================================================

// Jobs activos ejecutándose actualmente
var ACTIVE_JOBS = {};

// Sesiones de terminal por dispositivo
var DEVICE_SESSIONS = {};

// ============================================================================
// Cleanup State
// ============================================================================

var cleanupStage = "idle";

// ============================================================================
// Main Entry Point
// ============================================================================

function main() {
  dprint("[PT] Starting kernel...");

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
  dprint("[LEASE] Waiting for bridge lease...");

  var leaseWaitInterval = null;

  function checkLeaseAndActivate() {
    if (!isRunning || isShuttingDown) {
      if (leaseWaitInterval) clearInterval(leaseWaitInterval);
      return;
    }

    if (validateBridgeLease()) {
      dprint("[LEASE] Valid lease detected");
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
    dprint("[PT] Kernel already active");
    return;
  }

  dprint("[PT] Activating kernel...");

  loadRuntime();

  commandPollInterval = setInterval(pollCommandQueue, 250);
  deferredPollInterval = setInterval(pollDeferredJobs, 100);
  heartbeatInterval = setInterval(writeHeartbeat, 1000);

  dprint("[PT] Kernel ready");
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

    dprint("[LEASE] Valid (ownerId=" + lease.ownerId.substring(0, 8) + "...)");
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
// Runtime Loading with Hot Reload Support
// ============================================================================

function loadRuntime() {
  if (!fm.fileExists(RUNTIME_FILE)) {
    dprint("[PT] No runtime.js found");
    runtimeFn = null;
    return;
  }

  try {
    var mtime = getFileMtime(RUNTIME_FILE);
    if (mtime === runtimeLastMtime && runtimeFn) {
      return;
    }

    var code = fm.getFileContents(RUNTIME_FILE);
    if (!code || code.length < 50) {
      dprint("[PT] Runtime file too small");
      runtimeFn = null;
      return;
    }

    runtimeFn = new Function("payload", "api", code);
    runtimeLastMtime = mtime;
    dprint("[PT] Runtime loaded OK (mtime=" + mtime + ")");

  } catch (e) {
    dprint("[PT] Runtime load error: " + String(e));
    runtimeFn = null;
  }
}

function getFileMtime(path) {
  try {
    return fm.getFileModificationTime ? fm.getFileModificationTime(path) : 0;
  } catch (e) {
    return 0;
  }
}

function reloadRuntimeIfNeeded() {
  var currentMtime = getFileMtime(RUNTIME_FILE);
  if (currentMtime === runtimeLastMtime) {
    return;
  }

  var hasActiveJobs = false;
  for (var jobId in ACTIVE_JOBS) {
    if (ACTIVE_JOBS.hasOwnProperty(jobId) && !ACTIVE_JOBS[jobId].finished) {
      hasActiveJobs = true;
      break;
    }
  }

  if (hasActiveJobs) {
    dprint("[PT] Runtime changed but jobs active, deferring reload");
    return;
  }

  dprint("[PT] Reloading runtime (mtime changed)...");
  loadRuntime();
}

// ============================================================================
// Runtime API - Injected into runtime
// ============================================================================

function createRuntimeApi() {
  var net = ipc.getNetwork ? ipc.getNetwork() : null;
  var lw = ipc.getLogicalWorkspace ? ipc.getLogicalWorkspace() : null;

  return {
    ipc: ipc,
    dprint: dprint,
    getDeviceByName: function(name) {
      if (!net) return null;
      var dev = net.getDevice(name);
      if (!dev) return null;
      return {
        name: dev.getName(),
        hasTerminal: !!dev.getCommandLine(),
        getTerminal: function() { return dev.getCommandLine(); },
        getNetwork: function() { return net; }
      };
    },
    listDevices: function() {
      if (!net) return [];
      var names = [];
      var count = net.getDeviceCount ? net.getDeviceCount() : 0;
      for (var i = 0; i < count; i++) {
        var dev = net.getDeviceAt(i);
        if (dev && dev.getName) names.push(dev.getName());
      }
      return names;
    },
    querySessionState: function(deviceName) {
      var session = DEVICE_SESSIONS[deviceName];
      if (!session) return null;
      return {
        mode: session.lastMode || "",
        prompt: session.lastPrompt || "",
        paging: session.paged || false,
        awaitingConfirm: false
      };
    },
    getWorkspace: function() { return lw; },
    now: function() { return Date.now(); },
    safeJsonClone: function(data) {
      try { return JSON.parse(JSON.stringify(data)); }
      catch (e) { return data; }
    },
    normalizePortName: function(name) {
      return String(name || "").replace(/\\s+/g, "").toLowerCase();
    }
  };
}

// ============================================================================
// Queue Operations
// ============================================================================

function listQueuedCommandFiles() {
  try {
    // Buscar en AMBOS directorios: COMMANDS_DIR (legacy) e IN_FLIGHT_DIR (FileBridge)
    var jsonFiles = [];
    
    //Buscar en COMMANDS_DIR (legacy)
    try {
      var files = fm.getFilesInDirectory(COMMANDS_DIR);
      if (files) {
        for (var i = 0; i < files.length; i++) {
          if (files[i].indexOf(".json") !== -1) {
            jsonFiles.push(files[i]);
          }
        }
      }
    } catch (e) {}
    
    // Buscar en IN_FLIGHT_DIR (FileBridge V2)
    try {
      var files = fm.getFilesInDirectory(IN_FLIGHT_DIR);
      if (files) {
        for (var i = 0; i < files.length; i++) {
          var fname = files[i];
          if (fname.indexOf(".json") !== -1 && jsonFiles.indexOf(fname) === -1) {
            jsonFiles.push(fname);
          }
        }
      }
    } catch (e) {}
    
    jsonFiles.sort();
    if (jsonFiles.length > 0) {
      dprint("[queue] Found " + jsonFiles.length + " commands: " + jsonFiles.join(", "));
    }
    return jsonFiles;
  } catch (e) {
    dprint("[queue] list error: " + String(e));
    return [];
  }
}

function countQueueFiles() {
  var count = 0;
  try {
    // Contar ambos directorios
    try {
      var files = fm.getFilesInDirectory(COMMANDS_DIR);
      if (files) count += files.length;
    } catch (e) {}
    try {
      var files = fm.getFilesInDirectory(IN_FLIGHT_DIR);
      if (files) count += files.length;
    } catch (e) {}
    return count;
  } catch (e) {
    return 0;
  }
}

// ============================================================================
// Heartbeat
// ============================================================================

function writeHeartbeat() {
  try {
    var hbPath = DEV_DIR + "/heartbeat.json";
    var hb = {
      ts: Date.now(),
      running: isRunning,
      activeCommand: activeCommand ? activeCommand.id : null,
      queued: countQueueFiles()
    };
    fm.writePlainTextToFile(hbPath, JSON.stringify(hb));
  } catch (e) {
    dprint("[heartbeat] Error: " + String(e));
  }
}

function claimNextCommand() {
  var files = listQueuedCommandFiles();

  for (var i = 0; i < files.length; i++) {
    var filename = files[i];
    var srcPath = COMMANDS_DIR + "/" + filename;
    var dstPath = IN_FLIGHT_DIR + "/" + filename;

    var cmd = null;
    
    // Determinar la ruta correcta: IN_FLIGHT_DIR tiene prioridad
    var readPath = null;
    var writePath = null;
    try {
      if (fm.fileExists(dstPath)) {
        readPath = dstPath;
        writePath = null;
      } else if (fm.fileExists(srcPath)) {
        readPath = srcPath;
        writePath = dstPath;
      }
    } catch (e) {
      continue;
    }

    if (!readPath) continue;

    try {
      var content = fm.getFileContents(readPath);
      if (!content || content.length < 10) {
        dprint("[PT] Empty file: " + filename);
        continue;
      }
      cmd = JSON.parse(content);

      if (cmd && cmd.id) {
        writeCommandTracePatch(cmd.id, {
          id: cmd.id,
          seq: cmd.seq,
          type: cmd.payload && cmd.payload.type,
          claimedAt: Date.now()
        });
        
        //Mover a in-flight si veio de commands/
        if (writePath) {
          try {
            fm.moveSrcFileToDestFile(readPath, writePath, false);
            dprint("[PT] Moved to in-flight: " + filename);
          } catch (e) {
            // Si falla el move, eliminar el original para evitar re-reclamo
            dprint("[PT] Move failed, removing original: " + String(e));
            try { fm.removeFile(readPath); } catch(e2) {}
          }
        }
        
        dprint("[PT] Claimed: " + filename);
        return { filename: filename, command: cmd };
      }
    } catch (e) {
      dprint("[PT] Invalid command file: " + filename + " - " + String(e));
      if (readPath) moveToDeadLetter(readPath, e);
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

    var cmdIdMatch = basename.match(/cmd_(\\d+)/);
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

  reloadRuntimeIfNeeded();

  var claimed = claimNextCommand();
  if (!claimed) return;

  activeCommand = claimed.command;
  activeCommandFilename = claimed.filename;
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

  dprint("[PT] EXEC payload=" + JSON.stringify(cmd.payload).substring(0, 200));

  try {
    if (!runtimeFn) {
      result = { ok: false, error: "Runtime not loaded" };
      dprint("[PT] Runtime not loaded");
    } else {
      var api = createRuntimeApi();
      dprint("[PT] Calling runtime with payload.type=" + (cmd.payload && cmd.payload.type));
      result = runtimeFn(cmd.payload, api);
      dprint("[PT] Runtime returned: " + JSON.stringify(result).substring(0, 100));
    }
  } catch (e) {
    dprint("[PT] RUNTIME EXCEPTION: " + String(e));
    result = {
      ok: false,
      error: String(e),
      stack: String(e && e.stack ? e.stack : "")
    };
  }

  if (result && result.deferred && result.ticket) {
    dprint("[PT] Job deferred: " + result.ticket);
  }

  if (cmd && cmd.id) {
    writeCommandTracePatch(cmd.id, {
      runtimeCompletedAt: Date.now(),
      ok: result && result.ok !== false,
      deferred: result && result.deferred === true,
      ticket: result && result.ticket,
      error: result && result.ok === false ? result.error : undefined,
      queueStateAtEnd: { pending: countQueueFiles() }
    });
  }

  var status = "failed";
  if (result) {
    if (result.deferred) {
      status = "pending";
    } else if (result.ok !== false) {
      status = "completed";
    }
  }

  writeResultEnvelope(cmd.id, {
    protocolVersion: 3,
    id: cmd.id,
    seq: cmd.seq,
    startedAt: startedAt,
    completedAt: Date.now(),
    status: status,
    ok: result && result.ok !== false,
    value: result,
    jobId: result && result.ticket,
    device: cmd.payload && cmd.payload.device
  });

  cleanupActiveInFlight();

  if (!result || !result.deferred) {
    activeCommand = null;
    activeCommandFilename = null;
  }

  dprint("[PT] Executed: " + (cmd.payload && cmd.payload.type) + " [" + cmd.id + "]");
}

function cleanupActiveInFlight() {
  if (!activeCommandFilename) return;
  try {
    // Limpiar in-flight/
    var inFlightPath = IN_FLIGHT_DIR + "/" + activeCommandFilename;
    if (fm.fileExists(inFlightPath)) {
      fm.removeFile(inFlightPath);
      dprint("[PT] Cleaned up in-flight: " + activeCommandFilename);
    }
    // Limpiar commands/ por si quedó残留
    var commandsPath = COMMANDS_DIR + "/" + activeCommandFilename;
    if (fm.fileExists(commandsPath)) {
      fm.removeFile(commandsPath);
      dprint("[PT] Cleaned up commands: " + activeCommandFilename);
    }
  } catch (e) {
    dprint("[PT] Cleanup error: " + String(e));
  }
}

// ============================================================================
// Deferred Jobs Kernel - Minimal IOS Step Interpreter
// ============================================================================

function pollDeferredJobs() {
  if (!isRunning || isShuttingDown) return;

  for (var jobId in ACTIVE_JOBS) {
    if (!ACTIVE_JOBS.hasOwnProperty(jobId)) continue;
    var job = ACTIVE_JOBS[jobId];
    if (job.finished) continue;

    advanceJob(job);
  }
}

function advanceJob(job) {
  var deviceName = job.device;
  var session = DEVICE_SESSIONS[deviceName];

  if (!session || !session.term) {
    job.state = "error";
    job.error = "No terminal session for device: " + deviceName;
    job.finished = true;
    return;
  }

  var plan = job.plan;
  var currentStep = job.currentStep;

  if (currentStep >= plan.length) {
    job.finished = true;
    job.state = "completed";
    job.result = { ok: true, raw: job.outputBuffer };
    return;
  }

  var step = plan[currentStep];
  job.state = "step-" + step.type;

  switch (step.type) {
    case "ensure-mode":
      handleEnsureModeStep(job, session, step);
      break;
    case "command":
      handleCommandStep(job, session, step);
      break;
    case "confirm":
      handleConfirmStep(job, session, step);
      break;
    case "save-config":
      handleSaveConfigStep(job, session);
      break;
    case "delay":
      handleDelayStep(job, step);
      break;
    case "close-session":
      handleCloseSessionStep(job, session);
      break;
    default:
      job.error = "Unknown step type: " + step.type;
      job.state = "error";
      job.finished = true;
  }

  job.updatedAt = Date.now();
}

function handleEnsureModeStep(job, session, step) {
  var targetMode = step.value;
  var currentMode = session.lastMode || "";

  if (currentMode === targetMode) {
    job.currentStep++;
    return;
  }

  var transitionCmd = getModeTransitionCommand(currentMode, targetMode);
  if (!transitionCmd) {
    job.error = "Cannot transition from " + currentMode + " to " + targetMode;
    job.state = "error";
    job.finished = true;
    return;
  }

  var result = session.term.enterCommand(transitionCmd);
  job.outputBuffer += result[1] || "";
  updateSessionFromOutput(session, result[1] || "");

  if (session.lastMode === targetMode) {
    job.currentStep++;
  }
}

function getModeTransitionCommand(fromMode, toMode) {
  var transitions = {
    "user-exec": { "priv-exec": "enable", "config": "configure terminal" },
    "priv-exec": { "user-exec": "exit", "config": "configure terminal" },
    "config": { "priv-exec": "end", "user-exec": "exit" }
  };

  if (fromMode === toMode) return null;
  return transitions[fromMode] && transitions[fromMode][toMode];
}

function handleCommandStep(job, session, step) {
  var cmd = step.value;
  var options = step.options || {};

  job.waitingForCommandEnd = true;

  var result = session.term.enterCommand(cmd);
  var output = result[1] || "";
  var status = result[0];

  job.outputBuffer += output;
  updateSessionFromOutput(session, output);

  job.stepResults.push({
    stepIndex: job.currentStep,
    stepType: "command",
    command: cmd,
    raw: output,
    status: status,
    completedAt: Date.now()
  });

  if (status !== 0 && options.stopOnError) {
    job.error = "Command failed with status " + status;
    job.errorCode = "COMMAND_FAILED";
    job.state = "error";
    job.finished = true;
    return;
  }

  if (output.indexOf("--More--") !== -1) {
    session.paged = true;
    job.paged = true;
    session.term.enterCommand(" ");
    return;
  }

  if (output.indexOf("[confirm]") !== -1) {
    job.state = "waiting-confirm";
    return;
  }

  job.waitingForCommandEnd = false;
  job.currentStep++;
}

function handleConfirmStep(job, session, step) {
  var answer = step.value || "y";
  var result = session.term.enterCommand(answer);
  job.outputBuffer += result[1] || "";
  job.currentStep++;
}

function handleSaveConfigStep(job, session) {
  var result = session.term.enterCommand("write memory");
  job.outputBuffer += result[1] || "";
  job.currentStep++;
}

function handleDelayStep(job, step) {
  var delayMs = (step.value && parseInt(step.value)) || 1000;
  if (!job.stepStartTime) {
    job.stepStartTime = Date.now();
    job.state = "waiting-delay";
    return;
  }

  var elapsed = Date.now() - job.stepStartTime;
  if (elapsed >= delayMs) {
    job.stepStartTime = null;
    job.currentStep++;
  }
}

function handleCloseSessionStep(job, session) {
  job.finished = true;
  job.state = "completed";
  job.result = { ok: true, raw: job.outputBuffer };
}

function updateSessionFromOutput(session, output) {
  if (!output) return;

  session.lastOutputAt = Date.now();

  var lines = output.split("\\n");
  for (var i = lines.length - 1; i >= 0; i--) {
    var line = lines[i].trim();
    if (!line) continue;
    if (line.indexOf("--More--") !== -1) {
      session.paged = true;
      continue;
    }
    if (/\\#/.test(line) && !/\\(.+\\)#/.test(line)) {
      session.lastMode = "priv-exec";
      session.lastPrompt = "#";
      break;
    }
    if (/\\(.+\\)#/.test(line)) {
      session.lastMode = "config";
      session.lastPrompt = line;
      break;
    }
    if (/>$/.test(line)) {
      session.lastMode = "user-exec";
      session.lastPrompt = ">";
      break;
    }
  }
}

// ============================================================================
// Job Management
// ============================================================================

function createJob(plan) {
  var jobId = "job_" + Date.now() + "_" + Math.floor(Math.random() * 10000);

  var job = {
    id: jobId,
    device: plan.device,
    plan: plan,
    currentStep: 0,
    state: "pending",
    outputBuffer: "",
    startedAt: Date.now(),
    updatedAt: Date.now(),
    stepResults: [],
    lastMode: "user-exec",
    lastPrompt: ">",
    paged: false,
    waitingForCommandEnd: false,
    finished: false,
    result: null,
    error: null,
    errorCode: null
  };

  ACTIVE_JOBS[jobId] = job;

  var deviceName = plan.device;
  if (!DEVICE_SESSIONS[deviceName]) {
    initializeDeviceSession(deviceName);
  }

  var session = DEVICE_SESSIONS[deviceName];
  session.busyJobId = jobId;

  dprint("[JOB] Created " + jobId + " for device " + deviceName);

  return jobId;
}

function initializeDeviceSession(deviceName) {
  var net = ipc.getNetwork ? ipc.getNetwork() : null;
  var device = net ? net.getDevice(deviceName) : null;
  var term = device ? device.getCommandLine() : null;

  DEVICE_SESSIONS[deviceName] = {
    device: deviceName,
    term: term,
    listenersAttached: false,
    busyJobId: null,
    lastPrompt: ">",
    lastMode: "user-exec",
    lastOutputAt: 0,
    healthy: !!term
  };
}

function getJobState(ticket) {
  var job = ACTIVE_JOBS[ticket];
  if (!job) return null;

  if (job.finished) {
    return {
      done: true,
      ok: !job.error,
      result: job.result,
      error: job.error,
      errorCode: job.errorCode,
      output: job.outputBuffer
    };
  }

  return {
    done: false,
    state: job.state,
    currentStep: job.currentStep,
    totalSteps: job.plan.length,
    device: job.device,
    outputTail: job.outputBuffer.slice(-500)
  };
}

function completeJob(ticket, result) {
  var job = ACTIVE_JOBS[ticket];
  if (!job) return;

  job.finished = true;
  job.result = result;
  job.state = result.ok ? "completed" : "error";

  var session = DEVICE_SESSIONS[job.device];
  if (session) {
    session.busyJobId = null;
  }

  dprint("[JOB] Completed " + ticket + " with state: " + job.state);
}

function failJob(ticket, error, errorCode) {
  var job = ACTIVE_JOBS[ticket];
  if (!job) return;

  job.finished = true;
  job.error = error;
  job.errorCode = errorCode;
  job.state = "error";

  var session = DEVICE_SESSIONS[job.device];
  if (session) {
    session.busyJobId = null;
  }

  dprint("[JOB] Failed " + ticket + ": " + error);
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

  dprint("[PT] Stopping kernel...");

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

    markCleanup("clear-jobs");
    for (var jobId in ACTIVE_JOBS) {
      if (ACTIVE_JOBS.hasOwnProperty(jobId)) {
        ACTIVE_JOBS[jobId].finished = true;
        ACTIVE_JOBS[jobId].error = "CleanUp invoked";
      }
    }

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

  dprint("[PT] Kernel stopped");
}
`;
