export function generateMainIosJobsTemplate(): string {
  return String.raw`
// ============================================================================
// IOS Job Execution - Starts deferred jobs
// ============================================================================

// ============================================================================
// IOS Job State Machine
// ============================================================================

function failIosJob(ticket, message, code) {
  var job = IOS_JOBS[ticket];
  if (!job) return;

  job.finished = true;
  job.waitingForCommandEnd = false;
  job.state = "error";
  job.error = message || "IOS job failed";
  job.errorCode = code || "IOS_JOB_FAILED";
  job.updatedAt = Date.now();

  job.result = {
    ok: false,
    error: job.error,
    code: job.errorCode,
    raw: job.currentCommandOutput || job.output || "",
    device: job.device,
    session: buildJobSessionSnapshot(job)
  };

  if (job.session) job.session.shuttingDown = true;

  dprint("[Job] Failed " + ticket + " code=" + job.errorCode + " message=" + job.error);
}

function getTerminalPolicy(job) {
  return job && job.terminalPolicy ? job.terminalPolicy : {};
}

function buildJobSessionSnapshot(job) {
  var session = job && job.session ? job.session : {};
  return {
    mode: job.lastMode || session.currentMode || "",
    prompt: job.lastPrompt || session.currentPrompt || "",
    paging: !!job.paged || !!session.waitingMore,
    awaitingConfirm: !!session.waitingConfirm,
    currentCommand: job.currentCommand || session.currentCommand || "",
    completeCommand: session.completeCommand || job.currentCommand || "",
    processedCommand: session.processedCommand || "",
    attached: !!session.attached,
    busy: !!session.busy,
    waitingMore: !!session.waitingMore,
    waitingConfirm: !!session.waitingConfirm,
    externalInteraction: !!job.externalInteraction,
    historyTouched: !!job.historyTouched,
    dirtyLineDetected: !!job.dirtyLineDetected,
    currentMode: session.currentMode || job.lastMode || "",
    currentPrompt: session.currentPrompt || job.lastPrompt || "",
    outputBuffer: session.outputBuffer || "",
    lastOutputTs: session.lastOutputTs || 0,
    shuttingDown: !!session.shuttingDown
  };
}

function createJobSession(job, term) {
  if (!job) return null;

  if (!job.session) {
    job.session = {
      deviceName: job.device,
      term: term || null,
      attached: false,
      currentMode: job.lastMode || "unknown",
      currentPrompt: job.lastPrompt || "",
      currentCommand: "",
      completeCommand: "",
      processedCommand: "",
      outputBuffer: "",
      lastOutputTs: 0,
      waitingMore: false,
      waitingConfirm: false,
      shuttingDown: false,
      busy: false,
      queue: [],
      job: job
    };
  }

  if (term) {
    job.session.term = term;
  }

  job.session.job = job;
  return job.session;
}

function syncJobSessionFromTerminal(job, term) {
  var session = createJobSession(job, term);
  if (!session || !term) return session;

  try { if (term.getPrompt) session.currentPrompt = String(term.getPrompt() || session.currentPrompt); } catch (e1) {}
  try { if (term.getMode) session.currentMode = String(term.getMode() || session.currentMode); } catch (e2) {}
  return session;
}

function readTerminalInput(term) {
  try {
    if (term && typeof term.getCommandInput === "function") {
      return String(term.getCommandInput() || "");
    }
  } catch (e) {}
  return "";
}

function isNormalPrompt(prompt, mode) {
  var p = String(prompt || "");
  var m = String(mode || "");
  if (!p) return false;
  return /\(config[^\)]*\)#\s*$/.test(p) ||
    /#\s*$/.test(p) ||
    />\s*$/.test(p) ||
    /config/i.test(m) ||
    /priv/i.test(m);
}

function classifyTerminalState(prompt, mode, currentInput, output) {
  var p = String(prompt || "");
  var m = String(mode || "");
  var i = String(currentInput || "");
  var o = String(output || "");

  if (!isNormalPrompt(p, m) && /initial configuration dialog/i.test(o)) return "setup-dialog";
  if (/continue with configuration dialog\?/i.test(o)) return "continue-dialog";
  if (/terminate autoinstall/i.test(o)) return "autoinstall-dialog";
  if (/password\s*:/i.test(o)) return "password-prompt";
  if (/\[confirm\]/i.test(o)) return "confirm-prompt";
  if (/\[yes\/no\]/i.test(o)) return "yes-no-prompt";
  if (/--More--/i.test(o)) return "pager";
  if (i && i.length > 0) return "dirty-line";
  if (/\(config[^\)]*\)#\s*$/.test(p) || /config/i.test(m)) return "config";
  if (/#\s*$/.test(p) || /priv/i.test(m)) return "priv";
  if (/>\s*$/.test(p) || />$/.test(p)) return "user";
  return "unknown";
}

function normalizeTerminalSession(job) {
  var term = getIosJobTerm(job);
  var policy = getTerminalPolicy(job);
  var session = createJobSession(job, term);
  var prompt = "";
  var mode = "";
  var input = "";
  var output = job.currentCommandOutput || job.output || "";
  var state = "unknown";
  var attempts = 0;

  if (!term) return false;

  try { if (term.getPrompt) prompt = String(term.getPrompt() || ""); } catch (e1) {}
  try { if (term.getMode) mode = String(term.getMode() || ""); } catch (e2) {}
  if (session) {
    session.currentPrompt = prompt || session.currentPrompt;
    session.currentMode = mode || session.currentMode;
  }
  input = readTerminalInput(term);
  state = classifyTerminalState(prompt, mode, input, output);

  while (attempts < 3) {
    if (state === "setup-dialog") {
      if (policy.dismissInitialDialog === false || job.dismissInitialDialog === false) {
        failIosJob(job.ticket, "Initial configuration dialog is blocking CLI", "INITIAL_DIALOG_BLOCKING");
        return true;
      }
      try {
        term.enterCommand("no");
        job.autoConfirmed = true;
        if (session) session.waitingConfirm = false;
        attempts++;
      } catch (e3) {
        failIosJob(job.ticket, "Failed to dismiss initial configuration dialog: " + String(e3), "INITIAL_DIALOG_STUCK");
        return true;
      }
    } else if (state === "continue-dialog") {
      try {
        term.enterCommand("no");
        job.continueDialogHandled = true;
        if (session) session.waitingConfirm = false;
        attempts++;
      } catch (e4) {
        failIosJob(job.ticket, "Failed to dismiss continue dialog: " + String(e4), "CONTINUE_DIALOG_STUCK");
        return true;
      }
    } else if (state === "autoinstall-dialog") {
      var answer = policy.terminateAutoinstall || "auto";
      if (answer === "auto") answer = "yes";
      try {
        if (answer === "enter") {
          if (typeof term.enterChar === "function") term.enterChar(13, 0);
          else term.enterCommand("");
        } else {
          term.enterCommand(answer);
        }
        job.autoinstallHandled = true;
        if (session) session.waitingConfirm = false;
        attempts++;
      } catch (e5) {
        failIosJob(job.ticket, "Failed to handle autoinstall prompt: " + String(e5), "AUTOINSTALL_PROMPT_STUCK");
        return true;
      }
    } else if (state === "pager") {
      if (policy.autoAdvancePager === false) {
        failIosJob(job.ticket, "Paging is blocked by policy", "PAGER_STALLED");
        return true;
      }
      try {
        if (typeof term.enterChar === "function") term.enterChar(32, 0);
        else term.enterCommand(" ");
        job.paged = true;
        if (session) session.waitingMore = false;
        job.lastActivityAt = Date.now();
        attempts++;
      } catch (e6) {
        failIosJob(job.ticket, "Failed to advance pager: " + String(e6), "PAGER_ERROR");
        return true;
      }
    } else if (state === "dirty-line") {
      if (policy.clearDirtyLine === false) {
        failIosJob(job.ticket, "Dirty terminal line detected", "TERMINAL_DIRTY");
        return true;
      }
      try {
        if (typeof term.enterChar === "function") {
          term.enterChar(21, 0);
          term.enterChar(13, 0);
        } else {
          term.enterCommand("");
        }
        job.dirtyLineDetected = true;
        attempts++;
      } catch (e7) {
        failIosJob(job.ticket, "Failed to clear dirty line: " + String(e7), "TERMINAL_DIRTY");
        return true;
      }
    } else {
      break;
    }

    try { if (term.getPrompt) prompt = String(term.getPrompt() || ""); } catch (e8) {}
    try { if (term.getMode) mode = String(term.getMode() || ""); } catch (e9) {}
    input = readTerminalInput(term);
    state = classifyTerminalState(prompt, mode, input, output);
  }

  if (state === "dirty-line" && policy.clearDirtyLine !== false) {
    failIosJob(job.ticket, "Dirty terminal line detected", "TERMINAL_DIRTY");
    return true;
  }

  if (input && input.length > 0) {
    job.externalInteraction = true;
    if (policy.failOnExternalInteraction === true) {
      failIosJob(job.ticket, "External terminal interaction detected", "TERMINAL_INTERFERENCE");
      return true;
    }
    try {
      if (typeof term.enterChar === "function") {
        term.enterChar(21, 0);
        term.enterChar(13, 0);
      } else {
        term.enterCommand("");
      }
    } catch (e10) {
      failIosJob(job.ticket, "External terminal interaction detected", "TERMINAL_INTERFERENCE");
      return true;
    }
  }

  return false;
}

function containsInitialDialog(output) {
  if (!output) return false;
  return /initial configuration dialog/i.test(output);
}

function containsContinueDialog(output) {
  if (!output) return false;
  return /continue with configuration dialog/i.test(output);
}

function containsAutoinstallPrompt(output) {
  if (!output) return false;
  return /terminate autoinstall/i.test(output);
}

function containsConfirmPrompt(output) {
  if (!output) return false;
  return /\[confirm\]/i.test(output);
}

function containsPager(output) {
  if (!output) return false;
  return /--More--/i.test(output);
}

function handleTerminalPrompt(job, raw, phaseBefore) {
  var policy = getTerminalPolicy(job);
  var promptLooksNormal = isNormalPrompt(job.lastPrompt, job.lastMode);

  if (!promptLooksNormal && containsInitialDialog(raw)) {
    if (policy.dismissInitialDialog === false || job.dismissInitialDialog === false) {
      failIosJob(job.ticket, "Initial configuration dialog is blocking CLI", "INITIAL_DIALOG_BLOCKING");
      return true;
    }

    if (job.dialogDismissAttempts >= 1) {
      failIosJob(job.ticket, "Initial configuration dialog could not be dismissed", "INITIAL_DIALOG_STUCK");
      return true;
    }

    job.dialogDismissAttempts++;
    job.autoConfirmed = true;
    job.resumePhase = phaseBefore;
    job.resumeStep = job.currentStep;
    sendIosJobCommand(job.ticket, "no", "dismiss-initial-dialog");
    return true;
  }

  if (containsContinueDialog(raw)) {
    if (policy.dismissInitialDialog === false) {
      failIosJob(job.ticket, "Continue dialog is blocking CLI", "INITIAL_DIALOG_BLOCKING");
      return true;
    }

    sendIosJobCommand(job.ticket, "no", "dismiss-continue-dialog");
    return true;
  }

  if (containsAutoinstallPrompt(raw)) {
    var answer = policy.terminateAutoinstall || "auto";
    if (answer === "auto") answer = "yes";
    if (answer === "enter") {
      if (job && job.commandTerm) {
        try { job.commandTerm.enterChar(13, 0); } catch (e1) {}
      }
    } else if (answer === "yes" || answer === "no") {
      sendIosJobCommand(job.ticket, answer, "dismiss-autoinstall-dialog");
    } else {
      sendIosJobCommand(job.ticket, "yes", "dismiss-autoinstall-dialog");
    }
    return true;
  }

  if (containsPager(raw)) {
    if (policy.autoAdvancePager === false) {
      failIosJob(job.ticket, "Paging is blocked by policy", "PAGER_STALLED");
      return true;
    }
    if (job.commandTerm && typeof job.commandTerm.enterChar === "function") {
      try {
        job.commandTerm.enterChar(32, 0);
        job.paged = true;
        job.lastActivityAt = Date.now();
        return true;
      } catch (e2) {
        failIosJob(job.ticket, "Failed to advance pager: " + String(e2), "PAGER_ERROR");
        return true;
      }
    }
  }

  if (containsConfirmPrompt(raw)) {
    if (policy.allowConfirmPrompts === false) {
      failIosJob(job.ticket, "Confirmation prompt is not allowed by policy", "CONFIRMATION_REQUIRED");
      return true;
    }
    if (job.commandTerm && typeof job.commandTerm.enterChar === "function") {
      try {
        job.commandTerm.enterChar(13, 0);
        job.lastActivityAt = Date.now();
        return true;
      } catch (e3) {
        failIosJob(job.ticket, "Failed to answer confirmation: " + String(e3), "CONFIRMATION_REQUIRED");
        return true;
      }
    }
  }

  return false;
}

function completeIosJob(ticket) {
  var job = IOS_JOBS[ticket];
  if (!job) return;

  job.finished = true;
  job.waitingForCommandEnd = false;
  job.state = "done";
  job.updatedAt = Date.now();

  if (!job.result) {
    job.result = {
      ok: true,
      device: job.device,
      raw: job.output || "",
      outputs: job.stepResults || [],
      session: buildJobSessionSnapshot(job)
    };
  }

  if (job.session) job.session.shuttingDown = true;

  dprint("[Job] Completed " + ticket);
}

function sendIosJobCommand(ticket, command, phase) {
  var job = IOS_JOBS[ticket];
  var term = getIosJobTerm(job);

  if (!job) return;
  if (!term) {
    failIosJob(ticket, "Terminal not available", "NO_TERMINAL");
    return;
  }

  job.phase = phase;
  job.state = phase;
  job.currentCommand = command;
  job.currentCommandOutput = "";
  job.commandTerm = term;
  createJobSession(job, term);
  job.waitingForCommandEnd = true;
  job.abortSent = false;
  job.currentCommandStartedAt = Date.now();
  job.lastActivityAt = Date.now();
  job.updatedAt = Date.now();

  dprint("[Job] " + ticket + " phase=" + phase + " cmd=" + command);

  if (normalizeTerminalSession(job)) {
    issueIosJobPhase(ticket);
    return;
  }

  try {
    term.enterCommand(command);
  } catch (e) {
    failIosJob(ticket, "Command execution error: " + String(e), "COMMAND_EXECUTION_ERROR");
  }
}

function issueIosJobPhase(ticket) {
  var job = IOS_JOBS[ticket];
  var nextCommand;

  if (!job || job.finished) return;

  if (job.phase === "ensure-privileged") {
    if (isPrivExecPrompt(job.lastPrompt, job.lastMode) || isConfigPrompt(job.lastPrompt, job.lastMode)) {
      job.phase = (job.type === "configIos") ? "ensure-config" : "run-exec";
      issueIosJobPhase(ticket);
      return;
    }
    sendIosJobCommand(ticket, "enable", "ensure-privileged");
    return;
  }

  if (job.phase === "ensure-config") {
    if (isConfigPrompt(job.lastPrompt, job.lastMode)) {
      job.phase = "run-config";
      issueIosJobPhase(ticket);
      return;
    }
    sendIosJobCommand(ticket, "configure terminal", "ensure-config");
    return;
  }

  if (job.phase === "run-exec") {
    nextCommand = job.steps[0];
    if (!nextCommand) {
      failIosJob(ticket, "Missing exec command", "NO_EXEC_COMMAND");
      return;
    }
    sendIosJobCommand(ticket, nextCommand, "run-exec");
    return;
  }

  if (job.phase === "run-config") {
    if (job.currentStep >= job.steps.length) {
      job.phase = "exit-config";
      issueIosJobPhase(ticket);
      return;
    }
    nextCommand = job.steps[job.currentStep];
    sendIosJobCommand(ticket, nextCommand, "run-config");
    return;
  }

  if (job.phase === "exit-config") {
    if (isPrivExecPrompt(job.lastPrompt, job.lastMode)) {
      if (job.payload && job.payload.save !== false) {
        job.phase = "save-config";
        issueIosJobPhase(ticket);
      } else {
        job.output = joinStepOutputs(job.stepResults);
        job.result = {
          ok: true,
          device: job.device,
          executed: job.stepResults.length,
          results: job.stepResults,
          raw: job.output,
          source: "terminal",
          session: buildJobSessionSnapshot(job)
        };
        completeIosJob(ticket);
      }
      return;
    }
    sendIosJobCommand(ticket, "end", "exit-config");
    return;
  }

  if (job.phase === "save-config") {
    sendIosJobCommand(ticket, "write memory", "save-config");
    return;
  }
}

function startIosJob(ticket) {
  var job = IOS_JOBS[ticket];
  var term;

  dprint("[Job] startIosJob called: " + ticket);

  if (!job) {
    dprint("[Job] Cannot start: job not found " + ticket);
    return;
  }

  dprint("[Job] Job found, current state=" + job.state + " phase=" + (job.phase || "none"));

  try {
    term = getIosJobTerm(job);
  } catch (e) {
    dprint("[Job] ERROR getting terminal: " + String(e));
    failIosJob(ticket, "Terminal error: " + String(e), "TERMINAL_ERROR");
    return;
  }
  dprint("[Job] Terminal for " + job.device + ": " + (term ? "available" : "NOT AVAILABLE"));
  
  if (!term) {
    failIosJob(ticket, "Device has no terminal", "NO_TERMINAL");
    return;
  }

  attachTerminalListeners(job.device, term);
  createJobSession(job, term);
  if (job.session) job.session.attached = true;

  job.steps = [];
  if (job.type === "configIos") {
    job.steps = job.payload && job.payload.commands ? job.payload.commands.slice(0) : [];
  } else if (job.type === "execIos") {
    if (job.payload && job.payload.command) {
      job.steps = [job.payload.command];
    }
  }

  try { job.lastPrompt = term.getPrompt ? (term.getPrompt() || "") : ""; } catch (e1) {}
  try { job.lastMode = term.getMode ? (term.getMode() || "") : ""; } catch (e2) {}
  syncJobSessionFromTerminal(job, term);

  job.phase = (job.ensurePrivileged === false && job.type === "execIos")
    ? "run-exec"
    : "ensure-privileged";

  job.state = "starting";
  job.updatedAt = Date.now();
  job.lastActivityAt = Date.now();

  dprint("[Job] Starting " + ticket + " phase=" + job.phase + " steps=" + job.steps.length);
  issueIosJobPhase(ticket);
}

function checkIosJobTimeouts() {
  var jobKeys = Object.keys(IOS_JOBS);
  var now = Date.now();
  var i;
  var job;
  var term;

  for (i = 0; i < jobKeys.length; i++) {
    job = IOS_JOBS[jobKeys[i]];
    if (!job || job.finished || !job.waitingForCommandEnd) continue;

    if ((now - job.lastActivityAt) < job.commandTimeoutMs) continue;

    term = getIosJobTerm(job);

    if (!job.abortSent && term && typeof term.enterChar === "function") {
      try {
        term.enterChar(3, 0);
        job.abortSent = true;
        job.lastActivityAt = Date.now();
        dprint("[Job] Timeout detected, sent Ctrl+C for " + job.ticket);
        continue;
      } catch (e) {}
    }

    failIosJob(job.ticket, "IOS command timeout: " + job.currentCommand, "COMMAND_TIMEOUT");
  }
}

// ============================================================================
// Terminal Listeners Functions (Migrated from runtime.js)
// ============================================================================

function attachTerminalListeners(deviceName, term) {
  if (TERMINAL_LISTENERS_ATTACHED[deviceName]) {
    return;
  }

  try {
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

    var directiveSentHandler = function(src, args) {
      onTerminalDirectiveSent(deviceName, args);
    };

    var historySelectedHandler = function(src, args) {
      onTerminalCommandSelectedFromHistory(deviceName, args);
    };

    var autoCompletedHandler = function(src, args) {
      onTerminalCommandAutoCompleted(deviceName, args);
    };

    var cursorPositionChangedHandler = function(src, args) {
      onTerminalCursorPositionChanged(deviceName, args);
    };

    if (typeof term.registerEvent === "function") {
      term.registerEvent("commandStarted", null, commandStartedHandler);
      term.registerEvent("outputWritten", null, outputWrittenHandler);
      term.registerEvent("commandEnded", null, commandEndedHandler);
      term.registerEvent("modeChanged", null, modeChangedHandler);
      term.registerEvent("promptChanged", null, promptChangedHandler);
      term.registerEvent("moreDisplayed", null, moreDisplayedHandler);
      if (typeof term.registerEvent === "function") {
        try { term.registerEvent("directiveSent", null, directiveSentHandler); } catch (e0) {}
        try { term.registerEvent("commandSelectedFromHistory", null, historySelectedHandler); } catch (e1) {}
        try { term.registerEvent("commandAutoCompleted", null, autoCompletedHandler); } catch (e2) {}
        try { term.registerEvent("cursorPositionChanged", null, cursorPositionChangedHandler); } catch (e3) {}
      }

      TERMINAL_LISTENER_REFS[deviceName] = {
        term: term,
        handlers: {
          commandStarted: commandStartedHandler,
          outputWritten: outputWrittenHandler,
          commandEnded: commandEndedHandler,
          modeChanged: modeChangedHandler,
          promptChanged: promptChangedHandler,
          moreDisplayed: moreDisplayedHandler,
          directiveSent: directiveSentHandler,
          commandSelectedFromHistory: historySelectedHandler,
          commandAutoCompleted: autoCompletedHandler,
          cursorPositionChanged: cursorPositionChangedHandler
        }
      };

      TERMINAL_LISTENERS_ATTACHED[deviceName] = true;
      dprint("[Listeners] Attached to " + deviceName);
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
      try { term.unregisterEvent("commandStarted", null, handlers.commandStarted); } catch (e0) {}
      try { term.unregisterEvent("outputWritten", null, handlers.outputWritten); } catch (e1) {}
      try { term.unregisterEvent("commandEnded", null, handlers.commandEnded); } catch (e2) {}
      try { term.unregisterEvent("modeChanged", null, handlers.modeChanged); } catch (e3) {}
      try { term.unregisterEvent("promptChanged", null, handlers.promptChanged); } catch (e4) {}
      try { term.unregisterEvent("moreDisplayed", null, handlers.moreDisplayed); } catch (e5) {}
      try { term.unregisterEvent("directiveSent", null, handlers.directiveSent); } catch (e6) {}
      try { term.unregisterEvent("commandSelectedFromHistory", null, handlers.commandSelectedFromHistory); } catch (e7) {}
      try { term.unregisterEvent("commandAutoCompleted", null, handlers.commandAutoCompleted); } catch (e8) {}
      try { term.unregisterEvent("cursorPositionChanged", null, handlers.cursorPositionChanged); } catch (e9) {}
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
      job.currentCommandOutput += args.newOutput || "";
      if (job.session) {
        job.session.outputBuffer += args.newOutput || "";
        job.session.lastOutputTs = Date.now();
      }
      if (args && args.isDebug === true) {
        job.lastActivityAt = Date.now();
      }
    }
  }
}

function onTerminalCommandStarted(deviceName, args) {
  var jobKeys = Object.keys(IOS_JOBS);
  for (var i = 0; i < jobKeys.length; i++) {
    var job = IOS_JOBS[jobKeys[i]];
    if (job.device === deviceName && !job.finished) {
      job.lastInput = args && args.inputCommand ? String(args.inputCommand) : job.lastInput;
      job.currentCommand = args && args.completeCommand ? String(args.completeCommand) : job.currentCommand;
      job.lastMode = args && args.inputMode ? String(args.inputMode) : job.lastMode;
      if (job.session) {
        job.session.currentCommand = job.lastInput || job.session.currentCommand;
        job.session.completeCommand = job.currentCommand || job.session.completeCommand;
        job.session.processedCommand = args && args.processedCommand ? String(args.processedCommand) : job.session.processedCommand;
        job.session.busy = true;
      }
      job.updatedAt = Date.now();
    }
  }
}

function onTerminalCommandEnded(deviceName, args) {
  var jobKeys = Object.keys(IOS_JOBS);
  var i;
  var job;
  var status;
  var term;
  var statusCode;
  var phaseBefore;
  var raw;

  for (i = 0; i < jobKeys.length; i++) {
    job = IOS_JOBS[jobKeys[i]];
    if (!(job.device === deviceName && job.waitingForCommandEnd)) continue;

    status = args && typeof args.status !== "undefined" && args.status !== null ? args.status : 0;
    statusCode = mapCommandStatus(status);
    phaseBefore = job.phase;
    raw = job.currentCommandOutput || "";

    job.status = status;
    job.waitingForCommandEnd = false;
    job.lastActivityAt = Date.now();
    job.updatedAt = Date.now();
    if (job.session) {
      job.session.busy = false;
      job.session.waitingMore = !!job.paged;
      job.session.waitingConfirm = false;
      job.session.currentMode = job.lastMode || job.session.currentMode;
      job.session.currentPrompt = job.lastPrompt || job.session.currentPrompt;
    }

    term = getIosJobTerm(job);
    try { if (term && term.getPrompt) job.lastPrompt = term.getPrompt() || job.lastPrompt; } catch (e1) {}
    try { if (term && term.getMode) job.lastMode = term.getMode() || job.lastMode; } catch (e2) {}

    if (handleTerminalPrompt(job, raw, phaseBefore)) {
      continue;
    }

    if (phaseBefore === "dismiss-initial-dialog") {
      job.phase = job.resumePhase || "ensure-privileged";
      job.currentStep = job.resumeStep || 0;
      issueIosJobPhase(job.ticket);
      continue;
    }

    if (containsEnablePasswordPrompt(raw) && phaseBefore === "ensure-privileged") {
      failIosJob(job.ticket, "Enable password is required", "ENABLE_PASSWORD_REQUIRED");
      continue;
    }

    if (status !== 0) {
      failIosJob(
        job.ticket,
        "Command failed with status " + status + " during phase " + phaseBefore,
        statusCode || "COMMAND_FAILED"
      );
      continue;
    }

    if (phaseBefore === "ensure-privileged") {
      if (isPrivExecPrompt(job.lastPrompt, job.lastMode) || isConfigPrompt(job.lastPrompt, job.lastMode)) {
        job.phase = (job.type === "configIos") ? "ensure-config" : "run-exec";
        issueIosJobPhase(job.ticket);
      }
      continue;
    }

    if (phaseBefore === "ensure-config") {
      if (!isConfigPrompt(job.lastPrompt, job.lastMode)) {
        failIosJob(job.ticket, "Failed to enter configuration mode", "FAILED_TO_ENTER_CONFIG");
        continue;
      }

      job.phase = "run-config";
      issueIosJobPhase(job.ticket);
      continue;
    }

    if (phaseBefore === "run-exec") {
      job.output = raw;
      job.result = {
        ok: true,
        raw: raw,
        status: status,
        source: "terminal",
        session: buildJobSessionSnapshot(job)
      };
      completeIosJob(job.ticket);
      continue;
    }

    if (phaseBefore === "run-config") {
      job.stepResults.push({
        command: job.currentCommand,
        raw: raw,
        status: status
      });

      job.currentStep++;

      if (job.currentStep >= job.steps.length) {
        job.phase = "exit-config";
      }

      issueIosJobPhase(job.ticket);
      continue;
    }

    if (phaseBefore === "exit-config") {
      if (job.payload && job.payload.save !== false) {
        job.phase = "save-config";
        issueIosJobPhase(job.ticket);
      } else {
        job.output = joinStepOutputs(job.stepResults);
        job.result = {
          ok: true,
          device: job.device,
          executed: job.stepResults.length,
          results: job.stepResults,
          raw: job.output,
          source: "terminal",
          session: buildJobSessionSnapshot(job)
        };
        completeIosJob(job.ticket);
      }
      continue;
    }

    if (phaseBefore === "save-config") {
      job.output = joinStepOutputs(job.stepResults);
      job.result = {
        ok: true,
        device: job.device,
        executed: job.stepResults.length,
        results: job.stepResults,
        raw: job.output,
        source: "terminal",
        session: buildJobSessionSnapshot(job)
      };
      completeIosJob(job.ticket);
    }
  }
}

function onTerminalModeChanged(deviceName, args) {
  dprint("[Sessions] Mode changed to " + (args.newMode || "unknown") + " for " + deviceName);
  var jobKeys = Object.keys(IOS_JOBS);
  for (var i = 0; i < jobKeys.length; i++) {
    var job = IOS_JOBS[jobKeys[i]];
    if (job.device === deviceName && !job.finished) {
      job.lastMode = args && args.newMode ? String(args.newMode) : job.lastMode;
      if (job.session) job.session.currentMode = job.lastMode;
      job.updatedAt = Date.now();
    }
  }
}

function onTerminalPromptChanged(deviceName, args) {
  var jobKeys = Object.keys(IOS_JOBS);
  var i;
  var job;
  var newPrompt = "";

  if (typeof args === "string") {
    newPrompt = args;
  } else if (args && typeof args.newPrompt !== "undefined") {
    newPrompt = String(args.newPrompt || "");
  }

  for (i = 0; i < jobKeys.length; i++) {
    job = IOS_JOBS[jobKeys[i]];
    if (job.device === deviceName && !job.finished) {
      if (newPrompt) job.lastPrompt = newPrompt;
      if (job.session && newPrompt) job.session.currentPrompt = newPrompt;
      job.updatedAt = Date.now();

      if (!job.waitingForCommandEnd && job.phase === "ensure-privileged" && (isPrivExecPrompt(job.lastPrompt, job.lastMode) || isConfigPrompt(job.lastPrompt, job.lastMode))) {
        issueIosJobPhase(job.ticket);
      }
    }
  }
}

function onTerminalDirectiveSent(deviceName, args) {
  var jobKeys = Object.keys(IOS_JOBS);
  for (var i = 0; i < jobKeys.length; i++) {
    var job = IOS_JOBS[jobKeys[i]];
    if (job.device === deviceName && !job.finished) {
      job.externalInteraction = true;
      if (job.session) job.session.attached = true;
      job.updatedAt = Date.now();
    }
  }
}

function onTerminalCommandSelectedFromHistory(deviceName, args) {
  var jobKeys = Object.keys(IOS_JOBS);
  for (var i = 0; i < jobKeys.length; i++) {
    var job = IOS_JOBS[jobKeys[i]];
    if (job.device === deviceName && !job.finished) {
      job.historyTouched = true;
      job.externalInteraction = true;
      if (job.session) job.session.processedCommand = String(args && args.command ? args.command : job.session.processedCommand || "");
      job.updatedAt = Date.now();
    }
  }
}

function onTerminalCommandAutoCompleted(deviceName, args) {
  var jobKeys = Object.keys(IOS_JOBS);
  for (var i = 0; i < jobKeys.length; i++) {
    var job = IOS_JOBS[jobKeys[i]];
    if (job.device === deviceName && !job.finished) {
      job.historyTouched = true;
      job.externalInteraction = true;
      if (job.session) job.session.completeCommand = String(args && args.command ? args.command : job.session.completeCommand || "");
      job.updatedAt = Date.now();
    }
  }
}

function onTerminalCursorPositionChanged(deviceName, args) {
  var jobKeys = Object.keys(IOS_JOBS);
  for (var i = 0; i < jobKeys.length; i++) {
    var job = IOS_JOBS[jobKeys[i]];
    if (job.device === deviceName && !job.finished) {
      job.dirtyLineDetected = true;
      if (job.session) job.session.waitingMore = false;
      job.updatedAt = Date.now();
    }
  }
}

function onTerminalMoreDisplayed(deviceName, args) {
  var jobKeys = Object.keys(IOS_JOBS);
  var i;
  var job;
  var term = null;

  for (i = 0; i < jobKeys.length; i++) {
    job = IOS_JOBS[jobKeys[i]];
    if (job.device === deviceName && job.waitingForCommandEnd) {
      if (!term) term = getIosJobTerm(job);
      if (term && typeof term.enterChar === "function") {
        try {
          term.enterChar(32, 0);
          job.paged = true;
          job.lastActivityAt = Date.now();
          job.updatedAt = Date.now();
        } catch (e) {
          failIosJob(job.ticket, "Failed to advance pager: " + String(e), "PAGER_ERROR");
        }
      }
    }
  }
}

// ============================================================================
// Cleanup (Idempotent)
// ============================================================================

function markCleanup(stage) {
  cleanupStage = stage;
  try {
    if (fm) {
      fm.writePlainTextToFile(CLEANUP_TRACE_FILE, stage + " @" + Date.now());
    }
  } catch (e) {}
}

function invokeRuntimeCleanupHook() {
  // DESACTIVADO:
  // runtimeFn fue creado con new Function(...), así que invocarlo aquí
  // re-ejecuta runtime.js completo durante el Stop.
  // Eso NO limpia estado previo del runtime; crea una nueva ejecución.
  // 
  // Problema: Packet Tracer usa un único Qt Script Engine por Script Module.
  // cleanUp() debe liberar recursos del engine existente, no montar otra ejecución.
  // 
  // Referencias:
  // - https://tutorials.ptnetacad.net/help/default/scriptModules_scriptEngine.htm
  // - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/Function
  return;
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
    
    markCleanup("teardown-watcher");
    // IMPORTANTE: desregistrar watcher ANTES de soltar referencia
    teardownFileWatcher();
    
    markCleanup("save-pending");
    savePendingCommands();
    
    // Limpiar listeners de terminal (MIGRADO desde runtime.js)
    markCleanup("detach-listeners");
    detachAllTerminalListeners();
    
    // Limpiar jobs
    markCleanup("cleanup-jobs");
    for (var jobTicket in IOS_JOBS) {
      if (IOS_JOBS.hasOwnProperty(jobTicket) && IOS_JOBS[jobTicket] && IOS_JOBS[jobTicket].session) {
        IOS_JOBS[jobTicket].session.shuttingDown = true;
        IOS_JOBS[jobTicket].session.attached = false;
        IOS_JOBS[jobTicket].session.job = null;
      }
    }
    IOS_JOBS = {};
    
    // CRÍTICO:
    // NO re-ejecutar runtime.js en cleanUp().
    // invokeRuntimeCleanupHook() causaba re-ejecución completa de runtime
    // durante shutdown, contradiciendo el lifecycle del Script Engine.
    
    markCleanup("null-runtime");
    runtimeFn = null;
    
    // PT-side trace: interrupted by cleanup
    if (activeCommand && activeCommand.id) {
      writeCommandTracePatch(activeCommand.id, {
        interruptedByCleanup: true,
        cleanupStage: cleanupStage
      });
    }
    
    activeCommand = null;
    pendingCommands = {};
    
    markCleanup("done");
    
  } catch (e) {
    dprint("[cleanUp:" + cleanupStage + "] " + String(e));
  }
  
  dprint("[PT] Stopped");
}
`;
}
