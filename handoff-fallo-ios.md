# Handoff técnico del fallo IOS

## Resumen

Estamos migrando `config-ios` y `exec-ios` a un modelo event-driven con jobs diferidos y sesiones persistentes por dispositivo. El problema actual es que el `runtime.js` generado quedó roto con `SyntaxError: Unexpected EOF`, así que Packet Tracer no puede cargar el runtime nuevo.

## Qué está pasando

- El runtime de PT se ensambla desde `packages/pt-runtime/src/templates/main.ts`.
- `main.ts` ahora importa y concatena `main-pipeline-template.ts` y `main-ios-jobs-template.ts`.
- `config-ios` y `exec-ios` ya no deben ejecutar lógica sintética; ahora crean jobs diferidos con `createIosJob(...)`.
- El fallo visible es de parseo del JS generado, no de negocio: el runtime desplegado en `pt-dev/runtime.js` termina truncado o con un bloque sin cerrar.

## Error observado

`SyntaxError: Unexpected EOF` al evaluar `runtime.js` con `new Function(...)` dentro de Packet Tracer.

## Hipótesis principal

El cambio para mover IOS a jobs diferidos dejó mal formada la plantilla generada. Los sospechosos más fuertes son:

- `packages/pt-runtime/src/templates/ios-config-handlers-template.ts`
- `packages/pt-runtime/src/templates/ios-exec-handlers-template.ts`
- `packages/pt-runtime/src/templates/main-ios-jobs-template.ts`
- `packages/pt-runtime/src/templates/main.ts`

## Cambios que ya estaban en curso

- Se formalizó una sesión IOS explícita con `IOS_SESSIONS`.
- Se añadió `terminalPolicy` a los payloads IOS.
- `handlePollDeferred(...)` ya usa un snapshot más rico de sesión/resultados.
- `IosService` en `pt-control` ahora trata `source: "terminal-events"` como la ruta buena y rechaza resultados sintéticos.

## Estado del worktree

Archivos modificados relevantes:

- `packages/pt-runtime/src/templates/main.ts`
- `packages/pt-runtime/src/templates/main-pipeline-template.ts`
- `packages/pt-runtime/src/templates/main-ios-jobs-template.ts`
- `packages/pt-runtime/src/templates/session-template.ts`
- `packages/pt-runtime/src/templates/ios-config-handlers-template.ts`
- `packages/pt-runtime/src/templates/ios-exec-handlers-template.ts`
- `packages/pt-runtime/src/handlers/config.ts`
- `packages/pt-runtime/src/handlers/config-types.ts`
- `packages/pt-control/src/application/services/ios-service.ts`
- `packages/pt-control/src/application/services/ios-service.test.ts`
- `packages/ios-domain/src/parsers/index.ts`

## Archivos clave con contenido completo

### `packages/pt-runtime/src/templates/ios-config-handlers-template.ts`

```ts
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
    var stepHandled = false;

    if (/initial configuration dialog/i.test(output) || /continue with configuration dialog/i.test(output)) {
      term.enterCommand('no');
      stepHandled = true;
    }

    if (/terminate autoinstall/i.test(output)) {
      term.enterCommand('yes');
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
  if (state.mode === 'priv-exec') return;

  var preLen = term.getOutput ? term.getOutput().length : 0;

  if (dismissInitialDialogIfNeeded(engine, term)) {
    preLen = term.getOutput ? term.getOutput().length : preLen;
  }
  syncEngineModeFromTerminal(engine, term);
  if (engine.getState().mode === 'priv-exec') return;

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
      return;
    }
  }
}

// Helper: Ensure config mode
function ensureConfigMode(engine, term) {
  var state = engine.getState();
  if (state.mode.indexOf('config') === 0) return;

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
      return;
    }
  }
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
      return;
    }
  }
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

    if (engine.getState().awaitingConfirm) {
      engine.answerConfirm('y');
      term.enterCommand('y');
    }

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
  if (payload && payload.type === '__pollDeferred') {
    return pollIosJob(payload.ticket);
  }
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

  var ticket = createIosJob('configIos', {
    device: deviceName,
    commands: payload.commands,
    save: payload.save !== false,
    stopOnError: payload.stopOnError !== false,
    ensurePrivileged: true,
    dismissInitialDialog: true,
    commandTimeoutMs: payload.commandTimeoutMs || 8000,
    stallTimeoutMs: payload.stallTimeoutMs || 15000,
    terminalPolicy: payload.terminalPolicy || {}
  });

  return { deferred: true, ticket: ticket, kind: 'ios' };
}
 `;
}
```

### `packages/pt-runtime/src/templates/ios-exec-handlers-template.ts`

```ts
/**
 * Runtime IOS Execution Handlers Template
 * Uses synchronous execution with terminal
 */

import { generateParserCode } from "../utils/parser-generator";

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
  if (payload && payload.type === '__pollDeferred') {
    return pollIosJob(payload.ticket);
  }
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

  var ticket = createIosJob('execIos', {
    device: deviceName,
    command: payload.command,
    parse: payload.parse !== false,
    ensurePrivileged: payload.ensurePrivileged !== false,
    dismissInitialDialog: true,
    commandTimeoutMs: payload.commandTimeoutMs || 8000,
    stallTimeoutMs: payload.stallTimeoutMs || 15000,
    terminalPolicy: payload.terminalPolicy || {}
  });

  return { deferred: true, ticket: ticket, kind: 'ios' };
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

        if (engine.getState().awaitingConfirm) {
          recorder.record("confirmAnswered", {});
          engine.answerConfirm("y");
          term.enterCommand("y");
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
```

### `packages/pt-runtime/src/templates/main.ts`

```ts
// ============================================================================
// Main.js Template - PT Script Module (Fase 5)
// ============================================================================
// PIPELINE DURABLE: commands/, in-flight/, results/, dead-letter/, journal NDJSON
// ============================================================================

import { generateMainPipelineTemplate } from "./main-pipeline-template.js";
import { generateMainIosJobsTemplate } from "./main-ios-jobs-template.js";

export const MAIN_JS_TEMPLATE = `
/**
 * PT Control V2 - Main Script Module (Fase 5)
 *
 * RESPONSABILIDADES (Pipeline Durable):
 * 1. Poll commands/*.json (en lugar de command.json)
 * 2. Claim por move (mover de commands/ a in-flight/)
 * 3. Mantener journal de comandos para recovery
 * 4. Soportar resultados inmediatos Y diferidos (IOS)
 * 5. Polling de jobs IOS hasta completar
 * 6. Hot reload seguro de runtime.js (solo sin jobs activos)
 * 7. Cleanup idempotente en stop
 * 8. Recovery de in-flight/ al iniciar
 * 9. Compatibilidad legacy con command.json
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
var HEARTBEAT_FILE = DEV_DIR + "/heartbeat.json";
var SESSIONS_DIR = DEV_DIR + "/sessions";
var JOURNAL_DIR = DEV_DIR + "/journal";
var PENDING_COMMANDS_FILE = JOURNAL_DIR + "/pending-commands.json";
var CLEANUP_TRACE_FILE = JOURNAL_DIR + "/cleanup-last-stage.txt";

// Legacy compatibility
var COMMAND_FILE = DEV_DIR + "/command.json";
var CURRENT_COMMAND_FILE = JOURNAL_DIR + "/current-command.json";

var fm = null;
var runtimeFn = null;

var commandPollInterval = null;
var heartbeatInterval = null;
var deferredPollInterval = null;

var lastCommandId = "";
var isShuttingDown = false;
var isRunning = false;

var pendingCommands = {};
var activeCommand = null;

var runtimeDirty = false;
var fw = null;
var watcherArmed = false;

// ---------------------------------------------------------------------------
// SAFETY GUARDS (crash hotfix)
// ---------------------------------------------------------------------------
// Packet Tracer watcher queda DESACTIVADO por defecto hasta validar estabilidad.
var ENABLE_FILE_WATCHER = false;
var WATCH_RUNTIME_FILE = false;
var WATCH_COMMANDS_DIR = false;

var cleanupStage = "idle";

// ============================================================================
// IOS JOBS SYSTEM (Migrated from runtime.js - Phase 5)
// ============================================================================
// El sistema de jobs debe vivir en main.js (Script Engine persistente),
// no en runtime.js (re-cargado con new Function(...))

var IOS_JOBS = {};
var IOS_JOB_SEQ = 0;

var IOS_DEFAULT_COMMAND_TIMEOUT_MS = 8000;
var IOS_DEFAULT_STALL_TIMEOUT_MS = 15000;

// ============================================================================
// Terminal Listeners - Event-based architecture (Migrated from runtime.js)
// ============================================================================

var TERMINAL_LISTENERS_ATTACHED = {};
var TERMINAL_LISTENER_REFS = {};

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
    ensureDir(SESSIONS_DIR);
    ensureDir(JOURNAL_DIR);
    
    // Migrar command.json legacy si existe
    migrateLegacyCommand();
    
    // Phase 1: Lease-aware startup - wait for valid lease instead of aborting
    if (validateBridgeLease()) {
      // Lease is valid - activate runtime immediately
      activateRuntimeAfterLease();
    } else {
      // Lease invalid/missing - enter waiting mode
      startLeaseWaitLoop();
    }
    
  } catch (e) {
    dprint("[FATAL] " + String(e));
  }
}

// ...

${generateMainPipelineTemplate()}

// ...

${generateMainIosJobsTemplate()}
`;
```

### `packages/pt-runtime/src/templates/session-template.ts`

```ts
/**
 * Runtime Session Template - IOS session helpers
 * Expone estado persistente por dispositivo para la capa IOS event-driven.
 */

export function generateSessionTemplate(): string {
  return `// ============================================================================
// IOS Session State - Persistent helpers for runtime.js
// ============================================================================

var IOS_SESSIONS = {};

function createIosSession(deviceName, term) {
  return {
    deviceName: deviceName,
    term: term || null,
    attached: false,
    currentMode: "unknown",
    currentPrompt: "",
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
    job: null,
    listeners: {
      commandStarted: null,
      commandEnded: null,
      outputWritten: null,
      modeChanged: null,
      promptChanged: null,
      moreDisplayed: null,
      directiveSent: null,
      commandSelectedFromHistory: null,
      commandAutoCompleted: null,
      cursorPositionChanged: null
    }
  };
}

function getOrCreateIosSession(deviceName, term) {
  var session = IOS_SESSIONS[deviceName];
  if (!session) {
    session = createIosSession(deviceName, term);
    IOS_SESSIONS[deviceName] = session;
  }

  if (term) {
    session.term = term;
  }

  return session;
}

function inferPromptMode(output) {
  var lastLine = "";
  var lines = String(output || "").split("\n");

  for (var i = lines.length - 1; i >= 0; i--) {
    var line = lines[i].trim();
    if (line) {
      lastLine = line;
      break;
    }
  }

  if (/--More--/i.test(lastLine) || /\x1B\?D/.test(lastLine)) return "paging";
  if (/^\[confirm\]/i.test(lastLine)) return "awaiting-confirm";
  if (/^Password:/i.test(lastLine)) return "awaiting-password";
  if (/\(config[^\)]*\)#\s*$/.test(lastLine)) return "config";
  if (/#\s*$/.test(lastLine)) return "priv-exec";
  if (/>\s*$/.test(lastLine)) return "user-exec";
  return "unknown";
}

function refreshSessionMode(session) {
  var term = session ? session.term : null;
  var prompt = "";
  var mode = "";

  if (!session || !term) return session;

  try { if (term.getPrompt) prompt = String(term.getPrompt() || ""); } catch (e1) {}
  try { if (term.getMode) mode = String(term.getMode() || ""); } catch (e2) {}

  session.currentPrompt = prompt || session.currentPrompt;
  session.currentMode = inferPromptMode(prompt) || mode || session.currentMode;

  if (session.job) {
    session.job.lastPrompt = session.currentPrompt;
    session.job.lastMode = session.currentMode;
  }

  return session;
}

function resetSessionCommandState(session) {
  if (!session) return session;

  session.currentCommand = "";
  session.completeCommand = "";
  session.processedCommand = "";
  session.outputBuffer = "";
  session.lastOutputTs = 0;
  session.waitingMore = false;
  session.waitingConfirm = false;

  if (session.job) {
    session.job.currentCommand = "";
    session.job.currentCommandOutput = "";
    session.job.lastInput = "";
  }

  return session;
}

function enqueueIosOperation(session, operation) {
  if (!session) return;
  session.queue.push(operation);
}

function drainIosQueue(session) {
  if (!session || session.busy || session.queue.length === 0) return null;
  return session.queue.shift() || null;
}

function attachTerminalListeners(session) {
  var term;

  if (!session || session.attached || !session.term) return session;
  term = session.term;

  function updateFromOutput(data) {
    var chunk = String(data || "");
    session.outputBuffer += chunk;
    session.lastOutputTs = Date.now();

    if (session.job) {
      session.job.output += chunk;
      session.job.currentCommandOutput += chunk;
    }
  }

  session.listeners.commandStarted = function(src, args) {
    session.busy = true;
    session.currentCommand = args && args.inputCommand ? String(args.inputCommand) : session.currentCommand;
    session.completeCommand = args && args.completeCommand ? String(args.completeCommand) : session.completeCommand;
    session.processedCommand = args && args.processedCommand ? String(args.processedCommand) : session.processedCommand;
    refreshSessionMode(session);
  };

  session.listeners.outputWritten = function(src, args) {
    updateFromOutput(args && typeof args.newOutput !== "undefined" ? args.newOutput : (args && args.data ? args.data : ""));
  };

  session.listeners.commandEnded = function(src, args) {
    session.busy = false;
    if (session.job) {
      session.job.waitingForCommandEnd = false;
      session.job.status = args && typeof args.status !== "undefined" ? args.status : session.job.status;
    }
    refreshSessionMode(session);
  };

  session.listeners.modeChanged = function(src, args) {
    session.currentMode = args && args.newMode ? String(args.newMode) : session.currentMode;
    if (session.job) session.job.lastMode = session.currentMode;
  };

  session.listeners.promptChanged = function(src, args) {
    session.currentPrompt = args && args.newPrompt ? String(args.newPrompt) : session.currentPrompt;
    if (session.job) session.job.lastPrompt = session.currentPrompt;
    refreshSessionMode(session);
  };

  session.listeners.moreDisplayed = function(src, args) {
    session.waitingMore = true;
    if (session.job) session.job.paged = true;
  };

  session.listeners.directiveSent = function() {
    if (session.job) session.job.externalInteraction = true;
  };

  session.listeners.commandSelectedFromHistory = function() {
    if (session.job) session.job.historyTouched = true;
  };

  session.listeners.commandAutoCompleted = function() {
    if (session.job) session.job.historyTouched = true;
  };

  session.listeners.cursorPositionChanged = function() {
    if (session.job) session.job.dirtyLineDetected = true;
  };

  if (typeof term.registerEvent === "function") {
    term.registerEvent("commandStarted", null, session.listeners.commandStarted);
    term.registerEvent("outputWritten", null, session.listeners.outputWritten);
    term.registerEvent("commandEnded", null, session.listeners.commandEnded);
    term.registerEvent("modeChanged", null, session.listeners.modeChanged);
    term.registerEvent("promptChanged", null, session.listeners.promptChanged);
    term.registerEvent("moreDisplayed", null, session.listeners.moreDisplayed);
    try { term.registerEvent("directiveSent", null, session.listeners.directiveSent); } catch (e1) {}
    try { term.registerEvent("commandSelectedFromHistory", null, session.listeners.commandSelectedFromHistory); } catch (e2) {}
    try { term.registerEvent("commandAutoCompleted", null, session.listeners.commandAutoCompleted); } catch (e3) {}
    try { term.registerEvent("cursorPositionChanged", null, session.listeners.cursorPositionChanged); } catch (e4) {}
  }

  session.attached = true;
  refreshSessionMode(session);
  return session;
}

function detachTerminalListeners(session) {
  var term;

  if (!session || !session.attached) return;
  term = session.term;

  if (term && typeof term.unregisterEvent === "function") {
    try { term.unregisterEvent("commandStarted", null, session.listeners.commandStarted); } catch (e1) {}
    try { term.unregisterEvent("outputWritten", null, session.listeners.outputWritten); } catch (e2) {}
    try { term.unregisterEvent("commandEnded", null, session.listeners.commandEnded); } catch (e3) {}
    try { term.unregisterEvent("modeChanged", null, session.listeners.modeChanged); } catch (e4) {}
    try { term.unregisterEvent("promptChanged", null, session.listeners.promptChanged); } catch (e5) {}
    try { term.unregisterEvent("moreDisplayed", null, session.listeners.moreDisplayed); } catch (e6) {}
    try { term.unregisterEvent("directiveSent", null, session.listeners.directiveSent); } catch (e7) {}
    try { term.unregisterEvent("commandSelectedFromHistory", null, session.listeners.commandSelectedFromHistory); } catch (e8) {}
    try { term.unregisterEvent("commandAutoCompleted", null, session.listeners.commandAutoCompleted); } catch (e9) {}
    try { term.unregisterEvent("cursorPositionChanged", null, session.listeners.cursorPositionChanged); } catch (e10) {}
  }

  session.attached = false;
}

function destroyIosSession(deviceName) {
  var session = IOS_SESSIONS[deviceName];
  if (!session) return;
  detachTerminalListeners(session);
  delete IOS_SESSIONS[deviceName];
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
```

## Resto de archivos tocados

También cambiaron, pero aquí dejo solo su rol porque no parecen ser el origen directo del EOF:

- `packages/pt-runtime/src/handlers/config.ts`: crea jobs diferidos, sanea resultados y arma snapshots de sesión.
- `packages/pt-runtime/src/handlers/config-types.ts`: agrega `terminalPolicy` y amplía `session`/`source`.
- `packages/pt-control/src/application/services/ios-service.ts`: consume resultados terminal-based y rechaza synthetic.
- `packages/pt-control/src/application/services/ios-service.test.ts`: tests de parsers y show commands.
- `packages/ios-domain/src/parsers/index.ts`: parsers reales para show commands.

## Qué revisar primero

1. Confirmar que las plantillas generadas cierran todos los bloques y template strings.
2. Re-generar `runtime.js` con `bun run pt:build`.
3. Validar que `new Function("payload", "ipc", "dprint", code)` ya no falle.
4. Repetir el smoke con `configIos` y `execIos`.

## Próximo paso para la otra IA

Buscar el desajuste exacto entre la plantilla TypeScript y el JS emitido. La pista fuerte está en las plantillas IOS, no en `pt-control`.
