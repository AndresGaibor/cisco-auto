/**
 * Runtime IOS Execution Handlers Template
 * Uses synchronous execution with terminal
 */

import { generateParserCode } from "../utils/parser-generator";

export function isNormalPrompt(prompt: string, mode: string): boolean {
  const p = String(prompt || "");
  const m = String(mode || "");
  return /\(config[^\)]*\)#\s*$/.test(p) ||
    /#\s*$/.test(p) ||
    />\s*$/.test(p) ||
    /config/i.test(m) ||
    /priv/i.test(m);
}

export function shouldDismissInitialDialog(prompt: string, mode: string, output: string): boolean {
  return !isNormalPrompt(prompt, mode) && (
    /initial configuration dialog/i.test(output) ||
    /Would you like to enter the initial configuration dialog\?/i.test(output)
  );
}

export function generateIosExecHandlersTemplate(): string {
  const parsersCode = generateParserCode();
  
  return `// ============================================================================
// IOS Output Parsers
// ============================================================================

${parsersCode}

// ============================================================================
// IOS Session Engine (Fase 6 - State Machine)
// ============================================================================

function IosSessionEngine(mode, prompt) {
  this.mode = mode || 'priv-exec';
  this.prompt = prompt || '#';
  this.paging = false;
  this.awaitingConfirm = false;
  this.awaitingPassword = false;
  this.awaitingDestinationFilename = false;
  this.currentCommand = '';
  this.outputBuffer = '';
  this.state = 'idle';
  this.metricsInteraction = {
    pagesAdvanced: 0,
    confirmsAnswered: 0,
    passwordsRequested: 0,
    destinationFilenameAnswered: 0,
    modesChanged: 0
  };
  this.eventLog = [];
}

IosSessionEngine.prototype.processEvent = function(event) {
  this.eventLog.push({ timestamp: Date.now(), type: event.type, data: event });
  
  switch(event.type) {
    case 'commandStarted':
      this.currentCommand = event.command;
      this.outputBuffer = '';
      this.state = 'awaiting-output';
      break;
    case 'outputWritten':
      this.outputBuffer += event.data;
      if (this.detectPaging(event.data)) {
        this.paging = true;
        this.state = 'paging';
      } else if (this.detectConfirmPrompt(event.data)) {
        this.awaitingConfirm = true;
        this.state = 'awaiting-confirm';
      } else if (this.detectPasswordPrompt(event.data)) {
        this.awaitingPassword = true;
        this.metricsInteraction.passwordsRequested++;
        this.state = 'awaiting-password';
      } else if (this.detectDestinationFilenamePrompt(event.data)) {
        this.awaitingDestinationFilename = true;
        this.state = 'awaiting-destination-filename';
      }
      break;
    case 'moreDisplayed':
      this.paging = true;
      this.metricsInteraction.pagesAdvanced++;
      this.state = 'paging';
      break;
    case 'modeChanged':
      if (event.newMode !== this.mode) {
        this.mode = event.newMode;
        this.metricsInteraction.modesChanged++;
      }
      break;
    case 'commandEnded':
      this.awaitingConfirm = false;
      this.awaitingPassword = false;
      this.awaitingDestinationFilename = false;
      this.paging = false;
      this.state = 'completed';
      break;
    case 'timeout':
      this.state = 'failed';
      break;
    case 'desync':
      this.state = 'desynced';
      break;
  }
};

IosSessionEngine.prototype.getState = function() {
  return {
    mode: this.mode,
    paging: this.paging,
    awaitingConfirm: this.awaitingConfirm,
    awaitingPassword: this.awaitingPassword,
    awaitingDestinationFilename: this.awaitingDestinationFilename,
    prompt: this.prompt
  };
};

IosSessionEngine.prototype.getMetrics = function() {
  return this.metricsInteraction;
};

IosSessionEngine.prototype.getExecutionState = function() {
  return this.state;
};

IosSessionEngine.prototype.getOutput = function() {
  return this.outputBuffer;
};

IosSessionEngine.prototype.getEventLog = function() {
  return this.eventLog;
};

IosSessionEngine.prototype.hasInteractivePending = function() {
  return this.awaitingConfirm || this.awaitingPassword || 
         this.awaitingDestinationFilename || this.paging;
};

IosSessionEngine.prototype.isComplete = function() {
  return this.state === 'completed' || this.state === 'failed';
};

IosSessionEngine.prototype.isDesynced = function() {
  return this.state === 'desynced';
};

IosSessionEngine.prototype.reset = function() {
  this.currentCommand = '';
  this.outputBuffer = '';
  this.state = 'idle';
  this.paging = false;
  this.awaitingConfirm = false;
  this.awaitingPassword = false;
  this.awaitingDestinationFilename = false;
};

IosSessionEngine.prototype.advancePaging = function() {
  if (this.paging) {
    this.metricsInteraction.pagesAdvanced++;
    this.paging = false;
    this.state = 'awaiting-output';
  }
};

IosSessionEngine.prototype.answerConfirm = function(answer) {
  if (this.awaitingConfirm) {
    this.metricsInteraction.confirmsAnswered++;
    this.awaitingConfirm = false;
    this.state = 'awaiting-output';
  }
};

IosSessionEngine.prototype.providePassword = function(password) {
  if (this.awaitingPassword) {
    this.awaitingPassword = false;
    this.state = 'awaiting-output';
  }
};

IosSessionEngine.prototype.provideDestinationFilename = function(filename) {
  if (this.awaitingDestinationFilename) {
    this.metricsInteraction.destinationFilenameAnswered++;
    this.awaitingDestinationFilename = false;
    this.state = 'awaiting-output';
  }
};

IosSessionEngine.prototype.detectPaging = function(data) {
  return /--More--/.test(data) || /\s+\[OK\]/.test(data);
};

IosSessionEngine.prototype.detectConfirmPrompt = function(data) {
  return /\[y\/n\]\?/.test(data) || /\[yes\/no\]\?/.test(data) || 
         /Proceed\?/i.test(data) || /Overwrite\?/i.test(data);
};

IosSessionEngine.prototype.detectPasswordPrompt = function(data) {
  return /Password:/.test(data) || /password:/i.test(data);
};

IosSessionEngine.prototype.detectDestinationFilenamePrompt = function(data) {
  return /Destination filename/i.test(data);
};

// ============================================================================
// IOS Transcript Recorder (Fase 6)
// ============================================================================

function IosTranscriptRecorder() {
  this.entries = [];
  this.startTime = Date.now();
}

IosTranscriptRecorder.prototype.record = function(type, payload) {
  this.entries.push({
    timestamp: Date.now() - this.startTime,
    type: type,
    payload: payload || {}
  });
};

IosTranscriptRecorder.prototype.getCompact = function() {
  var important = ['commandStarted', 'commandEnded', 'promptChanged', 'modeChanged',
                   'pagingAdvanced', 'confirmAnswered', 'outputWritten', 'desync'];
  return this.entries.filter(function(e) {
    return important.indexOf(e.type) >= 0;
  });
};

// ============================================================================
// Async Command Execution Helper (uses TerminalLine events)
// ============================================================================

function executeCommandAsync(term, cmd) {
  return new Promise(function(resolve) {
    var buffer = [];
    var ended = false;
    
    function onOutput(src, args) {
      var data = args && (args.newOutput !== undefined ? args.newOutput : args.data);
      if (data) {
        buffer.push(String(data));
      }
    }
    
    function onEnded(src, args) {
      if (ended) return;
      ended = true;
      try { term.unregisterEvent("outputWritten", null, onOutput); } catch(e) {}
      try { term.unregisterEvent("commandEnded", null, onEnded); } catch(e) {}
      resolve({
        ok: args.status === 0,
        status: args.status,
        output: buffer.join("")
      });
    }
    
    try { term.registerEvent("outputWritten", null, onOutput); } catch(e) {}
    try { term.registerEvent("commandEnded", null, onEnded); } catch(e) {}
    term.enterCommand(cmd);
  });
}

// ============================================================================
// IOS Execution Handlers - Synchronous polling (ES5 compatible)
// ============================================================================

function handleExecIos(payload) {
  var deviceName = payload.device;
  var command = payload.command;
  var timeoutMs = payload.timeoutMs || 30000;
  
  dprint("[handleExecIos] device=" + deviceName + " command=" + command);
  
  var device = getNet().getDevice(deviceName);
  if (!device) {
    return { ok: false, code: "DEVICE_NOT_FOUND", error: "Device not found: " + deviceName };
  }
  
  var term;
  try {
    term = device.getCommandLine();
  } catch (e) {
    return { ok: false, code: "CLI_UNAVAILABLE", error: "TerminalLine not available: " + deviceName };
  }
  
  if (!term) {
    return { ok: false, code: "CLI_UNAVAILABLE", error: "TerminalLine is null for " + deviceName };
  }
  
  var output = "";
  var startTime = Date.now();
  
  try {
    var initialLen = term.getOutput ? term.getOutput().length : 0;
    dprint("[handleExecIos] initial output length=" + initialLen);
  } catch(e) {
    initialLen = 0;
  }
  
  try {
    term.enterCommand(command);
  } catch(e) {
    return { ok: false, code: "COMMAND_ERROR", error: String(e) };
  }
  
  var maxPolls = 300;
  var poll = 0;
  var lastOutputLen = initialLen;
  var commandCompleted = false;
  var promptSeen = false;
  
  while (poll < maxPolls) {
    poll++;
    
    try {
      if (term.getOutput) {
        var currentOutput = term.getOutput();
        if (currentOutput.length > lastOutputLen) {
          output = currentOutput;
          lastOutputLen = currentOutput.length;
          dprint("[handleExecIos] poll #" + poll + " output len=" + currentOutput.length);
        }
      }
      
      if (term.getPrompt) {
        var currentPrompt = term.getPrompt();
        // IOS prompt contains "#" when command completes in priv-exec
        // or ">" for user-exec
        if (currentPrompt && currentPrompt.indexOf("#") >= 0) {
          promptSeen = true;
          dprint("[handleExecIos] poll #" + poll + " priv-exec prompt detected: " + currentPrompt);
          // Wait one more poll to ensure full output
          if (poll > 1) {
            commandCompleted = true;
            break;
          }
        } else if (currentPrompt && currentPrompt.indexOf(">") >= 0) {
          promptSeen = true;
          dprint("[handleExecIos] poll #" + poll + " user-exec prompt detected: " + currentPrompt);
          commandCompleted = true;
          break;
        }
      }
    } catch(e) {
      dprint("[handleExecIos] poll error: " + e);
    }
    
    if (Date.now() - startTime > timeoutMs) {
      dprint("[handleExecIos] poll #" + poll + " timeout after " + (Date.now() - startTime) + "ms");
      break;
    }
  }
  
  dprint("[handleExecIos] final output length=" + output.length);
  dprint("[handleExecIos] commandCompleted=" + commandCompleted + " promptSeen=" + promptSeen);
  
  // Detect error patterns in output
  var hasError = false;
  if (output) {
    var upperOutput = output.toUpperCase();
    if (upperOutput.indexOf("% INVALID") >= 0 || 
        upperOutput.indexOf("% INCOMPLETE") >= 0 || 
        upperOutput.indexOf("% AMBIGUOUS") >= 0 ||
        upperOutput.indexOf("ERROR") >= 0) {
      hasError = true;
    }
  }
  
  var status = commandCompleted && !hasError ? 0 : 1;
  
  return {
    ok: status === 0,
    raw: output,
    status: status,
    source: "terminal",
    session: { mode: promptSeen ? "priv-exec" : "user-exec" }
  };
}

// ============================================================================
// PC/Server Execution Handler - Uses polling pattern like IOS exec
// ============================================================================

function handleExecPc(payload) {
  var deviceName = payload.device;
  var command = payload.command;
  var timeoutMs = payload.timeoutMs || 30000;
  
  dprint("[handleExecPc] device=" + deviceName + " command=" + command);
  
  var device = getNet().getDevice(deviceName);
  if (!device) {
    return { ok: false, code: "DEVICE_NOT_FOUND", error: "Device not found: " + deviceName };
  }
  
  var term;
  try {
    term = device.getCommandPrompt();
  } catch (e) {
    return { ok: false, code: "CLI_UNAVAILABLE", error: "getCommandPrompt not available: " + deviceName };
  }
  
  if (!term) {
    return { ok: false, code: "CLI_UNAVAILABLE", error: "Command prompt not available for " + deviceName };
  }
  
  var output = "";
  var startTime = Date.now();
  
  // Clear any pending output first
  try {
    if (term.getOutput) {
      var initial = term.getOutput();
      dprint("[handleExecPc] initial output length=" + initial.length);
    }
  } catch(e) {}
  
  try {
    term.enterCommand(command);
  } catch(e) {
    return { ok: false, code: "COMMAND_ERROR", error: String(e) };
  }
  
  // Poll for output using getOutput() and check for completion via prompt
  var maxPolls = 300;
  var poll = 0;
  var lastOutputLen = 0;
  var commandCompleted = false;
  
  while (poll < maxPolls) {
    poll++;
    
    try {
      if (term.getOutput) {
        var currentOutput = term.getOutput();
        if (currentOutput.length > lastOutputLen) {
          output = currentOutput;
          lastOutputLen = currentOutput.length;
          dprint("[handleExecPc] poll #" + poll + " output len=" + currentOutput.length);
        }
      }
      
      // Check if command completed by looking at prompt
      if (term.getPrompt) {
        var prompt = term.getPrompt();
        // PC command prompt is usually "C:\>" when idle
        if (prompt && prompt.indexOf(">") >= 0 && output.indexOf("Reply from") >= 0) {
          commandCompleted = true;
          dprint("[handleExecPc] poll #" + poll + " command completed, prompt=" + prompt);
          break;
        }
        if (prompt && prompt.indexOf(">") >= 0 && output.indexOf("timeout") >= 0) {
          commandCompleted = true;
          dprint("[handleExecPc] poll #" + poll + " command timed out");
          break;
        }
      }
    } catch(e) {
      dprint("[handleExecPc] poll error: " + e);
    }
    
    // Check timeout
    if (Date.now() - startTime > timeoutMs) {
      dprint("[handleExecPc] poll #" + poll + " timeout after " + (Date.now() - startTime) + "ms");
      break;
    }
  }
  
  dprint("[handleExecPc] final output length=" + output.length);
  
  // Simple detection: if there's "Reply from" in the recent output, ping worked
  // Find the last "Reply from" and check if the corresponding stats show success
  var hasReplyFrom = output.indexOf("Reply from") >= 0;
  var hasInvalidCmd = false;
  var hasTimeout = false;
  var hasSuccessPing = false;
  
  // Check if the most recent ping attempt was successful
  var lastReplyIdx = output.lastIndexOf("Reply from");
  var lastTimeoutIdx = output.lastIndexOf("Request timed out");
  var lastInvalidIdx = output.lastIndexOf("Invalid Command");
  var lastStatsIdx = output.lastIndexOf("Ping statistics for");
  
  if (lastReplyIdx >= 0) {
    // Get the section after the last "Reply from"
    var afterReply = output.substring(lastReplyIdx);
    // Check if there's a ping stats showing 0% loss after this reply
    if (afterReply.indexOf("0% loss") >= 0 || afterReply.indexOf("Received = 4") >= 0) {
      hasSuccessPing = true;
    }
  }
  
  if (lastTimeoutIdx > lastReplyIdx) {
    hasTimeout = true;
  }
  if (lastInvalidIdx > lastReplyIdx && lastInvalidIdx > lastStatsIdx) {
    hasInvalidCmd = true;
  }
  
  dprint("[handleExecPc] hasReplyFrom=" + hasReplyFrom + " hasSuccessPing=" + hasSuccessPing + " hasTimeout=" + hasTimeout + " hasInvalidCmd=" + hasInvalidCmd);
  
  var ok = hasSuccessPing && !hasTimeout;
  
  return {
    ok: ok,
    raw: output,
    status: ok ? 0 : 1,
    source: "terminal"
  };
}

function isNormalPrompt(prompt, mode) {
  var p = String(prompt || '');
  var m = String(mode || '');
  if (!p) return false;
  return /\(config[^\)]*\)#\s*$/.test(p) ||
    /#\s*$/.test(p) ||
    />\s*$/.test(p) ||
    /config/i.test(m) ||
    /priv/i.test(m);
}

function handleExecInteractive(payload) {
  var deviceName = payload.device;
  var device = getNet().getDevice(deviceName);
  
  if (!device) {
    return {
      ok: false,
      raw: "",
      session: { mode: "unknown" },
      diagnostics: {
        source: "terminal",
        completionReason: "terminal-unavailable",
        errors: ["Device not found: " + deviceName]
      },
      interaction: { pagesAdvanced: 0, confirmsAnswered: 0, passwordsRequested: 0, destinationFilenameAnswered: 0, modesChanged: 0 },
      executionTimeMs: 0
    };
  }

  var term = device.getCommandLine();
  if (!term) {
    return {
      ok: false,
      raw: "",
      session: { mode: "unknown" },
      diagnostics: {
        source: "terminal",
        completionReason: "terminal-unavailable",
        errors: ["CLI not available"]
      },
      interaction: { pagesAdvanced: 0, confirmsAnswered: 0, passwordsRequested: 0, destinationFilenameAnswered: 0, modesChanged: 0 },
      executionTimeMs: 0
    };
  }

  var command = payload.command;
  var engine = new IosSessionEngine("priv-exec", "#");
  var recorder = new IosTranscriptRecorder();
  var startTime = Date.now();
  var output = "";
  var preLen = 0;

  try {
    recorder.record("commandStarted", { command: command });
    engine.processEvent({ type: "commandStarted", command: command });

    var currentOutput = term.getOutput ? term.getOutput() : "";
    preLen = currentOutput.length;
    var promptBefore = term.getPrompt ? term.getPrompt() : "N/A";
    dprint("[handleExecInteractive] sending command='" + command + "' preLen=" + preLen + " promptBefore=" + promptBefore);

    if (currentOutput.length > 0 && command) {
      term.enterCommand("");
      for (var flushAttempt = 0; flushAttempt < 5; flushAttempt++) {
        var newOutput = term.getOutput ? term.getOutput() : "";
        if (newOutput.length <= preLen) break;
        preLen = newOutput.length;
      }
      preLen = term.getOutput ? term.getOutput().length : 0;
    }

    term.enterCommand(command);

    var maxAttempts = 100;
    var attempt = 0;

    while (attempt < maxAttempts && !engine.isComplete()) {
      try {
        var fullOutput = term.getOutput ? term.getOutput() : "";
        var newData = fullOutput.slice(preLen);

        if (newData.length > 0) {
          recorder.record("outputWritten", { bytes: newData.length });
          engine.processEvent({ type: "outputWritten", data: newData });
          preLen = fullOutput.length;
          output = fullOutput;
        }

        if (engine.getState().paging) {
          recorder.record("pagingAdvanced", {});
          engine.advancePaging();
          term.enterCommand(" ");
        }

        var currentState = engine.getState();
        if (currentState.awaitingPassword || currentState.awaitingConfirm || currentState.awaitingDestinationFilename) {
          attempt++;
          continue;
        }

        var prompt = term.getPrompt ? term.getPrompt() : "";
        if (prompt && (prompt.indexOf("#") >= 0 || prompt.indexOf(">") >= 0)) {
          if (currentState.state === "awaiting-output" || currentState.state === "idle") {
            engine.processEvent({ type: "commandEnded" });
            break;
          }
        }

      } catch(e) {
        recorder.record("exception", { message: String(e) });
        engine.processEvent({ type: "desync" });
        break;
      }

      attempt++;
    }

    if (!engine.isComplete()) {
      if (engine.hasInteractivePending()) {
        recorder.record("timeout", { reason: "interactive-pending" });
        engine.processEvent({ type: "timeout" });
      } else {
        engine.processEvent({ type: "commandEnded" });
      }
    }

    recorder.record("commandEnded", { state: engine.getExecutionState() });
    var state = engine.getState();
    var executionTime = Date.now() - startTime;

    if (engine.getExecutionState() === "completed") {
      return {
        ok: true,
        raw: output,
        command: command,
        session: state,
        interaction: engine.getMetrics(),
        diagnostics: {
          source: "terminal",
          completionReason: "command-ended",
          errors: [],
          warnings: []
        },
        executionTimeMs: executionTime,
        transcriptSummary: recorder.getCompact()
      };
    } else {
      return {
        ok: false,
        raw: output,
        command: command,
        session: state,
        interaction: engine.getMetrics(),
        diagnostics: {
          source: "terminal",
          completionReason: engine.isDesynced() ? "desync" : "timeout",
          errors: [engine.hasInteractivePending() ? "Unresolved interactive prompt" : "Command timeout"],
          warnings: []
        },
        executionTimeMs: executionTime,
        transcriptSummary: recorder.getCompact()
      };
    }

  } catch (error) {
    recorder.record("exception", { message: String(error) });
    var executionTime = Date.now() - startTime;
    return {
      ok: false,
      raw: output,
      command: command,
      session: engine.getState(),
      interaction: engine.getMetrics(),
      diagnostics: {
        source: "terminal",
        completionReason: "unknown",
        errors: [String(error)],
        warnings: []
      },
      executionTimeMs: executionTime,
      transcriptSummary: recorder.getCompact()
    };
  }
}`;
}
