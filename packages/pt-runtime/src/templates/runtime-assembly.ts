/**
 * Runtime New - Consolidated runtime with ALL IOS job logic migrated from main.js
 *
 * This file exports RUNTIME_JS_TEMPLATE as a JavaScript string that is evaluated
 * by main.js via: new Function("payload", "ipc", "dprint", RUNTIME_JS_TEMPLATE)
 *
 * The runtime shares scope with main.js, so fm, ipc, dprint, and other main.js
 * variables are accessible via closure (not as parameters to new Function).
 *
 * Architecture:
 * - RUNTIME_JS_TEMPLATE is a self-contained JavaScript string
 * - It includes ALL IOS jobs system (previously in main.js)
 * - It includes ALL terminal listener system
 * - It includes ALL existing handlers (device, link, config, inspect, canvas)
 * - It exposes internal call endpoints via __* payload types
 * - main.js calls dispatch(payload, host) where host = { ipc, dprint }
 */

import { generateDeviceHandlersTemplate } from "./device-handlers-template";
import { generateIosConfigHandlersTemplate } from "./ios-config-handlers-template";
import { generateIosExecHandlersTemplate } from "./ios-exec-handlers-template";
import { generateInspectHandlersTemplate } from "./inspect-handlers-template";
import { generateCanvasHandlersTemplate } from "./canvas-handlers-template";
import { generateHelpersTemplate } from "./helpers-template";
import { generateSessionTemplate } from "./session-template";
import { generateConstantsTemplate } from "./constants-template";

// Re-export handlers for use in compose.ts
export { generateDeviceHandlersTemplate, generateIosConfigHandlersTemplate, generateIosExecHandlersTemplate, generateInspectHandlersTemplate, generateCanvasHandlersTemplate, generateHelpersTemplate, generateSessionTemplate };

// ============================================================================
// IOS Jobs Constants
// ============================================================================

const IOS_JOBS_TEMPLATE = `
// ============================================================================
// IOS JOBS SYSTEM
// ============================================================================

var IOS_JOBS = {};
var IOS_JOB_SEQ = 0;

var IOS_DEFAULT_COMMAND_TIMEOUT_MS = 8000;
var IOS_DEFAULT_STALL_TIMEOUT_MS = 15000;

// ============================================================================
// IOS Job Creation and Polling
// ============================================================================

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

    phase: "queued",
    resumePhase: "",
    resumeStep: 0,

    state: "queued",
    startedAt: Date.now(),
    updatedAt: Date.now(),
    lastActivityAt: Date.now(),

    output: "",
    outputs: [],
    stepResults: [],

    currentCommand: "",
    currentCommandOutput: "",
    currentCommandStartedAt: 0,

    status: null,
    modeBefore: "",
    modeAfter: "",
    lastMode: "",
    lastPrompt: "",

    paged: false,
    autoConfirmed: false,
    dialogDismissAttempts: 0,

    waitingForCommandEnd: false,
    finished: false,
    result: null,
    error: null,
    errorCode: null,

    inFlightPath: "",
    commandId: "",
    seq: 0,

    ensurePrivileged: payload.ensurePrivileged !== false,
    dismissInitialDialog: payload.dismissInitialDialog !== false,
    commandTimeoutMs: payload.commandTimeoutMs || IOS_DEFAULT_COMMAND_TIMEOUT_MS,
    stallTimeoutMs: payload.stallTimeoutMs || IOS_DEFAULT_STALL_TIMEOUT_MS,

    abortSent: false
  };

  dprint("[Job] Created " + ticket + " for " + payload.device + " type=" + type);
  return ticket;
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
`;

const TERMINAL_LISTENERS_TEMPLATE = `
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
      try { term.registerEvent("directiveSent", null, directiveSentHandler); } catch (e0) {}
      try { term.registerEvent("commandSelectedFromHistory", null, historySelectedHandler); } catch (e1) {}
      try { term.registerEvent("commandAutoCompleted", null, autoCompletedHandler); } catch (e2) {}
      try { term.registerEvent("cursorPositionChanged", null, cursorPositionChangedHandler); } catch (e3) {}

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
`;

const IOS_HELPERS_TEMPLATE = `
// ============================================================================
// IOS Job Helper Functions
// ============================================================================

function getIosJobTerm(job) {
  var device;
  if (!job) return null;
  device = getNet().getDevice(job.device);
  if (!device || typeof device.getCommandLine !== "function") return null;
  return device.getCommandLine();
}

function isNormalPrompt(prompt, mode) {
  var p = String(prompt || "");
  var m = String(mode || "");
  if (!p) return false;
  return /\\(config[^\\)]*\\)#\\s*$/.test(p) ||
    /#\\s*$/.test(p) ||
    />\\s*$/.test(p) ||
    /config/i.test(m) ||
    /priv/i.test(m);
}

function isConfigPrompt(prompt, mode) {
  var p = String(prompt || "");
  var m = String(mode || "");
  return /\\(config[^\\)]*\\)#\\s*$/.test(p) || /config/i.test(m);
}

function isPrivExecPrompt(prompt, mode) {
  var p = String(prompt || "");
  var m = String(mode || "");
  if (isConfigPrompt(prompt, mode)) return false;
  return /#\\s*$/.test(p) || /priv/i.test(m);
}

function containsInitialDialog(output) {
  if (!output) return false;
  return /initial configuration dialog/i.test(output) ||
    /please answer 'yes' or 'no'/i.test(output) ||
    /\\[yes\\/no\\]\\s*:\\s*$/i.test(output);
}

function containsEnablePasswordPrompt(output) {
  if (!output) return false;
  return /password\\s*:/i.test(output);
}

function mapCommandStatus(status) {
  if (status === 0) return null;
  if (status === 1) return "AMBIGUOUS";
  if (status === 2) return "INVALID";
  if (status === 3) return "INCOMPLETE";
  if (status === 4) return "NOT_IMPLEMENTED";
  return "UNKNOWN";
}

function joinStepOutputs(stepResults) {
  var parts = [];
  var i;
  for (i = 0; i < stepResults.length; i++) {
    if (stepResults[i] && stepResults[i].raw) {
      parts.push(stepResults[i].raw);
    }
  }
  return parts.join("\\n");
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

function getTerminalPolicy(job) {
  return job && job.terminalPolicy ? job.terminalPolicy : {};
}

function classifyTerminalState(prompt, mode, currentInput, output) {
  var p = String(prompt || "");
  var m = String(mode || "");
  var i = String(currentInput || "");
  var o = String(output || "");

  if (!isNormalPrompt(p, m) && /initial configuration dialog/i.test(o)) return "setup-dialog";
  if (/continue with configuration dialog\\?/i.test(o)) return "continue-dialog";
  if (/terminate autoinstall/i.test(o)) return "autoinstall-dialog";
  if (/password\\s*:/i.test(o)) return "password-prompt";
  if (/\\[confirm\\]/i.test(o)) return "confirm-prompt";
  if (/\\[yes\\/no\\]/i.test(o)) return "yes-no-prompt";
  if (/--More--/i.test(o)) return "pager";
  if (i && i.length > 0) return "dirty-line";
  if (/\\(config[^\\)]*\\)#\\s*$/.test(p) || /config/i.test(m)) return "config";
  if (/#\\s*$/.test(p) || /priv/i.test(m)) return "priv";
  if (/>\\s*$/.test(p) || />$/.test(p)) return "user";
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
  return /\\[confirm\\]/i.test(output);
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
`;

const IOS_JOB_STATE_MACHINE_TEMPLATE = `
// ============================================================================
// IOS Job State Machine
// ============================================================================

function setIosJobPhase(job, phase) {
  job.phase = phase;
  job.state = phase;
  job.updatedAt = Date.now();
}

function buildIosSuccessResult(job, raw) {
  return {
    ok: true,
    device: job.device,
    raw: raw || "",
    source: "terminal",
    session: buildJobSessionSnapshot(job)
  };
}

function buildIosConfigSuccessResult(job) {
  var joined = joinStepOutputs(job.stepResults);
  return {
    ok: true,
    device: job.device,
    executed: job.stepResults.length,
    results: job.stepResults,
    raw: joined,
    source: "terminal",
    session: buildJobSessionSnapshot(job)
  };
}

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
`;

const TERMINAL_EVENT_HANDLERS_TEMPLATE = `
// ============================================================================
// Terminal Event Handlers
// ============================================================================

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
`;

const INTERNAL_ENDPOINTS_TEMPLATE = `
// ============================================================================
// Internal Call Endpoints (called from main.js via dispatch)
// ============================================================================

function handlePollDeferred(payload) {
  var ticket = payload && payload.ticket;
  if (!ticket) {
    return { done: true, ok: false, error: "Missing ticket", code: "MISSING_TICKET" };
  }
  return pollIosJob(ticket);
}

function handleWriteHeartbeat(payload) {
  var HEARTBEAT_FILE = payload && payload.heartbeatFile;
  if (!HEARTBEAT_FILE) return { ok: false, error: "Missing heartbeatFile" };

  try {
    fm.writePlainTextToFile(HEARTBEAT_FILE, JSON.stringify({
      ts: Date.now(),
      pid: "pt-main",
      running: typeof isRunning !== "undefined" ? isRunning : true,
      pending: typeof pendingCommands !== "undefined" ? Object.keys(pendingCommands).length : 0,
      active: typeof activeCommand !== "undefined" && activeCommand ? activeCommand.id : null
    }));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

function handleCleanupStaleInFlight(payload) {
  var IN_FLIGHT_DIR = payload && payload.inFlightDir;
  var RESULTS_DIR = payload && payload.resultsDir;

  if (!IN_FLIGHT_DIR || !RESULTS_DIR) {
    return { ok: false, error: "Missing directories" };
  }

  try {
    if (!fm.directoryExists(IN_FLIGHT_DIR)) {
      return { ok: true, cleaned: 0 };
    }

    var files = fm.getFilesInDirectory(IN_FLIGHT_DIR);
    if (!files || files.length === 0) {
      return { ok: true, cleaned: 0 };
    }

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
        } catch (e1) {}
      }
    }

    return { ok: true, cleaned: cleaned };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

function handleSavePending(payload) {
  var PENDING_COMMANDS_FILE = payload && payload.pendingFile;
  if (!PENDING_COMMANDS_FILE) return { ok: false, error: "Missing pendingFile" };

  try {
    var pending = typeof pendingCommands !== "undefined" ? pendingCommands : {};
    fm.writePlainTextToFile(PENDING_COMMANDS_FILE, JSON.stringify(pending));
    return { ok: true, count: Object.keys(pending).length };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

function handleLoadPending(payload) {
  var PENDING_COMMANDS_FILE = payload && payload.pendingFile;
  if (!PENDING_COMMANDS_FILE) return { ok: false, error: "Missing pendingFile" };

  try {
    if (!fm.fileExists(PENDING_COMMANDS_FILE)) {
      return { ok: true, loaded: 0 };
    }

    var content = fm.getFileContents(PENDING_COMMANDS_FILE);
    if (!content || content.trim().length === 0) {
      return { ok: true, loaded: 0 };
    }

    var loaded = JSON.parse(content);
    if (typeof pendingCommands !== "undefined") {
      pendingCommands = loaded;
    }
    return { ok: true, loaded: Object.keys(loaded || {}).length };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

function handleStartLeaseHealthMonitor(payload) {
  var LEASE_FILE = payload && payload.leaseFile;

  if (!LEASE_FILE) {
    return {
      ok: true,
      running: typeof isRunning !== "undefined" ? isRunning : false,
      leaseValid: false,
      leaseFile: null
    };
  }

  try {
    if (!fm.fileExists(LEASE_FILE)) {
      return { ok: true, running: true, leaseValid: false };
    }

    var content = fm.getFileContents(LEASE_FILE);
    if (!content || content.trim().length === 0) {
      return { ok: true, running: true, leaseValid: false };
    }

    var lease = JSON.parse(content);
    if (!lease.ownerId || !lease.expiresAt) {
      return { ok: true, running: true, leaseValid: false };
    }

    var now = Date.now();
    if (now > lease.expiresAt) {
      return { ok: true, running: true, leaseValid: false, reason: "expired" };
    }

    var ageMs = now - lease.updatedAt;
    if (ageMs > (lease.ttlMs * 2)) {
      return { ok: true, running: true, leaseValid: false, reason: "stale" };
    }

    return {
      ok: true,
      running: true,
      leaseValid: true,
      ownerId: lease.ownerId ? lease.ownerId.substring(0, 8) + "..." : null,
      expiresIn: lease.expiresAt - now
    };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

function handleCheckIosJobTimeouts() {
  checkIosJobTimeouts();
  return { ok: true };
}

function handleGetIosJobState(payload) {
  var ticket = payload && payload.ticket;
  if (!ticket) return { ok: false, error: "Missing ticket" };

  var job = IOS_JOBS[ticket];
  if (!job) return { ok: false, error: "Job not found: " + ticket };

  return {
    ok: true,
    ticket: job.ticket,
    device: job.device,
    type: job.type,
    state: job.state,
    phase: job.phase,
    finished: job.finished,
    waitingForCommandEnd: job.waitingForCommandEnd,
    currentCommand: job.currentCommand,
    currentStep: job.currentStep,
    totalSteps: job.steps.length,
    error: job.error,
    errorCode: job.errorCode,
    lastActivityAt: job.lastActivityAt,
    lastMode: job.lastMode,
    lastPrompt: job.lastPrompt
  };
}

function handleListIosJobs() {
  var keys = Object.keys(IOS_JOBS);
  var jobs = [];
  for (var i = 0; i < keys.length; i++) {
    var job = IOS_JOBS[keys[i]];
    jobs.push({
      ticket: job.ticket,
      device: job.device,
      type: job.type,
      state: job.state,
      phase: job.phase,
      finished: job.finished,
      waitingForCommandEnd: job.waitingForCommandEnd,
      lastActivityAt: job.lastActivityAt
    });
  }
  return { ok: true, jobs: jobs, count: jobs.length };
}

function padSeq(n) {
  var s = String(n);
  while (s.length < 12) s = "0" + s;
  return s;
}
`;

const LINK_HANDLERS_TEMPLATE = `
// ============================================================================
// Link Handlers
// ============================================================================

function handleAddLink(payload) {
  var lw = getLW();
  var net = getNet();
  loadLinkRegistry();
  var dev1 = net.getDevice(payload.device1);
  var dev2 = net.getDevice(payload.device2);

  dprint("[handleAddLink] Creating link: " + payload.device1 + ":" + payload.port1 + " <-> " + payload.device2 + ":" + payload.port2);

  if (!dev1) return { ok: false, error: "Device not found: " + payload.device1 };
  if (!dev2) return { ok: false, error: "Device not found: " + payload.device2 };

  var dev1Model = "";
  var dev2Model = "";
  try { dev1Model = dev1.getModel() || ""; } catch (e) {}
  try { dev2Model = dev2.getModel() || ""; } catch (e) {}

  if (dev1Model && PT_PORT_MAP[dev1Model.toLowerCase()]) {
    var v1 = validatePortExists(dev1Model, payload.port1);
    if (!v1.valid) {
      return { ok: false, error: "Validación de puerto falló: " + v1.error };
    }
  }

  if (dev2Model && PT_PORT_MAP[dev2Model.toLowerCase()]) {
    var v2 = validatePortExists(dev2Model, payload.port2);
    if (!v2.valid) {
      return { ok: false, error: "Validación de puerto falló: " + v2.error };
    }
  }

  var END_DEVICE_TYPE_LIST = [
    DEVICE_TYPES.pc, DEVICE_TYPES.server, DEVICE_TYPES.printer, DEVICE_TYPES.ipPhone,
    DEVICE_TYPES.laptop, DEVICE_TYPES.tablet, DEVICE_TYPES.smartphone,
    DEVICE_TYPES.wirelessEndDevice, DEVICE_TYPES.wiredEndDevice, DEVICE_TYPES.tv,
    DEVICE_TYPES.homeVoip, DEVICE_TYPES.analogPhone, DEVICE_TYPES.iot,
    DEVICE_TYPES.sniffer, DEVICE_TYPES.mcu, DEVICE_TYPES.sbc,
  ];

  function isEndDevice(device) {
    try {
      var t = device.getType();
      for (var i = 0; i < END_DEVICE_TYPE_LIST.length; i++) {
        if (END_DEVICE_TYPE_LIST[i] === t) return true;
      }
    } catch (e) {}
    return false;
  }

  function recommendCableType(device1, device2) {
    var type1 = device1.getType();
    var type2 = device2.getType();
    var isSwitchLike = function(type) {
      return type === DEVICE_TYPES.switch || type === DEVICE_TYPES.multilayerSwitch;
    };
    if (type1 === type2) return "cross";
    if (isSwitchLike(type1) && isSwitchLike(type2)) return "cross";
    return "straight";
  }

  function getDevicePowerSafe(device) {
    try {
      if (device && typeof device.getPower === "function") return !!device.getPower();
    } catch (e) {}
    return null;
  }

  function getDevicePortNamesSafe(device) {
    var names = [];
    try {
      if (!device || typeof device.getPortCount !== "function" || typeof device.getPortAt !== "function") return names;
      for (var i = 0; i < device.getPortCount(); i++) {
        var port = device.getPortAt(i);
        if (port && typeof port.getName === "function") names.push(String(port.getName()));
      }
    } catch (e) {}
    return names;
  }

  function getPortDebugInfo(device, requestedName, resolvedName) {
    var portObj = null;
    try {
      if (resolvedName && typeof device.getPort === "function") portObj = device.getPort(resolvedName);
    } catch (e) {}
    return {
      requestedName: requestedName || null,
      resolvedName: resolvedName || null,
      exists: !!portObj,
      devicePower: getDevicePowerSafe(device),
      availablePorts: getDevicePortNamesSafe(device)
    };
  }

  if (dev1 && dev1.skipBoot) dev1.skipBoot();
  if (dev2 && dev2.skipBoot) dev2.skipBoot();

  var resolvedPort1 = resolveDevicePortName(dev1, payload.port1);
  var resolvedPort2 = resolveDevicePortName(dev2, payload.port2);

  if (!resolvedPort1 || !resolvedPort2) {
    return {
      ok: false,
      error: "Port not found",
      details: {
        device1: payload.device1,
        port1: getPortDebugInfo(dev1, payload.port1, resolvedPort1),
        device2: payload.device2,
        port2: getPortDebugInfo(dev2, payload.port2, resolvedPort2)
      }
    };
  }

  var cableTypeName = payload.linkType === "auto"
    ? recommendCableType(dev1, dev2)
    : (payload.linkType || "auto");

  if (payload.linkType && payload.linkType !== "auto") {
    var requestedCableLower = payload.linkType.toLowerCase();
    var validCableTypes = Object.keys(CABLE_TYPES).filter(function(k) { return isNaN(Number(k)); });
    var isValidCable = validCableTypes.some(function(t) { return t.toLowerCase() === requestedCableLower; });

    if (!isValidCable) {
      return {
        ok: false,
        error: "Tipo de cable '" + payload.linkType + "' no es válido. Tipos válidos: " + validCableTypes.join(", ") + ". Use 'auto' para selección automática."
      };
    }

    cableTypeName = validCableTypes.find(function(t) { return t.toLowerCase() === requestedCableLower; }) || "auto";
  }

  var cableType = (CABLE_TYPES[cableTypeName] !== undefined)
    ? CABLE_TYPES[cableTypeName]
    : CABLE_TYPES.auto;

  if (cableTypeName !== 'auto') {
    var conn1 = getPortConnector(dev1Model, resolvedPort1);
    var conn2 = getPortConnector(dev2Model, resolvedPort2);

    if (conn1) {
      var compat1 = validateCablePortCompatibility(cableTypeName, conn1);
      if (!compat1.valid) {
        return { ok: false, error: "Compatibilidad cable-puerto: " + compat1.error, details: { device: payload.device1, port: resolvedPort1, connector: conn1, cable: cableTypeName } };
      }
    }

    if (conn2) {
      var compat2 = validateCablePortCompatibility(cableTypeName, conn2);
      if (!compat2.valid) {
        return { ok: false, error: "Compatibilidad cable-puerto: " + compat2.error, details: { device: payload.device2, port: resolvedPort2, connector: conn2, cable: cableTypeName } };
      }
    }
  }

  var isEnd1 = isEndDevice(dev1);
  var isEnd2 = isEndDevice(dev2);

  var originalOrder = {
    devName1: payload.device1, p1: resolvedPort1,
    devName2: payload.device2, p2: resolvedPort2
  };
  var swappedOrder = {
    devName1: payload.device2, p1: resolvedPort2,
    devName2: payload.device1, p2: resolvedPort1
  };

  var attempts = (isEnd1 && !isEnd2) ? [swappedOrder, originalOrder] : [originalOrder, swappedOrder];

  var success = false;
  var lastError = null;
  var usedAttempt = null;

  for (var i = 0; i < attempts.length; i++) {
    var attempt = attempts[i];
    dprint("[handleAddLink] Attempt " + (i + 1) + ": createLink(" +
      attempt.devName1 + ":" + attempt.p1 + " <-> " +
      attempt.devName2 + ":" + attempt.p2 + " cable=" + cableTypeName + "(" + cableType + "))");
    try {
      success = !!lw.createLink(attempt.devName1, attempt.p1, attempt.devName2, attempt.p2, cableType);
      if (success) { usedAttempt = attempt; dprint("[handleAddLink] SUCCESS on attempt " + (i + 1)); break; }
      else dprint("[handleAddLink] Attempt " + (i + 1) + " returned false");
    } catch (e) {
      lastError = String(e);
      dprint("[handleAddLink] Attempt " + (i + 1) + " threw: " + lastError);
    }
  }

  if (!success) {
    return {
      ok: false,
      error: "Failed to create link. Packet Tracer rejected the request.",
      details: {
        device1: payload.device1,
        port1: getPortDebugInfo(dev1, payload.port1, resolvedPort1),
        device2: payload.device2,
        port2: getPortDebugInfo(dev2, payload.port2, resolvedPort2),
        cableTypeName: cableTypeName, cableType: cableType,
        isEnd1: isEnd1, isEnd2: isEnd2,
        attemptedOrders: [
          attempts[0].devName1 + ":" + attempts[0].p1 + " -> " + attempts[0].devName2 + ":" + attempts[0].p2,
          attempts[1].devName1 + ":" + attempts[1].p1 + " -> " + attempts[1].devName2 + ":" + attempts[1].p2
        ],
        lastError: lastError
      }
    };
  }

  var wasSwapped = (usedAttempt === swappedOrder);

  dprint("[handleAddLink] Link created" + (wasSwapped ? " (swapped order)" : "") +
    ": " + payload.device1 + ":" + resolvedPort1 + " <-> " + payload.device2 + ":" + resolvedPort2);

  var linkKey = payload.device1 + ":" + payload.port1 + "--" + payload.device2 + ":" + payload.port2;
  LINK_REGISTRY[linkKey] = {
    device1: payload.device1, port1: payload.port1,
    device2: payload.device2, port2: payload.port2,
    linkType: payload.linkType || "auto"
  };
  saveLinkRegistry();

  return {
    ok: true,
    device1: payload.device1,
    port1: resolvedPort1,
    device2: payload.device2,
    port2: resolvedPort2,
    linkType: payload.linkType || "auto",
    swapped: wasSwapped
  };
}

function handleRemoveLink(payload) {
  loadLinkRegistry();
  getLW().deleteLink(payload.device, payload.port);
  for (var linkId in LINK_REGISTRY) {
    if (linkId.indexOf(payload.device + ":" + payload.port) >= 0) {
      delete LINK_REGISTRY[linkId];
    }
  }
  saveLinkRegistry();
  return { ok: true };
}
`;

const DISPATCHER_TEMPLATE = `
// ============================================================================
// Main Dispatcher - Routes payloads to handlers
// ============================================================================

function dispatch(payload, host) {
  if (!payload || typeof payload !== "object") {
    return { ok: false, error: "Invalid payload", code: "INVALID_PAYLOAD" };
  }

  if (!payload.type || typeof payload.type !== "string") {
    return { ok: false, error: "Missing payload.type", code: "MISSING_TYPE" };
  }

  var ipc = host && host.ipc ? host.ipc : (typeof ipc !== "undefined" ? ipc : null);
  var dprintFn = host && host.dprint ? host.dprint : (typeof dprint !== "undefined" ? dprint : function() {});

  try {
    dprintFn("[Runtime] Processing: " + payload.type);

    switch (payload.type) {
      // Internal endpoints
      case "__pollDeferred": return handlePollDeferred(payload);
      case "__writeHeartbeat": return handleWriteHeartbeat(payload);
      case "__cleanupStaleInFlight": return handleCleanupStaleInFlight(payload);
      case "__savePending": return handleSavePending(payload);
      case "__loadPending": return handleLoadPending(payload);
      case "__startLeaseHealthMonitor": return handleStartLeaseHealthMonitor(payload);
      case "__checkIosJobTimeouts": return handleCheckIosJobTimeouts();
      case "__getIosJobState": return handleGetIosJobState(payload);
      case "__listIosJobs": return handleListIosJobs();

      // Device handlers
      case "addDevice": return handleAddDevice(payload);
      case "removeDevice": return handleRemoveDevice(payload);
      case "listDevices": return handleListDevices(payload);
      case "renameDevice": return handleRenameDevice(payload);
      case "moveDevice": return handleMoveDevice(payload);

      // Link handlers
      case "addLink": return handleAddLink(payload);
      case "removeLink": return handleRemoveLink(payload);

      // Config handlers
      case "configHost": return handleConfigHost(payload);
      case "configIos": return handleConfigIos(payload);
      case "execIos": return handleExecIos(payload);

      // Inspect handlers
      case "inspect": return handleInspect(payload);
      case "snapshot": return handleSnapshot(payload);
      case "hardwareInfo": return handleHardwareInfo(payload);
      case "hardwareCatalog": return handleHardwareCatalog(payload);
      case "commandLog": return handleCommandLog(payload);
      case "resolveCapabilities": return handleResolveCapabilities(payload);

      // Canvas handlers
      case "listCanvasRects": return handleListCanvasRects(payload);
      case "getRect": return handleGetRect(payload);
      case "devicesInRect": return handleDevicesInRect(payload);
      case "clearTopology": return handleClearTopology(payload);

      default: return { ok: false, error: "Unknown payload type: " + payload.type, code: "UNKNOWN_HANDLER" };
    }
  } catch (e) {
    dprintFn("[Runtime] Handler exception: " + String(e));
    return { ok: false, error: String(e), code: "HANDLER_EXCEPTION" };
  }
}
`;

// ============================================================================
// Assemble RUNTIME_JS_TEMPLATE
// ============================================================================

export function generateRuntimeNewCode(): string {
  const code = String.raw`
/**
 * PT Control V2 - Runtime New (Consolidated)
 *
 * Auto-generated - DO NOT EDIT MANUALLY
 * This code runs inside Packet Tracer Script Engine with full IPC access.
 * Evaluated by main.js via: new Function("payload", "ipc", "dprint", RUNTIME_JS_TEMPLATE)
 *
 * Contains ALL IOS jobs system, terminal listeners, and handlers in one string.
 * Shares scope with main.js (fm, ipc, dprint, pendingCommands, etc. via closure).
 */

${IOS_JOBS_TEMPLATE}
${TERMINAL_LISTENERS_TEMPLATE}
${IOS_HELPERS_TEMPLATE}
${IOS_JOB_STATE_MACHINE_TEMPLATE}
${TERMINAL_EVENT_HANDLERS_TEMPLATE}
${INTERNAL_ENDPOINTS_TEMPLATE}

// ============================================================================
// Constants (DEVICE_TYPE_NAMES, CABLE_TYPES, etc.)
// ============================================================================

${generateConstantsTemplate()}

// ============================================================================
// IOS Configuration Handlers
// ============================================================================

${generateIosConfigHandlersTemplate()}

// ============================================================================
// IOS Exec Handlers
// ============================================================================

${generateIosExecHandlersTemplate()}

// ============================================================================
// Session Helpers
// ============================================================================

${generateSessionTemplate()}

// ============================================================================
// Helpers
// ============================================================================

${generateHelpersTemplate()}

// ============================================================================
// Device Handlers
// ============================================================================

${generateDeviceHandlersTemplate()}

// ============================================================================
// Link Handlers
// ============================================================================

${LINK_HANDLERS_TEMPLATE}

// ============================================================================
// Inspect Handlers
// ============================================================================

${generateInspectHandlersTemplate()}

// ============================================================================
// Canvas Handlers
// ============================================================================

${generateCanvasHandlersTemplate()}

// ============================================================================
// Main Dispatcher
// ============================================================================

${DISPATCHER_TEMPLATE}

// ============================================================================
// Entry Point - El runtime se invoca como función(payload, api)
// ============================================================================

return dispatch(payload, { ipc: api.ipc, dprint: api.dprint });
`;
  return code;
}

// ============================================================================
// Export
// ============================================================================

export const RUNTIME_JS_TEMPLATE = generateRuntimeNewCode();
