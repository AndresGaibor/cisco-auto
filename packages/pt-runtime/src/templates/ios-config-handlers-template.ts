/**
 * Runtime IOS Configuration Handlers Template (Fase 6)
 * Uses state machine and semantic helpers for mode transitions
 */

export function generateIosConfigHandlersTemplate(): string {
  return `// ============================================================================
// IOS Configuration Handlers - Fase 6 (State Machine + Helpers)
// ============================================================================

// Helper: Ensure privileged exec mode
function inferModeFromPrompt(prompt) {
  var p = String(prompt || '');
  if (/\(config[^\)]*\)#\s*$/.test(p)) return 'config';
  if (/#\s*$/.test(p)) return 'priv-exec';
  if (/>\s*$/.test(p)) return 'user-exec';
  return '';
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

function syncEngineModeFromTerminal(engine, term) {
  var prompt = '';
  var mode = '';

  try { prompt = term.getPrompt ? String(term.getPrompt() || '') : ''; } catch (e) {}
  try { mode = term.getMode ? String(term.getMode() || '') : ''; } catch (e) {}

  mode = inferModeFromPrompt(prompt) || mode;
  if (mode && engine.getState().mode !== mode) {
    engine.processEvent({ type: 'modeChanged', newMode: mode });
  }
}

function dismissInitialDialogIfNeeded(engine, term) {
  var handled = false;
  var i;

  for (i = 0; i < 3; i++) {
    var output = term.getOutput ? String(term.getOutput() || '') : '';
    var prompt = term.getPrompt ? String(term.getPrompt() || '') : '';
    var mode = term.getMode ? String(term.getMode() || '') : '';
    var stepHandled = false;

    if (isNormalPrompt(prompt, mode)) break;

    if (/initial configuration dialog/i.test(output) || /continue with configuration dialog/i.test(output)) {
      term.enterCommand('no');
      stepHandled = true;
    }

    if (/terminate autoinstall/i.test(output)) {
      term.enterCommand('yes');
      stepHandled = true;
    }

    // Handle "Press RETURN to get started" - send empty command (Enter key)
    if (/Press RETURN to get started/i.test(output)) {
      term.enterCommand('');
      stepHandled = true;
    }

    if (!stepHandled) break;
    handled = true;
    syncEngineModeFromTerminal(engine, term);
  }

  return handled;
}

function ensurePrivilegedExec(engine, term) {
  var state = engine.getState();
  if (state.mode === 'priv-exec') return true;

  var preLen = term.getOutput ? term.getOutput().length : 0;

  if (dismissInitialDialogIfNeeded(engine, term)) {
    preLen = term.getOutput ? term.getOutput().length : preLen;
  }
  syncEngineModeFromTerminal(engine, term);
  if (engine.getState().mode === 'priv-exec') return true;

  term.enterCommand('enable');

  for (var i = 0; i < 20; i++) {
    var output = term.getOutput ? term.getOutput() : '';
    var newData = output.slice(preLen);
    if (newData.length > 0) {
      engine.processEvent({ type: 'outputWritten', data: newData });
      preLen = output.length;
    }

    syncEngineModeFromTerminal(engine, term);
    
    if (engine.getState().mode === 'priv-exec') {
      return true;
    }
  }

  return false;
}

// Helper: Ensure config mode
function ensureConfigMode(engine, term) {
  var state = engine.getState();
  if (state.mode.indexOf('config') === 0) return true;

  var preLen = term.getOutput ? term.getOutput().length : 0;
  term.enterCommand('configure terminal');

  for (var i = 0; i < 20; i++) {
    var output = term.getOutput ? term.getOutput() : '';
    var newData = output.slice(preLen);
    if (newData.length > 0) {
      engine.processEvent({ type: 'outputWritten', data: newData });
      preLen = output.length;
    }
    syncEngineModeFromTerminal(engine, term);
    
    if (engine.getState().mode.indexOf('config') === 0) {
      return true;
    }
  }

  return false;
}

// Helper: Exit config mode
function exitConfigMode(engine, term) {
  var preLen = term.getOutput ? term.getOutput().length : 0;
  term.enterCommand('end');

  for (var i = 0; i < 20; i++) {
    var output = term.getOutput ? term.getOutput() : '';
    var newData = output.slice(preLen);
    if (newData.length > 0) {
      engine.processEvent({ type: 'outputWritten', data: newData });
      preLen = output.length;
    }
    syncEngineModeFromTerminal(engine, term);
    
    if (engine.getState().mode === 'priv-exec') {
      return true;
    }
  }

  return true;
}

// Helper: Run single command
function runSingleCommand(engine, term, cmd) {
  var startTime = Date.now();
  var output = '';

  engine.reset();
  engine.processEvent({ type: 'commandStarted', command: cmd });

  var preLen = term.getOutput ? term.getOutput().length : 0;
  term.enterCommand(cmd);

  for (var i = 0; i < 30; i++) {
    var fullOutput = term.getOutput ? term.getOutput() : '';
    var newData = fullOutput.slice(preLen);

    if (newData.length > 0) {
      engine.processEvent({ type: 'outputWritten', data: newData });
      preLen = fullOutput.length;
      output = fullOutput;
    }

    if (engine.getState().paging) {
      engine.advancePaging();
      term.enterCommand(' ');
    }

    // NOTE: Auto-confirm 'y' removed - caused issues where router interprets 'y' as command
    // Confirmations should only be handled explicitly when we know the operation requires it

    if (engine.isComplete()) break;
  }

  engine.processEvent({ type: 'commandEnded' });

  return {
    ok: engine.getExecutionState() === 'completed',
    raw: output,
    diagnostics: {
      source: 'terminal',
      completionReason: engine.getExecutionState() === 'completed' ? 
        'command-ended' : 'timeout',
      errors: []
    },
    executionTimeMs: Date.now() - startTime
  };
}

// Helper: Check if error is recoverable
function isRecoverable(result) {
  return result.diagnostics.completionReason !== 'privilege-error' &&
         result.diagnostics.completionReason !== 'desync' &&
         result.diagnostics.completionReason !== 'terminal-unavailable';
}

function handleConfigIos(payload) {
  var deviceName = payload.device;
  var device = getNet().getDevice(deviceName);
  
  if (!device) {
    return {
      ok: false,
      device: deviceName,
      error: 'Device not found',
      results: [],
      diagnostics: {
        source: 'terminal',
        completionReason: 'terminal-unavailable',
        errors: ['Device not found: ' + deviceName]
      }
    };
  }

  var term;
  try {
    term = device.getCommandLine();
  } catch (e) {
    return {
      ok: false,
      device: deviceName,
      error: 'Device does not support CLI',
      results: [],
      diagnostics: {
        source: 'terminal',
        completionReason: 'terminal-unavailable',
        errors: [String(e)]
      }
    };
  }

  if (!term) {
    return {
      ok: false,
      device: deviceName,
      error: 'Device does not support CLI',
      results: [],
      diagnostics: {
        source: 'terminal',
        completionReason: 'terminal-unavailable',
        errors: ['CLI not available']
      }
    };
  }

  var engine = new IosSessionEngine('user-exec', '>');
  var startTime = Date.now();
  var results = [];
  var failedIndex = -1;

  try {
    dprint('[handleConfigIos] Ensuring privileged mode');
    if (!ensurePrivilegedExec(engine, term)) {
      return {
        ok: false,
        device: deviceName,
        error: 'Failed to enter privileged exec mode',
        results: [],
        diagnostics: {
          source: 'terminal',
          completionReason: 'privilege-error',
          errors: ['Cannot enter enable mode']
        }
      };
    }

    dprint('[handleConfigIos] Ensuring config mode');
    if (!ensureConfigMode(engine, term)) {
      return {
        ok: false,
        device: deviceName,
        error: 'Failed to enter configuration mode',
        results: [],
        diagnostics: {
          source: 'terminal',
          completionReason: 'mode-transition-error',
          errors: ['Cannot enter config mode']
        }
      };
    }

    // Execute commands
    var commands = payload.commands || [];
    dprint('[handleConfigIos] Executing ' + commands.length + ' commands');

    for (var i = 0; i < commands.length; i++) {
      var cmd = commands[i];
      dprint('[handleConfigIos] Command ' + i + ': ' + cmd);

      var result = runSingleCommand(engine, term, cmd);

      results.push({
        index: i,
        command: cmd,
        ok: result.ok,
        output: result.raw.slice(0, 500),
        sessionAfter: engine.getState(),
        interaction: engine.getMetrics(),
        diagnostics: result.diagnostics
      });

      if (!result.ok && !isRecoverable(result)) {
        failedIndex = i;
        break;
      }
    }

    // Save if required
    if (payload.save !== false && failedIndex === -1) {
      dprint('[handleConfigIos] Saving configuration');
      
      exitConfigMode(engine, term);
      
      var saveResult = runSingleCommand(engine, term, 'write memory');
      results.push({
        command: 'write memory',
        ok: saveResult.ok,
        output: saveResult.raw,
        diagnostics: saveResult.diagnostics
      });

      if (!saveResult.ok) {
        failedIndex = results.length - 1;
      }
    }

    var executionTime = Date.now() - startTime;

    return {
      ok: failedIndex === -1,
      device: deviceName,
      executedCount: results.filter(function(r) { return r.ok; }).length,
      failedCount: results.filter(function(r) { return !r.ok; }).length,
      failedIndex: failedIndex,
      results: results,
      session: engine.getState(),
      diagnostics: {
        source: 'terminal',
        completionReason: failedIndex === -1 ? 'command-ended' : 'config-failed',
        errors: failedIndex !== -1 ? ['Configuration failed at command ' + failedIndex] : []
      },
      executionTimeMs: executionTime
    };

  } catch (error) {
    dprint('[handleConfigIos] Exception: ' + String(error));
    return {
      ok: false,
      device: deviceName,
      error: String(error),
      results: results,
      diagnostics: {
        source: 'terminal',
        completionReason: 'unknown',
        errors: [String(error)]
      }
    };
  }
};
}
    };
  }
  }
`;
}
