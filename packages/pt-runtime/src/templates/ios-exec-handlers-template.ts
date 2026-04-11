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
// IOS Execution Handlers - Synchronous execution
// ============================================================================

function handleExecIos(payload) {
  var deviceName = payload.device;
  var device = getNet().getDevice(deviceName);
  
  if (!device) {
    return { 
      ok: false, 
      code: "DEVICE_NOT_FOUND",
      error: "Device not found: " + deviceName 
    };
  }

  var term;
  try {
    term = device.getCommandLine();
  } catch (e) {
    return { 
      ok: false, 
      code: "CLI_UNAVAILABLE",
      error: "TerminalLine not available for device " + deviceName 
    };
  }
  
  if (!term) {
    return { 
      ok: false, 
      code: "CLI_UNAVAILABLE",
      error: "TerminalLine not available for device " + deviceName 
    };
  }

  var command = payload.command;
  dprint("[handleExecIos] Command: '" + command + "'");
  var output = "";
  var status = 0;
  var currentMode = "priv-exec";
  
  try {
    var preCommandLength = term.getOutput ? term.getOutput().length : 0;
    var prompt = term.getPrompt ? term.getPrompt() : "";
    
    if (prompt.indexOf("(config") >= 0) {
      currentMode = "config";
    } else if (prompt.indexOf("#") >= 0) {
      currentMode = "priv-exec";
    } else if (prompt.indexOf(">") >= 0) {
      currentMode = "user-exec";
    }

    var isShowCommand = command.toLowerCase().indexOf("show ") === 0;
    
    if (currentMode === "config" && isShowCommand) {
      term.enterCommand("end");
      for (var i = 0; i < 10; i++) {
        var checkOutput = term.getOutput ? term.getOutput() : "";
        if (checkOutput.indexOf("#") >= 0) {
          currentMode = "priv-exec";
          preCommandLength = checkOutput.length;
          break;
        }
      }
    }

    if (isShowCommand && currentMode !== "priv-exec") {
      term.enterCommand("enable");
      for (var i = 0; i < 10; i++) {
        var checkOutput = term.getOutput ? term.getOutput() : "";
        if (checkOutput.indexOf("#") >= 0) {
          currentMode = "priv-exec";
          preCommandLength = checkOutput.length;
          break;
        }
      }
    }

    term.enterCommand(command);
    
    var maxAttempts = 30;
    var attempt = 0;
    while (attempt < maxAttempts) {
      try {
        var checkOutput = term.getOutput ? term.getOutput() : "";
        if (checkOutput.length > preCommandLength) {
          output = checkOutput.slice(preCommandLength);
          if (output.indexOf("--More--") >= 0) {
            term.enterCommand(" ");
            preCommandLength = term.getOutput().length;
          }
          if (output.indexOf("[confirm]") >= 0) {
            term.enterCommand("\\n");
            preCommandLength = term.getOutput().length;
          }
          if ((output.indexOf("#") >= 0 || output.indexOf(">") >= 0) && output.length > 20) {
            break;
          }
        }
      } catch(e) {
        break;
      }
      attempt++;
    }
    
    var outputLines = output.split("\\n");
    var lastLines = outputLines.slice(-5).join("\\n");
    if (lastLines.indexOf("% Invalid") >= 0 || lastLines.indexOf("% Incomplete") >= 0 || 
        lastLines.indexOf("% Ambiguous") >= 0 || lastLines.indexOf("Error") >= 0) {
      status = 1;
    }
    
  } catch (e) {
    status = 1;
    output = String(e);
  }
  
  return {
    ok: status === 0,
    raw: output,
    status: status,
    source: "terminal",
    session: { mode: currentMode }
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

    preLen = term.getOutput ? term.getOutput().length : 0;
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

        // NOTE: Auto-confirm "y" removed - caused issues with commands that start with certain patterns
        // Confirmation should only be handled by explicit user intent, not automatic detection

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
