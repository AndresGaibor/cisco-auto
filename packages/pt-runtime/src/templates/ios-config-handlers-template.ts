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
  p = p.trim();
  if (p.indexOf('(config') >= 0) return 'config';
  if (p.indexOf('#') >= 0) return 'priv-exec';
  if (p.indexOf('>') >= 0) return 'user-exec';
  return '';
}

function isNormalPrompt(prompt, mode) {
  var p = String(prompt || '');
  var m = String(mode || '');
  if (!p) return false;
  p = p.trim();
  return p.indexOf('(config') >= 0 ||
    p.indexOf('#') >= 0 ||
    p.indexOf('>') >= 0 ||
    /config/i.test(m) ||
    /priv/i.test(m);
}

function syncEngineModeFromTerminal(engine, term) {
  var prompt = '';
  var mode = '';

  try { prompt = term.getPrompt ? String(term.getPrompt() || '') : ''; } catch (e) {}
  try { mode = term.getMode ? String(term.getMode() || '') : ''; } catch (e) {}

  var inferred = inferModeFromPrompt(prompt);
  dprint('[syncEngineModeFromTerminal] prompt="' + prompt + '" mode="' + mode + '" inferred="' + inferred + '"');
  
  mode = inferred || mode;
  if (mode && engine.getState().mode !== mode) {
    engine.processEvent({ type: 'modeChanged', newMode: mode });
  }
}

function dismissInitialDialogIfNeeded(engine, term) {
  var handled = false;
  var i;

  for (i = 0; i < 10; i++) {
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
  var promptBefore = term.getPrompt ? term.getPrompt() : 'N/A';
  var modeBefore = term.getMode ? term.getMode() : 'N/A';

  dprint('[ensurePrivilegedExec] START prompt="' + promptBefore + '" mode="' + modeBefore + '" engineMode=' + state.mode);

  // Flush any pending output first
  if (term.getOutput) {
    var initialOutput = term.getOutput();
    if (initialOutput && initialOutput.length > 0) {
      dprint('[ensurePrivilegedExec] flushing output len=' + initialOutput.length);
      term.enterCommand('');
      for (var flush = 0; flush < 3; flush++) {
        var newOut = term.getOutput ? term.getOutput() : '';
        if (newOut.length <= initialOutput.length) break;
        initialOutput = newOut;
      }
    }
  }

  if (dismissInitialDialogIfNeeded(engine, term)) {
    preLen = term.getOutput ? term.getOutput().length : preLen;
  }
  syncEngineModeFromTerminal(engine, term);
  if (engine.getState().mode === 'priv-exec') return true;

  // Si estamos en un submode de configuración (config-*, vlan-*, etc.), salir primero
  var currentMode = engine.getState().mode;
  var currentPrompt = term.getPrompt ? term.getPrompt() : '';
  dprint('[ensurePrivilegedExec] currentMode=' + currentMode + ' prompt=' + currentPrompt);
  
  if (currentMode.indexOf('config') === 0 || currentPrompt.indexOf('(config') >= 0) {
    dprint('[ensurePrivilegedExec] In config submode, sending end first');
    term.enterCommand('end');
    preLen = term.getOutput ? term.getOutput().length : 0;
    for (var exitAttempt = 0; exitAttempt < 10; exitAttempt++) {
      var exitOutput = term.getOutput ? term.getOutput() : '';
      var exitPrompt = term.getPrompt ? term.getPrompt() : '';
      syncEngineModeFromTerminal(engine, term);
      if (engine.getState().mode === 'priv-exec') {
        dprint('[ensurePrivilegedExec] Exited config submode to priv-exec');
        return true;
      }
    }
  }

  term.enterCommand('enable');
  dprint('[ensurePrivilegedExec] sent enable');

  for (var i = 0; i < 20; i++) {
    var output = term.getOutput ? term.getOutput() : '';
    var newData = output.slice(preLen);
    if (newData.length > 0) {
      engine.processEvent({ type: 'outputWritten', data: newData });
      preLen = output.length;
      dprint('[ensurePrivilegedExec] iter ' + i + ' newData len=' + newData.length);
    }

    syncEngineModeFromTerminal(engine, term);
    
    if (engine.getState().mode === 'priv-exec') {
      dprint('[ensurePrivilegedExec] found priv-exec at iter ' + i);
      break;
    }
  }

  syncEngineModeFromTerminal(engine, term);
  if (engine.getState().mode === 'priv-exec') return true;

  return false;
}

// Helper: Ensure config mode
function ensureConfigMode(engine, term) {
  var state = engine.getState();
  if (state.mode.indexOf('config') === 0) return true;

  var preLen = term.getOutput ? term.getOutput().length : 0;
  var promptBefore = term.getPrompt ? term.getPrompt() : 'N/A';
  var modeBefore = term.getMode ? term.getMode() : 'N/A';

  dprint('[ensureConfigMode] START prompt=' + promptBefore + ' mode=' + modeBefore + ' engineMode=' + state.mode);

  if (dismissInitialDialogIfNeeded(engine, term)) {
    preLen = term.getOutput ? term.getOutput().length : preLen;
  }
  syncEngineModeFromTerminal(engine, term);
  if (engine.getState().mode.indexOf('config') === 0) {
    dprint('[ensureConfigMode] returned true after initial sync');
    return true;
  }

  term.enterCommand('configure terminal');
  dprint('[ensureConfigMode] sent configure terminal');

  for (var i = 0; i < 20; i++) {
    var output = term.getOutput ? term.getOutput() : '';
    var newData = output.slice(preLen);
    if (newData.length > 0) {
      engine.processEvent({ type: 'outputWritten', data: newData });
      preLen = output.length;
      dprint('[ensureConfigMode] iter ' + i + ' newData len=' + newData.length + ' output len=' + output.length);
    }
    syncEngineModeFromTerminal(engine, term);
    var currentMode = engine.getState().mode;
    dprint('[ensureConfigMode] iter ' + i + ' engineMode=' + currentMode);
    
    if (currentMode.indexOf('config') === 0) {
      dprint('[ensureConfigMode] found config mode at iter ' + i);
      break;
    }
  }

  syncEngineModeFromTerminal(engine, term);
  var finalMode = engine.getState().mode;
  dprint('[ensureConfigMode] END finalMode=' + finalMode);
  if (finalMode.indexOf('config') === 0) return true;

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

  return false;
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

  var startTime = Date.now();
  var results = [];
  var failedIndex = -1;

  try {
    var preLen = term.getOutput ? term.getOutput().length : 0;
    var prompt = term.getPrompt ? term.getPrompt() : "";
    var currentMode = "user-exec";

    if (prompt.indexOf("(config") >= 0) {
      currentMode = "config";
    } else if (prompt.indexOf("#") >= 0) {
      currentMode = "priv-exec";
    } else if (prompt.indexOf(">") >= 0) {
      currentMode = "user-exec";
    }

    dprint('[handleConfigIos] Initial mode: ' + currentMode + ' prompt: ' + prompt);

    // Usar helpers robustos que usan el engine state machine
    var engine = new IosSessionEngine("user-exec", ">");
    
    if (engine) {
      dprint('[handleConfigIos] Using ensurePrivilegedExec helper');
      var privOk = ensurePrivilegedExec(engine, term);
      dprint('[handleConfigIos] ensurePrivilegedExec result: ' + privOk);
      
      if (!privOk) {
        var debugOutput = term.getOutput ? term.getOutput() : "";
        var debugPrompt = term.getPrompt ? term.getPrompt() : "N/A";
        var debugMode = term.getMode ? term.getMode() : "N/A";
        return {
          ok: false,
          device: deviceName,
          error: 'Failed to enter privileged exec mode',
          results: [],
          diagnostics: {
            source: 'terminal',
            completionReason: 'privilege-error',
            errors: ['Cannot enter enable mode', 'prompt=' + debugPrompt, 'mode=' + debugMode, 'outputLen=' + debugOutput.length, 'outputSample=' + debugOutput.slice(-300)]
          }
        };
      }
      
      dprint('[handleConfigIos] Using ensureConfigMode helper');
      var configOk = ensureConfigMode(engine, term);
      dprint('[handleConfigIos] ensureConfigMode result: ' + configOk);
      
      if (!configOk) {
        var debugOutput = term.getOutput ? term.getOutput() : "";
        var debugPrompt = term.getPrompt ? term.getPrompt() : "N/A";
        var debugMode = term.getMode ? term.getMode() : "N/A";
        return {
          ok: false,
          device: deviceName,
          error: 'Failed to enter configuration mode',
          results: [],
          diagnostics: {
            source: 'terminal',
            completionReason: 'mode-transition-error',
            errors: ['Cannot enter config mode', 'prompt=' + debugPrompt, 'mode=' + debugMode, 'outputLen=' + debugOutput.length, 'outputSample=' + debugOutput.slice(-500)]
          }
        };
      }
      
      currentMode = "config";
    } else {
      dprint('[handleConfigIos] No engine available, using legacy approach');
      
      // Flush initial output
      term.enterCommand("");
      for (var flush = 0; flush < 5; flush++) {
        var flushOut = term.getOutput ? term.getOutput() : "";
        if (flushOut.length <= preLen) break;
        preLen = flushOut.length;
      }

      // Ensure privileged exec - always try enable regardless of detected mode
      dprint('[handleConfigIos] Sending enable');
      term.enterCommand("enable");
      preLen = term.getOutput ? term.getOutput().length : 0;
      
      for (var i = 0; i < 20; i++) {
        var checkOutput = term.getOutput ? term.getOutput() : "";
        if (checkOutput.indexOf("#") >= 0) {
          currentMode = "priv-exec";
          prompt = term.getPrompt ? term.getPrompt() : prompt;
          dprint('[handleConfigIos] Now in priv-exec, prompt=' + prompt);
          break;
        }
      }
      
      if (currentMode !== "priv-exec") {
        var debugOutput = term.getOutput ? term.getOutput() : "";
        var debugPrompt = term.getPrompt ? term.getPrompt() : "N/A";
        var debugMode = term.getMode ? term.getMode() : "N/A";
        return {
          ok: false,
          device: deviceName,
          error: 'Failed to enter privileged exec mode',
          results: [],
          diagnostics: {
            source: 'terminal',
            completionReason: 'privilege-error',
            errors: ['Cannot enter enable mode', 'prompt=' + debugPrompt, 'mode=' + debugMode, 'outputLen=' + debugOutput.length, 'outputSample=' + debugOutput.slice(-300)]
          }
        };
      }

      // Ensure config mode - always try configure terminal
      dprint('[handleConfigIos] Sending configure terminal');
      term.enterCommand("configure terminal");
      preLen = term.getOutput ? term.getOutput().length : 0;
      
      for (var i = 0; i < 20; i++) {
        var checkOutput = term.getOutput ? term.getOutput() : "";
        if (checkOutput.indexOf("(config") >= 0) {
          currentMode = "config";
          prompt = term.getPrompt ? term.getPrompt() : prompt;
          dprint('[handleConfigIos] Now in config mode, prompt=' + prompt);
          break;
        }
      }
      
      if (currentMode !== "config") {
        var debugOutput = term.getOutput ? term.getOutput() : "";
        var debugPrompt = term.getPrompt ? term.getPrompt() : "N/A";
        var debugMode = term.getMode ? term.getMode() : "N/A";
        return {
          ok: false,
          device: deviceName,
          error: 'Failed to enter configuration mode',
          results: [],
          diagnostics: {
            source: 'terminal',
            completionReason: 'mode-transition-error',
            errors: ['Cannot enter config mode', 'prompt=' + debugPrompt, 'mode=' + debugMode, 'outputLen=' + debugOutput.length, 'outputSample=' + debugOutput.slice(-500)]
          }
        };
      }
    }

    // Execute commands using engine state machine
    var commands = payload.commands || [];
    dprint('[handleConfigIos] Executing ' + commands.length + ' commands');

    for (var i = 0; i < commands.length; i++) {
      var cmd = commands[i];
      dprint('[handleConfigIos] Command ' + i + ': ' + cmd);

      engine.reset();
      engine.processEvent({ type: 'commandStarted', command: cmd });

      preLen = term.getOutput ? term.getOutput().length : 0;
      term.enterCommand(cmd);

      var maxAttempts = 100;
      var attempt = 0;
      var output = "";

      while (attempt < maxAttempts && !engine.isComplete()) {
        var fullOutput = term.getOutput ? term.getOutput() : "";
        var newData = fullOutput.slice(preLen);

        if (newData.length > 0) {
          engine.processEvent({ type: 'outputWritten', data: newData });
          preLen = fullOutput.length;
          output = fullOutput;
        }

        if (engine.getState().paging) {
          engine.advancePaging();
          term.enterCommand(" ");
        }

        syncEngineModeFromTerminal(engine, term);

        var prompt = term.getPrompt ? term.getPrompt() : "";
        if (prompt && (prompt.indexOf("(config") >= 0 || prompt.indexOf("#") >= 0)) {
          if (engine.getState().state === "awaiting-output" || engine.getState().state === "idle") {
            engine.processEvent({ type: 'commandEnded' });
            break;
          }
        }

        attempt++;
      }

      if (!engine.isComplete()) {
        if (engine.hasInteractivePending()) {
          engine.processEvent({ type: 'timeout' });
        } else {
          engine.processEvent({ type: 'commandEnded' });
        }
      }

      var state = engine.getExecutionState();
      var engineState = engine.getState();
      var ok = state === "completed" && !engineState.awaitingConfirm && !engineState.awaitingPassword;

      results.push({
        index: i,
        command: cmd,
        ok: ok,
        output: output.slice(0, 500),
        diagnostics: {
          source: 'terminal',
          completionReason: ok ? 'command-ended' : 'timeout',
          errors: ok ? [] : ['Command failed or incomplete']
        }
      });

      dprint('[handleConfigIos] Command ' + i + ' result: ok=' + ok + ' state=' + state + ' outputLen=' + output.length);

      if (!ok) {
        failedIndex = i;
        break;
      }
    }

    // Save if required
    if (payload.save !== false && failedIndex === -1) {
      dprint('[handleConfigIos] Saving configuration');
      
      term.enterCommand("end");
      preLen = term.getOutput ? term.getOutput().length : 0;
      for (var i = 0; i < 10; i++) {
        var checkOutput = term.getOutput ? term.getOutput() : "";
        if (checkOutput.indexOf("#") >= 0) break;
      }
      
      term.enterCommand("write memory");
      preLen = term.getOutput ? term.getOutput().length : 0;
      for (var i = 0; i < 30; i++) {
        var checkOutput = term.getOutput ? term.getOutput() : "";
        if (checkOutput.indexOf("#") >= 0) break;
      }

      results.push({
        command: 'write memory',
        ok: true,
        output: '',
        diagnostics: {
          source: 'terminal',
          completionReason: 'command-ended',
          errors: []
        }
      });
    }

    var executionTime = Date.now() - startTime;

    return {
      ok: failedIndex === -1,
      device: deviceName,
      executedCount: results.filter(function(r) { return r.ok; }).length,
      failedCount: results.filter(function(r) { return !r.ok; }).length,
      failedIndex: failedIndex,
      results: results,
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
}
`;
}
