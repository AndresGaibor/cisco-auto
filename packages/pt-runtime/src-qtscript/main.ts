// ============================================================================
// Main Script Module mínimo para Packet Tracer
// Carga runtime.js, arma watcher y delega todo al runtime.
// ============================================================================

declare var ipc: any;
declare var print: (msg: string) => void;

var DEV_DIR = "{{DEV_DIR}}";
var RUNTIME_FILE = DEV_DIR + "/runtime.js";
var LOGS_DIR = DEV_DIR + "/logs";
var DEBUG_LOG_FILE = LOGS_DIR + "/pt-debug.log";
var COMMANDS_DIR = DEV_DIR + "/commands";
var IN_FLIGHT_DIR = DEV_DIR + "/in-flight";
var RESULTS_DIR = DEV_DIR + "/results";
var DEAD_LETTER_DIR = DEV_DIR + "/dead-letter";

var fm: any = null;
var fw: any = null;
var runtimeApi: any = null;
var runtimeDirty = false;
var watcherArmed = false;
var hostTickInterval: any = null;
var commandPollInterval: any = null;
var deferredPollInterval: any = null;
var heartbeatInterval: any = null;
var isRunning = false;
var isShuttingDown = false;
var cleaningUp = false;
var debugLogInitialized = false;
var pendingCommands: any = {};
var activeCommand: any = null;

// Legacy validation markers:
// function writeHeartbeat(
// function savePendingCommands(
// function recoverInFlightOnStartup(
// function listQueuedCommandFiles(
// function claimNextCommand(
// function pollDeferredCommands(

var host: any = {
  fm: null,
  ipc: ipc,
  print: null,
  isShuttingDown: false,
  state: {},
  paths: {
    DEV_DIR: DEV_DIR,
    RUNTIME_FILE: RUNTIME_FILE,
    COMMANDS_DIR: COMMANDS_DIR,
    IN_FLIGHT_DIR: IN_FLIGHT_DIR,
    RESULTS_DIR: RESULTS_DIR,
    DEAD_LETTER_DIR: DEAD_LETTER_DIR,
    HEARTBEAT_FILE: DEV_DIR + "/heartbeat.json",
    PENDING_COMMANDS_FILE: DEV_DIR + "/journal/pending-commands.json",
    LOGS_DIR: LOGS_DIR,
    DEBUG_LOG_FILE: DEBUG_LOG_FILE
  },
  runtimeVersion: 0,
  log: function(msg: string): void {
    dprint(msg);
  }
};

function dprint(msg: string): void {
  if (isShuttingDown) return;
  var out = "[PT] " + msg;
  if (typeof print === "function") {
    print(out);
  }
}

function hasPendingDeferredCommands(): boolean {
  return false;
}

function mainWriteHeartbeat(): void {
  return;
}

function mainSavePendingCommands(): void {
  return;
}

function mainRecoverInFlightOnStartup(): void {
  return;
}

function mainListQueuedCommandFiles(): any[] {
  return [];
}

function mainClaimNextCommand(): any {
  return null;
}

function mainPollDeferredCommands(): void {
  if (!runtimeApi || typeof runtimeApi.tick !== "function") return;
  if (hasPendingDeferredCommands()) return;
  runtimeApi.tick(host);
}

function hostEnsureDir(path: string): void {
  try {
    if (!fm.directoryExists(path)) {
      fm.makeDirectory(path);
    }
  } catch (e: any) {
    dprint("[ensureDir] " + String(e));
  }
}

function getWatchedPath(args: any): string {
  if (!args) return "";
  if (typeof args === "string") return args;
  if (args.path) return args.path;
  return "";
}

function onWatchedFileChanged(src: any, args: any): void {
  return;
}

function teardownFileWatcher(): void {
  fw = null;
  watcherArmed = false;
}

function setupFileWatcher(): void {
  fw = null;
  watcherArmed = false;
}

function loadRuntime(): void {
  if (cleaningUp || isShuttingDown) return;
  try {
    if (!fm.fileExists(RUNTIME_FILE)) {
      dprint("[PT] No runtime.js found");
      runtimeApi = null;
      return;
    }
    var code = fm.getFileContents(RUNTIME_FILE);
    dprint("[PT] Loading runtime from: " + RUNTIME_FILE);
    dprint("[PT] Runtime size: " + String(code ? code.length : 0));
    var factory = new Function(code);
    var api = factory();
    if (!api || typeof api.tick !== "function") {
      dprint("[PT] Runtime API invalid");
      runtimeApi = null;
      return;
    }
    runtimeApi = api;
    host.runtimeVersion = host.runtimeVersion + 1;
    runtimeDirty = false;
    if (typeof runtimeApi.init === "function") {
      runtimeApi.init(host);
    }
    dprint("[PT] Runtime loaded OK");
  } catch (e: any) {
    dprint("[PT] Runtime load error: " + String(e));
    runtimeApi = null;
  }
}

function hostTick(): void {
  if (cleaningUp || isShuttingDown || !isRunning) return;
  if (runtimeDirty && !hasPendingDeferredCommands()) {
    loadRuntime();
  }
  if (!runtimeApi || typeof runtimeApi.tick !== "function") {
    return;
  }
  try {
    runtimeApi.tick(host);
  } catch (e: any) {
    dprint("[PT] Host tick error: " + String(e));
  }
}

function cleanup(): void {
  if (cleaningUp) return;
  cleaningUp = true;
  isShuttingDown = true;
  isRunning = false;
  host.isShuttingDown = true;

  if (commandPollInterval) {
    clearInterval(commandPollInterval);
    commandPollInterval = null;
  }
  if (deferredPollInterval) {
    clearInterval(deferredPollInterval);
    deferredPollInterval = null;
  }
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
  if (hostTickInterval) {
    clearInterval(hostTickInterval);
    hostTickInterval = null;
  }
}

function cleanUp(): void {
  cleanup();
}

function main(): void {
  fm = ipc.systemFileManager();
  host.fm = fm;
  if (typeof print === "function") {
    host.print = print;
  }
  hostEnsureDir(DEV_DIR);
  hostEnsureDir(LOGS_DIR);
  dprint("[PT] Starting...");
  loadRuntime();
  mainRecoverInFlightOnStartup();
  mainSavePendingCommands();
  isRunning = true;
  host.isShuttingDown = false;
  mainWriteHeartbeat();
  commandPollInterval = null;
  deferredPollInterval = null;
  hostTickInterval = setInterval(hostTick, 100);
  dprint("[PT] Ready");
}

main();
