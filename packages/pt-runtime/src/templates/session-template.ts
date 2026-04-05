/**
 * Runtime Session Template - Generates IOS session management section
 * Handles state persistence, cleanup, and session lifecycle
 * NOW INCLUDES: IOS Jobs system with event-based terminal listeners
 */

export function generateSessionTemplate(): string {
  return `// ============================================================================
// IOS Session State Management (with filesystem persistence)
// Tracks mode, paging, and confirmation state per device across commands
// Includes automatic cleanup to prevent memory leaks
// Sessions persist across PT hot-reloads via filesystem
// ============================================================================

var IOS_SESSIONS = {};
var SESSION_DIRTY = false;
var LAST_CLEANUP_TIME = 0;
var CLEANUP_INTERVAL_MS = 30000;
var SESSION_ACCESS_COUNT = 0;
var SESSION_MAX_AGE_MS = 300000;
var MAX_SESSIONS = 200;
var SESSIONS_FILE = DEV_DIR + "/sessions/ios-sessions.json";
var HEARTBEAT_FILE = DEV_DIR + "/sessions/heartbeat.json";

// ============================================================================
// IOS JOBS SYSTEM - New event-based architecture
// ============================================================================

var IOS_JOBS = {};
var IOS_JOB_SEQ = 0;

function createIosJob(type, payload) {
  IOS_JOB_SEQ++;
  var ticket = "ios_job_" + IOS_JOB_SEQ;
  
  IOS_JOBS[ticket] = {
    ticket: ticket,
    device: payload.device,
    type: type,
    payload: payload,
    steps: [],
    currentStep: 0,
    state: "queued",
    startedAt: Date.now(),
    updatedAt: Date.now(),
    output: "",
    outputs: [],
    status: null,
    modeBefore: "",
    modeAfter: "",
    paged: false,
    autoConfirmed: false,
    waitingForCommandEnd: false,
    finished: false,
    result: null,
    error: null,
    inputCommand: "",
    completeCommand: "",
    processedCommand: "",
    inputMode: ""
  };
  
  dprint("[Job] Created " + ticket + " for " + payload.device + " type=" + type);
  return ticket;
}

function buildConfigSteps(payload, session) {
  var steps = [];
  
  if (session.mode !== "priv-exec" && session.mode.indexOf("config") !== 0) {
    steps.push({ cmd: "enable", type: "transition", purpose: "privileged" });
  }
  
  if (session.mode.indexOf("config") !== 0) {
    steps.push({ cmd: "configure terminal", type: "transition", purpose: "config" });
  }
  
  var commands = payload.commands || [];
  for (var i = 0; i < commands.length; i++) {
    steps.push({ cmd: commands[i], type: "config", purpose: "command", index: i });
  }
  
  if (payload.writeMemory !== false) {
    steps.push({ cmd: "end", type: "transition", purpose: "exit-config" });
    steps.push({ cmd: "write memory", type: "exec", purpose: "save" });
  }
  
  return steps;
}

function buildExecSteps(payload, session) {
  var steps = [];
  
  if (payload.ensurePrivileged && session.mode !== "priv-exec" && session.mode.indexOf("config") !== 0) {
    steps.push({ cmd: "enable", type: "transition", purpose: "privileged" });
  }
  
  steps.push({ cmd: payload.command, type: "exec", purpose: "execute" });
  
  return steps;
}

function startIosJob(ticket) {
  var job = IOS_JOBS[ticket];
  if (!job) {
    dprint("[Job] Cannot start: job not found " + ticket);
    return;
  }
  
  var deviceName = job.device;
  var session = getOrCreateSession(deviceName, null);
  
  if (job.type === "configIos") {
    job.steps = buildConfigSteps({ commands: job.payload && job.payload.commands }, session);
  } else if (job.type === "execIos" || job.type === "execInteractive") {
    job.steps = buildExecSteps({ 
      command: job.payload && job.payload.command, 
      ensurePrivileged: job.payload && job.payload.ensurePrivileged 
    }, session);
  }
  
  job.state = "running";
  job.modeBefore = session.mode;
  job.startedAt = Date.now();
  
  dprint("[Job] Starting " + ticket + " with " + job.steps.length + " steps");
  
  kickIosJob(ticket);
}

function kickIosJob(ticket) {
  var job = IOS_JOBS[ticket];
  if (!job) return;
  
  if (job.state !== "running") return;
  if (job.waitingForCommandEnd) return;
  
  if (job.currentStep >= job.steps.length) {
    job.finished = true;
    job.state = "done";
    job.result = finalizeJobResult(job);
    dprint("[Job] Completed " + ticket + " with " + job.result.executedCount + " commands");
    return;
  }
  
  var step = job.steps[job.currentStep];
  var deviceName = job.device;
  
  var term = getCommandLine(deviceName);
  if (!term) {
    job.error = "CLI_UNAVAILABLE";
    job.finished = true;
    job.state = "error";
    job.result = {
      ok: false,
      code: "CLI_UNAVAILABLE",
      error: "TerminalLine not available for device " + deviceName
    };
    dprint("[Job] Error " + ticket + ": CLI unavailable for " + deviceName);
    return;
  }
  
  try {
    job.inputCommand = step.cmd;
    job.waitingForCommandEnd = true;
    job.inputMode = getOrCreateSession(deviceName, null).mode;
    
    term.enterCommand(step.cmd);
    
    dprint("[Job] Sent " + step.cmd + " to " + deviceName + " (step " + (job.currentStep + 1) + ")");
    
  } catch (e) {
    job.error = "COMMAND_SEND_ERROR";
    job.finished = true;
    job.state = "error";
    job.result = {
      ok: false,
      code: "COMMAND_SEND_ERROR",
      error: String(e)
    };
    dprint("[Job] Error sending command: " + String(e));
  }
}

function advanceIosJob(ticket, commandStatus) {
  var job = IOS_JOBS[ticket];
  if (!job) return;
  
  var step = job.steps[job.currentStep];
  var deviceName = job.device;
  var session = getOrCreateSession(deviceName, null);
  
  job.outputs.push({
    index: job.currentStep,
    command: step.cmd,
    status: commandStatus,
    output: job.output,
    modeBefore: job.inputMode,
    modeAfter: session.mode,
    paged: job.paged,
    autoConfirmed: job.autoConfirmed
  });
  
  job.output = "";
  job.paged = false;
  job.autoConfirmed = false;
  job.waitingForCommandEnd = false;
  
  if (commandStatus !== 0) {
    job.finished = true;
    job.state = "error";
    job.result = {
      ok: false,
      code: "COMMAND_FAILED",
      error: "Command failed with status " + commandStatus,
      failedCommand: step.cmd,
      executedCount: job.currentStep,
      results: job.outputs
    };
    dprint("[Job] Failed " + ticket + " at step " + job.currentStep + " status=" + commandStatus);
    return;
  }
  
  job.currentStep++;
  job.updatedAt = Date.now();
  
  kickIosJob(ticket);
}

function finalizeJobResult(job) {
  var deviceName = job.device;
  var session = getOrCreateSession(deviceName, null);
  
  var executedCount = 0;
  var failedCount = 0;
  
  for (var i = 0; i < job.outputs.length; i++) {
    if (job.outputs[i].status === 0) {
      executedCount++;
    } else {
      failedCount++;
    }
  }
  
  return {
    ok: failedCount === 0,
    device: deviceName,
    executedCount: executedCount,
    failedCount: failedCount,
    results: job.outputs,
    session: {
      mode: session.mode
    },
    source: "terminal"
  };
}

function pollIosJob(ticket) {
  var job = IOS_JOBS[ticket];
  
  if (!job) {
    return { done: true, ok: false, error: "Job not found: " + ticket };
  }
  
  if (!job.finished) {
    return { done: false, state: job.state };
  }
  
  if (job.state === "error") {
    return { 
      done: true, 
      ok: job.result && job.result.ok !== false,
      error: job.error,
      code: job.result && job.result.code,
      value: job.result
    };
  }
  
  return {
    done: true,
    ok: true,
    value: job.result
  };
}

// ============================================================================
// Terminal Listeners - Event-based architecture
// ============================================================================

var TERMINAL_LISTENERS_ATTACHED = {};
var TERMINAL_LISTENER_REFS = {};

function attachTerminalListeners(deviceName, term) {
  if (TERMINAL_LISTENERS_ATTACHED[deviceName]) {
    return;
  }
  
  try {
    // Crear funciones con closure para poder detach después
    var outputWrittenHandler = function(src, args) {
      onTerminalOutputWritten(deviceName, args);
    };
    
    var commandStartedHandler = function(src, args) {
      onTerminalCommandStarted(deviceName, args);
    };
    
    var commandEndedHandler = function(src, args) {
      onTerminalCommandEnded(deviceName, args);
    };
    
    var modeChangedHandler = function(src, args) {
      onTerminalModeChanged(deviceName, args);
    };
    
    var promptChangedHandler = function(src, args) {
      onTerminalPromptChanged(deviceName, args);
    };
    
    var moreDisplayedHandler = function(src, args) {
      onTerminalMoreDisplayed(deviceName, args);
    };
    
    // Usar registerEvent en lugar de .on() para compatibilidad con PT lifecycle
    if (typeof term.registerEvent === "function") {
      term.registerEvent("outputWritten", null, outputWrittenHandler);
      term.registerEvent("commandStarted", null, commandStartedHandler);
      term.registerEvent("commandEnded", null, commandEndedHandler);
      term.registerEvent("modeChanged", null, modeChangedHandler);
      term.registerEvent("promptChanged", null, promptChangedHandler);
      term.registerEvent("moreDisplayed", null, moreDisplayedHandler);
      
      // Guardar referencias para poder detach
      TERMINAL_LISTENER_REFS[deviceName] = {
        term: term,
        handlers: {
          outputWritten: outputWrittenHandler,
          commandStarted: commandStartedHandler,
          commandEnded: commandEndedHandler,
          modeChanged: modeChangedHandler,
          promptChanged: promptChangedHandler,
          moreDisplayed: moreDisplayedHandler
        }
      };
      
      TERMINAL_LISTENERS_ATTACHED[deviceName] = true;
      dprint("[Listeners] Attached to " + deviceName + " via registerEvent");
    } else {
      dprint("[Listeners] registerEvent not available for " + deviceName);
    }
    
  } catch (e) {
    dprint("[Listeners] Failed to attach to " + deviceName + ": " + String(e));
  }
}

function detachTerminalListeners(deviceName) {
  if (!TERMINAL_LISTENERS_ATTACHED[deviceName]) {
    return;
  }
  
  var ref = TERMINAL_LISTENER_REFS[deviceName];
  if (!ref || !ref.term) {
    delete TERMINAL_LISTENERS_ATTACHED[deviceName];
    delete TERMINAL_LISTENER_REFS[deviceName];
    return;
  }
  
  try {
    var term = ref.term;
    var handlers = ref.handlers;
    
    if (typeof term.unregisterEvent === "function") {
      try { term.unregisterEvent("outputWritten", null, handlers.outputWritten); } catch (e1) {}
      try { term.unregisterEvent("commandStarted", null, handlers.commandStarted); } catch (e2) {}
      try { term.unregisterEvent("commandEnded", null, handlers.commandEnded); } catch (e3) {}
      try { term.unregisterEvent("modeChanged", null, handlers.modeChanged); } catch (e4) {}
      try { term.unregisterEvent("promptChanged", null, handlers.promptChanged); } catch (e5) {}
      try { term.unregisterEvent("moreDisplayed", null, handlers.moreDisplayed); } catch (e6) {}
      
      dprint("[Listeners] Detached from " + deviceName);
    }
  } catch (e) {
    dprint("[Listeners] Failed to detach from " + deviceName + ": " + String(e));
  }
  
  delete TERMINAL_LISTENERS_ATTACHED[deviceName];
  delete TERMINAL_LISTENER_REFS[deviceName];
}

function detachAllTerminalListeners() {
  var devices = Object.keys(TERMINAL_LISTENERS_ATTACHED);
  for (var i = 0; i < devices.length; i++) {
    detachTerminalListeners(devices[i]);
  }
  dprint("[Listeners] Detached all terminal listeners");
}

function onTerminalOutputWritten(deviceName, args) {
  var jobKeys = Object.keys(IOS_JOBS);
  for (var i = 0; i < jobKeys.length; i++) {
    var job = IOS_JOBS[jobKeys[i]];
    if (job.device === deviceName && job.waitingForCommandEnd) {
      job.output += args.newOutput || "";
    }
  }
}

function onTerminalCommandStarted(deviceName, args) {
  var jobKeys = Object.keys(IOS_JOBS);
  for (var i = 0; i < jobKeys.length; i++) {
    var job = IOS_JOBS[jobKeys[i]];
    if (job.device === deviceName && job.waitingForCommandEnd) {
      job.inputCommand = args.inputCommand || "";
      job.completeCommand = args.completeCommand || "";
      job.processedCommand = args.processedCommand || "";
      job.inputMode = args.inputMode || "";
    }
  }
}

function onTerminalCommandEnded(deviceName, args) {
  var jobKeys = Object.keys(IOS_JOBS);
  for (var i = 0; i < jobKeys.length; i++) {
    var job = IOS_JOBS[jobKeys[i]];
    if (job.device === deviceName && job.waitingForCommandEnd) {
      var status = args.status;
      if (typeof status === "undefined" || status === null) {
        status = 0;
      }
      
      job.status = status;
      job.waitingForCommandEnd = false;
      
      advanceIosJob(job.ticket, status);
    }
  }
}

function onTerminalModeChanged(deviceName, args) {
  var session = IOS_SESSIONS[deviceName];
  if (session) {
    session.mode = args.newMode || session.mode;
    SESSION_DIRTY = true;
  }
}

function onTerminalPromptChanged(deviceName, args) {
  var session = IOS_SESSIONS[deviceName];
  if (session) {
    session.prompt = args.newPrompt || "";
  }
}

function onTerminalMoreDisplayed(deviceName, args) {
  var jobKeys = Object.keys(IOS_JOBS);
  for (var i = 0; i < jobKeys.length; i++) {
    var job = IOS_JOBS[jobKeys[i]];
    if (job.device === deviceName && job.waitingForCommandEnd) {
      job.paged = true;
      
      var term = getCommandLine(deviceName);
      if (term) {
        try {
          term.enterChar(32, 0);
        } catch (e) {}
      }
    }
  }
}

function ensureDeviceSession(deviceName) {
  var session = getOrCreateSession(deviceName, null);
  
  var term = getCommandLine(deviceName);
  if (term) {
    attachTerminalListeners(deviceName, term);
  }
  
  return session;
}

// ============================================================================
// EXISTING SESSION CODE - Preserved for compatibility
// ============================================================================

function isSessionStale() {
  try {
    if (!fm.fileExists(HEARTBEAT_FILE)) {
      return true;
    }
    var content = fm.getFileContents(HEARTBEAT_FILE);
    var heartbeat = JSON.parse(content);
    var age = Date.now() - heartbeat.ts;
    return age > 15000;
  } catch (e) {
    dprint("[Sessions] Heartbeat check failed, assuming stale: " + e);
    return true;
  }
}

function loadSessionsFromDisk() {
  try {
    if (isSessionStale()) {
      dprint("[Sessions] Sessions are stale (PT was restarted), clearing ios-sessions.json");
      fm.writePlainTextToFile(SESSIONS_FILE, JSON.stringify({}));
      return;
    }

    if (fm.fileExists(SESSIONS_FILE)) {
      var content = fm.getFileContents(SESSIONS_FILE);
      var loaded = JSON.parse(content);
      var now = Date.now();
      var loadedCount = 0;

      for (var key in loaded) {
        if (loaded[key] && loaded[key].lastUsed && (now - loaded[key].lastUsed < SESSION_MAX_AGE_MS)) {
          IOS_SESSIONS[key] = loaded[key];
          loadedCount++;
        }
      }

      dprint("[Sessions] Loaded " + loadedCount + " sessions from disk");
    }
  } catch (e) {
    dprint("[Sessions] Failed to load from disk: " + e);
  }
}

function saveSessionsToDisk() {
  if (!SESSION_DIRTY) return;
  try {
    fm.writePlainTextToFile(SESSIONS_FILE, JSON.stringify(IOS_SESSIONS, null, 2));
    SESSION_DIRTY = false;
  } catch (e) {
    dprint("[Sessions] Failed to save to disk: " + e);
  }
}

function cleanupStaleSessions() {
  var now = Date.now();
  var timeSinceCleanup = now - LAST_CLEANUP_TIME;
  var shouldCleanupByTime = timeSinceCleanup >= CLEANUP_INTERVAL_MS;
  var shouldCleanupByCount = SESSION_ACCESS_COUNT >= 10;

  if (!shouldCleanupByTime && !shouldCleanupByCount) return;

  LAST_CLEANUP_TIME = now;
  SESSION_ACCESS_COUNT = 0;

  var keys = Object.keys(IOS_SESSIONS);
  var activeKeys = [];

  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    var session = IOS_SESSIONS[key];
    if (session && session.lastUsed) {
      var age = now - session.lastUsed;
      if (age > SESSION_MAX_AGE_MS) {
        delete IOS_SESSIONS[key];
        SESSION_DIRTY = true;
      } else {
        activeKeys.push(key);
      }
    } else {
      delete IOS_SESSIONS[key];
      SESSION_DIRTY = true;
    }
  }

  if (activeKeys.length > MAX_SESSIONS) {
    activeKeys.sort(function(a, b) {
      var aTime = IOS_SESSIONS[a] && IOS_SESSIONS[a].lastUsed || 0;
      var bTime = IOS_SESSIONS[b] && IOS_SESSIONS[b].lastUsed || 0;
      return aTime - bTime;
    });

    var toRemove = activeKeys.length - MAX_SESSIONS;
    for (var j = 0; j < toRemove; j++) {
      dprint("[Sessions] Evicting session for " + activeKeys[j] + " (LRU)");
      delete IOS_SESSIONS[activeKeys[j]];
      SESSION_DIRTY = true;
    }
  }

  if (SESSION_DIRTY) {
    try {
      fm.writePlainTextToFile(SESSIONS_FILE, JSON.stringify(IOS_SESSIONS, null, 2));
      SESSION_DIRTY = false;
    } catch (e) { dprint("[Sessions] Save failed: " + e); }
  }
}

function getOrCreateSession(deviceName, term) {
  if (Object.keys(IOS_SESSIONS).length === 0) {
    loadSessionsFromDisk();
  }

  SESSION_ACCESS_COUNT++;
  cleanupStaleSessions();

  if (!IOS_SESSIONS[deviceName]) {
    IOS_SESSIONS[deviceName] = {
      mode: "user-exec",
      paging: false,
      awaitingConfirm: false,
      deviceName: deviceName,
      lastUsed: Date.now(),
      createdAt: Date.now()
    };
    SESSION_DIRTY = true;
    saveSessionsToDisk();
  } else {
    IOS_SESSIONS[deviceName].lastUsed = Date.now();
  }

  return IOS_SESSIONS[deviceName];
}

function inferPromptMode(output) {
  var lastLine = "";
  var lines = output.split("\\n");
  for (var i = lines.length - 1; i >= 0; i--) {
    var line = lines[i].trim();
    if (line) {
      lastLine = line;
      break;
    }
  }

  if (/--More--/i.test(lastLine) || /\\x1B\\?D/.test(lastLine)) {
    return "paging";
  }
  if (/^\\[confirm\\]/i.test(lastLine)) {
    return "awaiting-confirm";
  }
  if (/^Password:/i.test(lastLine)) {
    return "awaiting-password";
  }

  var promptMatchers = [
    { pattern: /\\(config-router\\)#\\$/, mode: "config-router" },
    { pattern: /\\(config-line\\)#\\$/, mode: "config-line" },
    { pattern: /\\(config-if\\)#\\$/, mode: "config-if" },
    { pattern: /\\(config\\)#\\$/, mode: "config" },
    { pattern: /#\\$/, mode: "priv-exec" },
    { pattern: />\\$/, mode: "user-exec" },
  ];

  for (var i = 0; i < promptMatchers.length; i++) {
    if (promptMatchers[i].pattern.test(lastLine)) {
      return promptMatchers[i].mode;
    }
  }

  return "unknown";
}

function isPrivilegedMode(mode) {
  return mode === "priv-exec" || mode === "config" ||
         mode === "config-if" || mode === "config-line" || mode === "config-router";
}

function isConfigMode(mode) {
  return mode && mode.indexOf("config") === 0;
}
`;
}
