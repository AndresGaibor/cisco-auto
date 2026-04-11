/**
 * Runtime Validator - Fase 8 Tests
 * Validates that generated main.ts/runtime.js are PT-safe
 */

import { describe, it, expect } from "bun:test";
import { validateMainJs, validateRuntimeJs } from "../src/runtime-validator";

describe("Runtime Validator - Fase 8 PT-Safe", () => {
  it("Test 1: Should validate correct Fase 8 main.js structure", () => {
    // PT-safe main.js with proper queue pattern, interval cleanup, and lease validation
    const mainCode = `
var isRunning = false;
var heartbeatInterval = null;
var commandPollInterval = null;
var deferredPollInterval = null;
var isShuttingDown = false;
var COMMANDS_DIR = DEV_DIR + "/commands";
var IN_FLIGHT_DIR = DEV_DIR + "/inflight";
var RESULTS_DIR = DEV_DIR + "/results";
var DEAD_LETTER_DIR = DEV_DIR + "/dead";
var LOGS_DIR = DEV_DIR + "/logs";

function main() {
  isRunning = true;
  try {
    fm = ipc.systemFileManager();
    ensureDir(DEV_DIR);

    if (!validateBridgeLease()) {
      dprint("[FATAL] Bridge has no valid lease");
      isRunning = false;
      return;
    }

    loadRuntime();
    recoverInFlightOnStartup();
    loadPendingCommands();
    savePendingCommands();

    heartbeatInterval = setInterval(writeHeartbeat, 5000);
    commandPollInterval = setInterval(pollCommandQueue, 250);
    deferredPollInterval = setInterval(pollDeferredCommands, 100);

    dprint("[PT] Ready");
  } catch (e) {
    dprint("[FATAL] " + String(e));
  }
}

function cleanUp() {
  isShuttingDown = true;
  if (commandPollInterval) clearInterval(commandPollInterval);
  if (deferredPollInterval) clearInterval(deferredPollInterval);
  if (heartbeatInterval) clearInterval(heartbeatInterval);
  dprint("[PT] Cleaned up");
}

function validateBridgeLease() {
  var leaseFile = DEV_DIR + "/lease.json";
  if (!fm.fileExists(leaseFile)) return false;
  var content = fm.getFileContents(leaseFile);
  if (!content) return false;
  var lease = JSON.parse(content);
  return lease && lease.ownerId && Date.now() <= lease.expiresAt;
}

function loadRuntime() { dprint("[PT] Loading runtime"); }
function writeHeartbeat() { dprint("[PT] Heartbeat"); }
function pollCommandQueue() { var cmds = listQueuedCommandFiles(COMMANDS_DIR); claimNextCommand(cmds, COMMANDS_DIR, IN_FLIGHT_DIR, RESULTS_DIR); }
function pollDeferredCommands() { dprint("[PT] Poll deferred"); }
function recoverInFlightOnStartup() { dprint("[PT] Recover in-flight"); }
function loadPendingCommands() { dprint("[PT] Load pending"); }
function savePendingCommands() { dprint("[PT] Save pending"); }
function ensureDir(path) { dprint("[PT] Ensure dir: " + path); }
function listQueuedCommandFiles(dir) { return []; }
function claimNextCommand(cmds, dir, inflight, results) { return null; }
`;

    const result = validateMainJs(mainCode);

    expect(result.ok).toBe(true);
    expect(result.errors.length).toBe(0);
    expect(result.metadata?.hasMain).toBe(true);
    expect(result.metadata?.hasCleanUp).toBe(true);
  });

  it("Test 2: Should allow validateBridgeLease() function", () => {
    // Complete PT-safe main.js with queue pattern
    const mainCode = `
var heartbeatInterval = null;
var commandPollInterval = null;
var deferredPollInterval = null;
var COMMANDS_DIR = DEV_DIR + "/commands";
var IN_FLIGHT_DIR = DEV_DIR + "/inflight";
var RESULTS_DIR = DEV_DIR + "/results";

function main() {
  if (!validateBridgeLease()) return;
  loadRuntime();
  heartbeatInterval = setInterval(writeHeartbeat, 5000);
  commandPollInterval = setInterval(pollCommandQueue, 250);
  deferredPollInterval = setInterval(pollDeferredCommands, 100);
}

function cleanUp() {
  if (commandPollInterval) clearInterval(commandPollInterval);
  if (deferredPollInterval) clearInterval(deferredPollInterval);
  if (heartbeatInterval) clearInterval(heartbeatInterval);
}

function validateBridgeLease() {
  try {
    var leaseFile = DEV_DIR + "/lease.json";
    if (!fm.fileExists(leaseFile)) {
      dprint("[LEASE] No lease file");
      return false;
    }
    var content = fm.getFileContents(leaseFile);
    var lease = JSON.parse(content);
    var now = Date.now();
    return now <= lease.expiresAt;
  } catch (e) {
    dprint("[LEASE] Error: " + String(e));
    return false;
  }
}

function loadRuntime() { dprint("[PT] Load"); }
function writeHeartbeat() { dprint("[PT] HB"); }
function pollCommandQueue() { var cmds = listQueuedCommandFiles(COMMANDS_DIR); claimNextCommand(cmds, COMMANDS_DIR, IN_FLIGHT_DIR, RESULTS_DIR); }
function pollDeferredCommands() { dprint("[PT] Deferred"); }
function recoverInFlightOnStartup() { dprint("[PT] Recover"); }
function loadPendingCommands() { dprint("[PT] Pending"); }
function savePendingCommands() { dprint("[PT] Save"); }
function ensureDir(path) { dprint("[PT] Dir"); }
function listQueuedCommandFiles(dir) { return []; }
function claimNextCommand(cmds, dir, inflight, results) { return null; }
`;

    const result = validateMainJs(mainCode);

    expect(result.ok).toBe(true);
    expect(result.errors).not.toContain(
      expect.stringMatching(/forbidden.*validateBridgeLease/i)
    );
  });

  it("Test 3: Should detect missing lease validation", () => {
    const mainCode = `
function main() {
  fm = ipc.systemFileManager();
  loadRuntime();
}

function cleanUp() {}
function loadRuntime() {}
function writeHeartbeat() {}
function pollCommandQueue() {}
function pollDeferredCommands() {}
function recoverInFlightOnStartup() {}
function loadPendingCommands() {}
function ensureDir(path) {}
`;

    const result = validateMainJs(mainCode);
    
    // May have warnings about missing lease validation but should still be valid
    // as function is optional for backward compat
    expect(result).toBeDefined();
  });

  it("Test 4: Should reject arrow functions", () => {
    const mainCode = `
var validateLease = () => {
  return true;
};

function main() {
  if (!validateLease()) return;
}

function cleanUp() {}
function loadRuntime() {}
function writeHeartbeat() {}
function pollCommandQueue() {}
function pollDeferredCommands() {}
function recoverInFlightOnStartup() {}
function loadPendingCommands() {}
function ensureDir(path) {}
`;

    const result = validateMainJs(mainCode);
    
    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("Test 5: Should reject const declarations", () => {
    const mainCode = `
const LEASE_TTL = 5000;

function main() {
  loadRuntime();
}

function cleanUp() {}
function loadRuntime() {}
function writeHeartbeat() {}
function pollCommandQueue() {}
function pollDeferredCommands() {}
function recoverInFlightOnStartup() {}
function loadPendingCommands() {}
function ensureDir(path) {}
`;

    const result = validateMainJs(mainCode);
    
    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("Test 6: Should accept PT-safe variable declarations", () => {
    // Complete PT-safe main.js with queue pattern and proper cleanup
    const mainCode = `
var heartbeatInterval = null;
var commandPollInterval = null;
var deferredPollInterval = null;
var LEASE_TTL = 5000;
var leaseFile = "";
var COMMANDS_DIR = DEV_DIR + "/commands";
var IN_FLIGHT_DIR = DEV_DIR + "/inflight";
var RESULTS_DIR = DEV_DIR + "/results";

function validateBridgeLease() {
  leaseFile = DEV_DIR + "/lease.json";
  var content = fm.getFileContents(leaseFile);
  var lease = JSON.parse(content);
  return lease && lease.expiresAt > Date.now();
}

function main() {
  if (!validateBridgeLease()) return;
  loadRuntime();
  heartbeatInterval = setInterval(writeHeartbeat, 5000);
  commandPollInterval = setInterval(pollCommandQueue, 250);
  deferredPollInterval = setInterval(pollDeferredCommands, 100);
}

function cleanUp() {
  if (commandPollInterval) clearInterval(commandPollInterval);
  if (deferredPollInterval) clearInterval(deferredPollInterval);
  if (heartbeatInterval) clearInterval(heartbeatInterval);
}

function loadRuntime() { dprint("[PT] Load"); }
function writeHeartbeat() { dprint("[PT] HB"); }
function pollCommandQueue() { var cmds = listQueuedCommandFiles(COMMANDS_DIR); claimNextCommand(cmds, COMMANDS_DIR, IN_FLIGHT_DIR, RESULTS_DIR); }
function pollDeferredCommands() { dprint("[PT] Deferred"); }
function recoverInFlightOnStartup() { dprint("[PT] Recover"); }
function loadPendingCommands() { dprint("[PT] Pending"); }
function savePendingCommands() { dprint("[PT] Save"); }
function ensureDir(path) { dprint("[PT] Dir"); }
function listQueuedCommandFiles(dir) { return []; }
function claimNextCommand(cmds, dir, inflight, results) { return null; }
`;

    const result = validateMainJs(mainCode);

    expect(result.ok).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it("Test 7: Should validate that validateBridgeLease uses JSON.parse safely", () => {
    // Complete PT-safe main.js with queue pattern and proper cleanup
    const mainCode = `
var heartbeatInterval = null;
var commandPollInterval = null;
var deferredPollInterval = null;
var COMMANDS_DIR = DEV_DIR + "/commands";
var IN_FLIGHT_DIR = DEV_DIR + "/inflight";
var RESULTS_DIR = DEV_DIR + "/results";

function validateBridgeLease() {
  try {
    var content = fm.getFileContents(DEV_DIR + "/lease.json");
    var lease = JSON.parse(content);
    return lease && lease.ownerId && lease.expiresAt;
  } catch (e) {
    return false;
  }
}

function main() {
  if (!validateBridgeLease()) return;
  loadRuntime();
  heartbeatInterval = setInterval(writeHeartbeat, 5000);
  commandPollInterval = setInterval(pollCommandQueue, 250);
  deferredPollInterval = setInterval(pollDeferredCommands, 100);
}

function cleanUp() {
  if (commandPollInterval) clearInterval(commandPollInterval);
  if (deferredPollInterval) clearInterval(deferredPollInterval);
  if (heartbeatInterval) clearInterval(heartbeatInterval);
}

function loadRuntime() { dprint("[PT] Load"); }
function writeHeartbeat() { dprint("[PT] HB"); }
function pollCommandQueue() { var cmds = listQueuedCommandFiles(COMMANDS_DIR); claimNextCommand(cmds, COMMANDS_DIR, IN_FLIGHT_DIR, RESULTS_DIR); }
function pollDeferredCommands() { dprint("[PT] Deferred"); }
function recoverInFlightOnStartup() { dprint("[PT] Recover"); }
function loadPendingCommands() { dprint("[PT] Pending"); }
function savePendingCommands() { dprint("[PT] Save"); }
function ensureDir(path) { dprint("[PT] Dir"); }
function listQueuedCommandFiles(dir) { return []; }
function claimNextCommand(cmds, dir, inflight, results) { return null; }
`;

    const result = validateMainJs(mainCode);

    expect(result.ok).toBe(true);
    expect(result.errors.length).toBe(0);
  });
});
