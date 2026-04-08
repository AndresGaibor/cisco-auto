import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir, platform } from "node:os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const generatedDir = resolve(ROOT, "generated");
const distDir = resolve(ROOT, "dist-qtscript");
const devDir = process.env.PT_DEV_DIR || (platform() === "win32"
  ? resolve(process.env.USERPROFILE || homedir(), "pt-dev")
  : resolve(homedir(), "pt-dev"));

console.log("[Bundle] Starting...");

// Ensure generated directory exists
if (!existsSync(generatedDir)) {
  mkdirSync(generatedDir, { recursive: true });
}

// Read runtime-combined.js
const runtimePath = resolve(distDir, "runtime-combined.js");

if (!existsSync(runtimePath)) {
  console.error("[Bundle] runtime-combined.js not found. Run: bun run build:es3");
  process.exit(1);
}

console.log("[Bundle] Reading runtime-combined.js...");
let code = readFileSync(runtimePath, "utf-8");

// Clean TypeScript output
code = code
  .replace(/"use strict";\n?/g, "")
  .replace(/\n{3,}/g, "\n\n")
  .trim();

// Runtime bundle (dispatcher)
const runtimeCode = `/**
 * PT Control V2 - Runtime (ES5 Compatible for Qt Script)
 * Auto-generated - DO NOT EDIT MANUALLY
 * This code runs inside Packet Tracer Script Engine with full IPC access.
 */

${code}

// Entry point - this file is executed as the body of:
// new Function("payload", "ipc", "dprint", "iosJobs", code)
return dispatch(payload, ipc, dprint, iosJobs);
`;

// Write runtime.js
writeFileSync(resolve(generatedDir, "runtime.js"), runtimeCode, "utf-8");
console.log("[Bundle] Generated generated/runtime.js (" + runtimeCode.length + " chars)");

// Main bundle (IOS_JOBS state machine)
const mainCode = `/**
 * PT Control V2 - Main Script Module (ES5 Compatible for Qt Script)
 * This is the persistent Script Engine module that manages IOS jobs.
 * Auto-generated - DO NOT EDIT MANUALLY.
 */

// ============================================================================
// Directory Paths (injected by PT)
// ============================================================================

var DEV_DIR = ${JSON.stringify(devDir)};
var RUNTIME_FILE = DEV_DIR + "/runtime.js";
var COMMANDS_DIR = DEV_DIR + "/commands";
var IN_FLIGHT_DIR = DEV_DIR + "/in-flight";
var RESULTS_DIR = DEV_DIR + "/results";
var HEARTBEAT_FILE = DEV_DIR + "/heartbeat.json";
var PENDING_COMMANDS_FILE = DEV_DIR + "/journal/pending-commands.json";

// ============================================================================
// Global State
// ============================================================================

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

// IOS Jobs System
var IOS_JOBS = {};
var IOS_JOB_SEQ = 0;

// ============================================================================
// Helpers
// ============================================================================

function dprint(msg) {
  if (typeof print === "function") {
    print("[PT] " + msg);
  }
}

function ensureDir(path) {
  try {
    if (!fm.directoryExists(path)) {
      fm.makeDirectory(path);
    }
  } catch (e) {
    dprint("[ensureDir] " + String(e));
  }
}

function padSeq(n) {
  var s = String(n);
  while (s.length < 12) s = "0" + s;
  return s;
}

function objectKeys(obj) {
  var keys = [];
  if (!obj) return keys;
  for (var key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      keys.push(key);
    }
  }
  return keys;
}

// ============================================================================
// IOS Jobs
// ============================================================================

function createIosJob(type, payload) {
  var ticket = "ios_job_" + (++IOS_JOB_SEQ);
  IOS_JOBS[ticket] = {
    ticket: ticket,
    type: type,
    payload: payload,
    device: payload.device,
    state: "queued",
    phase: "queued",
    finished: false,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  dprint("[Job] Created " + ticket + " for " + payload.device + " type=" + type);
  return ticket;
}

function failIosJob(ticket, error, code) {
  var job = IOS_JOBS[ticket];
  if (job) {
    job.finished = true;
    job.state = "error";
    job.error = error;
    job.errorCode = code || "UNKNOWN";
    job.updatedAt = Date.now();
    dprint("[Job] Failed " + ticket + ": " + error);
  }
}

function completeIosJob(ticket, output) {
  var job = IOS_JOBS[ticket];
  if (job) {
    job.finished = true;
    job.state = "completed";
    job.output = output;
    job.updatedAt = Date.now();
    dprint("[Job] Completed " + ticket);
  }
}

// ============================================================================
// Command Queue
// ============================================================================

function claimNextCommand() {
  var files = fm.getFilesInDirectory(COMMANDS_DIR);
  if (!files || files.length === 0) return null;

  for (var i = 0; i < files.length; i++) {
    var filename = files[i];
    if (filename.indexOf(".json") === -1) continue;

    var parts = filename.split("-");
    if (parts.length < 2) continue;

    var seq = parseInt(parts[0], 10);
    var cmdId = "cmd_" + padSeq(seq);

    var srcPath = COMMANDS_DIR + "/" + filename;
    var dstPath = IN_FLIGHT_DIR + "/" + filename;

    try {
      fm.writePlainTextToFile(dstPath, fm.getFileContents(srcPath));
      fm.removeFile(srcPath);
      var content = fm.getFileContents(dstPath);
      var cmd = JSON.parse(content);
      return { id: cmdId, seq: seq, command: cmd };
    } catch (e) {
      dprint("[PT] Error claiming command: " + filename);
    }
  }

  return null;
}

function writeResult(cmdId, result) {
  var resultPath = RESULTS_DIR + "/" + cmdId + ".json";
  var envelope = {
    protocolVersion: 2,
    id: cmdId,
    seq: result.seq || 0,
    startedAt: result.startedAt || Date.now(),
    completedAt: Date.now(),
    status: result.ok ? "completed" : "failed",
    ok: !!result.ok,
    value: result.ok ? result.value : { ok: false, error: result.error }
  };

  fm.writePlainTextToFile(resultPath, JSON.stringify(envelope, null, 2));
}

function executeActiveCommand() {
  if (!runtimeFn) {
    dprint("[PT] Runtime not loaded");
    return;
  }

  var claimed = claimNextCommand();
  if (!claimed) return;

  var cmd = claimed.command;
  dprint("[PT] Executing: " + cmd.type);

  var startedAt = Date.now();

  try {
    var result = runtimeFn(cmd.payload, ipc, dprint, IOS_JOBS);

    if (result && result.deferred === true) {
      pendingCommands[claimed.id] = {
        id: claimed.id,
        ticket: result.ticket,
        kind: result.kind || "ios",
        startedAt: startedAt,
        command: cmd
      };

      dprint("[PT] Deferred: " + cmd.type + " [" + claimed.id + "] ticket=" + result.ticket);
      savePendingCommands();
    } else {
      writeResult(claimed.id, {
        seq: claimed.seq,
        startedAt: startedAt,
        ok: result && result.ok !== false,
        value: result
      });
      dprint("[PT] Executed: " + cmd.type + " [" + claimed.id + "]");
    }
  } catch (e) {
    var errMsg = e && e.message ? e.message : String(e);
    writeResult(claimed.id, {
      seq: claimed.seq,
      startedAt: startedAt,
      ok: false,
      error: errMsg
    });
    dprint("[PT] Error executing " + cmd.type + ": " + errMsg);
  }
}

function pollDeferredCommands() {
  if (!isRunning || isShuttingDown) return;

  var keys = objectKeys(pendingCommands);
  if (keys.length === 0) return;

  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    var pending = pendingCommands[key];

    var pollResult = null;
    try {
      pollResult = runtimeFn(
        { type: "__pollDeferred", ticket: pending.ticket },
        ipc,
        dprint,
        IOS_JOBS
      );
    } catch (e) {
      dprint("[PT] Poll error: " + String(e));
      continue;
    }

    if (!pollResult || pollResult.done !== true) {
      continue;
    }

    writeResult(pending.id, {
      seq: pending.command ? pending.command.seq : 0,
      startedAt: pending.startedAt,
      ok: pollResult.ok,
      value: pollResult.ok ? pollResult.value : { ok: false, error: pollResult.error }
    });

    dprint("[PT] Deferred completed: " + pending.id + " status=" + (pollResult.ok ? "ok" : "failed"));

    delete pendingCommands[key];
    savePendingCommands();
  }
}

function savePendingCommands() {
  fm.writePlainTextToFile(PENDING_COMMANDS_FILE, JSON.stringify(pendingCommands));
}

function loadPendingCommands() {
  if (!fm.fileExists(PENDING_COMMANDS_FILE)) return;

  try {
    var content = fm.getFileContents(PENDING_COMMANDS_FILE);
    if (content && content.trim().length > 0) {
      var restored = JSON.parse(content);
      pendingCommands = restored;
      dprint("[journal] restored " + objectKeys(restored).length + " pending commands");
    }
  } catch (e) {
    dprint("[journal] load pending error: " + String(e));
  }
}

// ============================================================================
// Main Entry Point
// ============================================================================

function main() {
  dprint("[PT] Starting...");

  fm = ipc.systemFileManager();

  ensureDir(COMMANDS_DIR);
  ensureDir(IN_FLIGHT_DIR);
  ensureDir(RESULTS_DIR);
  ensureDir(DEV_DIR + "/logs");

  loadPendingCommands();

  commandPollInterval = setInterval(executeActiveCommand, 100);
  deferredPollInterval = setInterval(pollDeferredCommands, 100);
  heartbeatInterval = setInterval(writeHeartbeat, 5000);

  writeHeartbeat();
  isRunning = true;

  dprint("[PT] Ready");
}

function loadRuntime() {
  try {
    dprint("[PT] Loading runtime from: " + RUNTIME_FILE);
    var code = fm.getFileContents(RUNTIME_FILE);
    dprint("[PT] Runtime size: " + String(code ? code.length : 0));
    try {
      fm.writePlainTextToFile(DEV_DIR + "/runtime.loaded.dump.js", code || "");
    } catch (dumpErr) {
      dprint("[PT] Runtime dump error: " + String(dumpErr));
    }
    var testFn = new Function("payload", "ipc", "dprint", "iosJobs", code);
    runtimeFn = testFn;
    dprint("[PT] Runtime loaded OK");
  } catch (e) {
    dprint("[PT] Runtime load error: " + String(e));
    runtimeFn = null;
  }
}

function writeHeartbeat() {
  var heartbeat = {
    ownerId: "pt-runtime",
    pid: 0,
    startedAt: Date.now(),
    updatedAt: Date.now()
  };
  fm.writePlainTextToFile(HEARTBEAT_FILE, JSON.stringify(heartbeat, null, 2));
}

function cleanup() {
  isShuttingDown = true;
  isRunning = false;

  if (commandPollInterval) clearInterval(commandPollInterval);
  if (deferredPollInterval) clearInterval(deferredPollInterval);
  if (heartbeatInterval) clearInterval(heartbeatInterval);

  savePendingCommands();
  dprint("[PT] Shutdown complete");
}

loadRuntime();
main();
`;

writeFileSync(resolve(generatedDir, "main.js"), mainCode, "utf-8");
console.log("[Bundle] Generated generated/main.js (" + mainCode.length + " chars)");

console.log("[Bundle] Done.");
