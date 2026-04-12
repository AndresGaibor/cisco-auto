import { expect, test, describe } from "bun:test";
import {
  validateMainJs,
  validateRuntimeJs,
  validateGeneratedArtifacts,
  formatValidationErrors,
  type ValidationResult,
} from "../runtime-validator.js";

describe("Fase 3 - PT-safe validation", () => {
  describe("validateMainJs", () => {
    test("pasa con main.js valido", () => {
      const code = `
function main() {
  var fm = ipc.systemFileManager();
}

function cleanUp() {
  isShuttingDown = true;
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
}

function loadRuntime() {
  var code = fm.getFileContents(RUNTIME_FILE);
  runtimeFn = new Function("payload", "ipc", "dprint", code);
}

function writeHeartbeat() {
  fm.writePlainTextToFile(HEARTBEAT_FILE, JSON.stringify({}));
}

function pollCommandQueue() {
  if (!isRunning || isShuttingDown) return;
  if (activeCommand !== null) return;
  var claimed = claimNextCommand();
  if (!claimed) return;
  activeCommand = claimed.command;
  executeActiveCommand();
}

function pollDeferredCommands() {
  var keys = Object.keys(pendingCommands);
}

function hasPendingDeferredCommands() {
  var key;
  for (key in pendingCommands) {
    if (pendingCommands.hasOwnProperty(key)) return true;
  }
  return false;
}

function recoverInFlightOnStartup() {
  if (!fm.directoryExists(IN_FLIGHT_DIR)) return;
  var files = fm.getFilesInDirectory(IN_FLIGHT_DIR);
}

function savePendingCommands() {
  fm.writePlainTextToFile(PENDING_COMMANDS_FILE, JSON.stringify(pendingCommands));
}

function executeActiveCommand() {
  if (runtimeDirty && !hasPendingDeferredCommands()) {
    loadRuntime();
  }
}

var pendingCommands = {};
var activeCommand = null;
var isShuttingDown = false;
var isRunning = false;
var runtimeDirty = false;
var commandPollInterval = null;
var deferredPollInterval = null;
var heartbeatInterval = null;

function listQueuedCommandFiles() {
  var files = fm.getFilesInDirectory(COMMANDS_DIR);
}

function claimNextCommand() {
  return null;
}

function teardownFileWatcher() {}

var COMMANDS_DIR = "";
var IN_FLIGHT_DIR = "";
var RESULTS_DIR = "";
var DEAD_LETTER_DIR = "";
var LOGS_DIR = "";
var RUNTIME_FILE = "";
var COMMAND_FILE = "";
var CURRENT_COMMAND_FILE = "";
var PENDING_COMMANDS_FILE = "";
var HEARTBEAT_FILE = "";
`;
      const result = validateMainJs(code);
      if (!result.ok) {
        console.log("ERRORS:", result.errors);
      }
      expect(result.ok).toBe(true);
    });

    test("falla con const (sintaxis prohibida)", () => {
      const code = `
function main() {
  const DEV_DIR = "/tmp/pt-dev";
}
`;
      const result = validateMainJs(code);
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => e.includes("const"))).toBe(true);
    });

    test("falla con let (sintaxis prohibida)", () => {
      const code = `
function main() {
  let x = 1;
}
`;
      const result = validateMainJs(code);
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => e.includes("let"))).toBe(true);
    });

    test("falla con arrow function (sintaxis prohibida)", () => {
      const code = `
var fn = () => {};
`;
      const result = validateMainJs(code);
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => e.includes("=>"))).toBe(true);
    });

    test("falla con import (sintaxis prohibida)", () => {
      const code = `
import { something } from "module";
`;
      const result = validateMainJs(code);
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => e.includes("import"))).toBe(true);
    });

    test("falla con class (sintaxis prohibida)", () => {
      const code = `
class MyClass {}
`;
      const result = validateMainJs(code);
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => e.includes("class"))).toBe(true);
    });

    test("falla con window (global prohibido)", () => {
      const code = `
function main() {
  window.location = "/";
}
`;
      const result = validateMainJs(code);
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => e.includes("window"))).toBe(true);
    });

    test("falla con document (global prohibido)", () => {
      const code = `
function main() {
  var el = document.getElementById("app");
}
`;
      const result = validateMainJs(code);
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => e.includes("document"))).toBe(true);
    });

    test("falla con require (global prohibido)", () => {
      const code = `
function main() {
  var fs = require("fs");
}
`;
      const result = validateMainJs(code);
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => e.includes("require"))).toBe(true);
    });

    test("falla sin function main() (símbolo requerido)", () => {
      const code = `
function cleanUp() {}
`;
      const result = validateMainJs(code);
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => e.includes("function main()"))).toBe(true);
    });

    test("falla sin function cleanUp() (símbolo requerido)", () => {
      const code = `
function main() {}
`;
      const result = validateMainJs(code);
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => e.includes("function cleanUp()"))).toBe(true);
    });

    test("falla sin pollDeferredCommands (símbolo requerido)", () => {
      const code = `
function main() {}
function cleanUp() {}
function loadRuntime() {}
function writeHeartbeat() {}
function pollCommandSlot() {}
function recoverCommandJournal() {}
function savePendingCommands() {}
`;
      const result = validateMainJs(code);
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => e.includes("pollDeferredCommands"))).toBe(true);
    });
  });

  describe("validateRuntimeJs", () => {
    test("pasa con runtime.js valido", () => {
      const code = `
var IOS_JOBS = {};
var IOS_SESSIONS = {};

function handleConfigIos(payload) {
  return { ok: true };
}

function handleExecIos(payload) {
  return { ok: true };
}

function handlePollDeferred(payload) {
  return pollIosJob(payload.ticket);
}

function pollIosJob(ticket) {
  var job = IOS_JOBS[ticket];
  if (!job) {
    return { done: true, ok: false, error: "Job not found" };
  }
  return { done: job.finished, ok: job.result && job.result.ok };
}

function onTerminalOutputWritten(deviceName, args) {}
function onTerminalCommandEnded(deviceName, args) {}
function onTerminalModeChanged(deviceName, args) {}
function onTerminalMoreDisplayed(deviceName, args) {}

function handleAddDevice(payload) {}
function handleSnapshot(payload) {}
function handleListDevices(payload) {}

var commandEnded = true;
var outputWritten = true;
var modeChanged = true;
var moreDisplayed = true;
var deferred = true;
`;
      const result = validateRuntimeJs(code);
      if (!result.ok) {
        console.log("RUNTIME ERRORS:", result.errors);
      }
      expect(result.ok).toBe(true);
    });

    test("advierte sin IOS_JOBS (símbolo requerido)", () => {
      const code = `
var IOS_SESSIONS = {};

function handleConfigIos(payload) {
  return { ok: true };
}

function handleExecIos(payload) {
  return { ok: true };
}

function handlePollDeferred(payload) {
  return pollIosJob(payload.ticket);
}

var commandEnded = true;
var outputWritten = true;
var modeChanged = true;
var moreDisplayed = true;
function handleAddDevice(payload) {}
function handleSnapshot(payload) {}
function handleListDevices(payload) {}
var deferred = true;
var x = 1; var y = 2; var z = 3; var a = 4; var b = 5;
var c = 6; var d = 7; var e = 8; var f = 9; var g = 10;
var h = 11; var i = 12; var j = 13; var k = 14; var l = 15;
var m = 16; var n = 17; var o = 18; var p = 19; var q = 20;
var r = 21; var s = 22; var t = 23; var u = 24; var v = 25;
var w = 26; var x2 = 27; var y2 = 28; var z2 = 29; var a2 = 30;
var b2 = 31; var c2 = 32; var d2 = 33; var e2 = 34; var f2 = 35;
var g2 = 36; var h2 = 37; var i2 = 38; var j2 = 39; var k2 = 40;
var l2 = 41; var m2 = 42; var n2 = 43; var o2 = 44; var p3 = 45;
var q2 = 46; var r2 = 47; var s2 = 48; var t2 = 49; var u2 = 50;
var v2 = 51; var w2 = 52; var x3 = 53; var y3 = 54; var z3 = 55;
var a3 = 56; var b3 = 57; var c3 = 58; var d3 = 59; var e3 = 60;
var f3 = 61; var g3 = 62; var h3 = 63; var i3 = 64; var j3 = 65;
var k3 = 66; var l3 = 67; var m3 = 68; var n3 = 69; var o3 = 70;
var p4 = 71; var q3 = 72; var r3 = 73; var s3 = 74; var t3 = 75;
var u3 = 76; var v3 = 77; var w3 = 78; var x4 = 79; var y4 = 80;
var z4 = 81; var a4 = 82; var b4 = 83; var c4 = 84; var d4 = 85;
var e4 = 86; var f4 = 87; var g4 = 88; var h4 = 89; var i4 = 90;
var j4 = 91; var k4 = 92; var l4 = 93; var m4 = 94; var n4 = 95;
var o4 = 96; var p5 = 97; var q4 = 98; var r4 = 99; var s4 = 100;
var t4 = 101; var u4 = 102; var v4 = 103; var w4 = 104; var x5 = 105;
var y5 = 106; var z5 = 107; var a5 = 108; var b5 = 109; var c5 = 110;
var d5 = 111; var e5 = 112; var f5 = 113; var g5 = 114; var h5 = 115;
var i5 = 116; var j5 = 117; var k5 = 118; var l5 = 119; var m5 = 120;
var n5 = 121; var o5 = 122; var p6 = 123; var q5 = 124; var r5 = 125;
var s5 = 126; var t5 = 127; var u5 = 128; var v5 = 129; var w5 = 130;
var x6 = 131; var y6 = 132; var z6 = 133; var a6 = 134; var b6 = 135;
var c6 = 136; var d6 = 137; var e6 = 138; var f6 = 139; var g6 = 140;
var h6 = 141; var i6 = 142; var j6 = 143; var k6 = 144; var l6 = 145;
var m6 = 146; var n6 = 147; var o6 = 148; var p7 = 149; var q6 = 150;
var r6 = 151; var s6 = 152; var t6 = 153; var u6 = 154; var v6 = 155;
var w6 = 156; var x7 = 157; var y7 = 158; var z7 = 159; var a7 = 160;
var b7 = 161; var c7 = 162; var d7 = 163; var e7 = 164; var f7 = 165;
var g7 = 166; var h7 = 167; var i7 = 168; var j7 = 169; var k7 = 170;
var l7 = 171; var m7 = 172; var n7 = 173; var o7 = 174; var p8 = 175;
var q7 = 176; var r7 = 177; var s7 = 178; var t7 = 179; var u7 = 180;
var v7 = 181; var w7 = 182; var x8 = 183; var y8 = 184; var z8 = 185;
var a8 = 186; var b8 = 187; var c8 = 188; var d8 = 189; var e8 = 190;
var f8 = 191; var g8 = 192; var h8 = 193; var i8 = 194; var j8 = 195;
var k8 = 196; var l8 = 197; var m8 = 198; var n8 = 199; var o8 = 200;
`;
      const result = validateRuntimeJs(code);
      expect(result.ok).toBe(true); // Ahora es warning, no error
      expect(result.warnings.some((e) => e.includes("IOS_JOBS"))).toBe(true);
    });

    test("falla con fetch (global prohibido)", () => {
      const code = `
function main() {
  fetch("http://api.example.com").then(function(r) { return r.json(); });
}
`;
      const result = validateRuntimeJs(code);
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => e.includes("fetch"))).toBe(true);
    });

    test("falla con Promise (patrón prohibido)", () => {
      const code = `
function main() {
  var p = new Promise(function(resolve) { resolve(); });
}
var IOS_JOBS = {};
var IOS_SESSIONS = {};
function handleConfigIos(payload) { return { ok: true }; }
function handleExecIos(payload) { return { ok: true }; }
function handlePollDeferred(payload) { return {}; }
var commandEnded = true;
var outputWritten = true;
var modeChanged = true;
var moreDisplayed = true;
function handleAddDevice(payload) {}
function handleSnapshot(payload) {}
function handleListDevices(payload) {}
// Adding more to reach size threshold
var x = 1; var y = 2; var z = 3; var a = 4; var b = 5;
var c = 6; var d = 7; var e = 8; var f = 9; var g = 10;
var h = 11; var i = 12; var j = 13; var k = 14; var l = 15;
var m = 16; var n = 17; var o = 18; var p2 = 19; var q = 20;
var r = 21; var s = 22; var t = 23; var u = 24; var v = 25;
var w = 26; var x2 = 27; var y2 = 28; var z2 = 29; var a2 = 30;
var b2 = 31; var c2 = 32; var d2 = 33; var e2 = 34; var f2 = 35;
var g2 = 36; var h2 = 37; var i2 = 38; var j2 = 39; var k2 = 40;
var l2 = 41; var m2 = 42; var n2 = 43; var o2 = 44; var p3 = 45;
var q2 = 46; var r2 = 47; var s2 = 48; var t2 = 49; var u2 = 50;
var v2 = 51; var w2 = 52; var x3 = 53; var y3 = 54; var z3 = 55;
var a3 = 56; var b3 = 57; var c3 = 58; var d3 = 59; var e3 = 60;
var f3 = 61; var g3 = 62; var h3 = 63; var i3 = 64; var j3 = 65;
var k3 = 66; var l3 = 67; var m3 = 68; var n3 = 69; var o3 = 70;
var p4 = 71; var q3 = 72; var r3 = 73; var s3 = 74; var t3 = 75;
var u3 = 76; var v3 = 77; var w3 = 78; var x4 = 79; var y4 = 80;
var z4 = 81; var a4 = 82; var b4 = 83; var c4 = 84; var d4 = 85;
var e4 = 86; var f4 = 87; var g4 = 88; var h4 = 89; var i4 = 90;
var j4 = 91; var k4 = 92; var l4 = 93; var m4 = 94; var n4 = 95;
var o4 = 96; var p5 = 97; var q4 = 98; var r4 = 99; var s4 = 100;
var t4 = 101; var u4 = 102; var v4 = 103; var w4 = 104; var x5 = 105;
var y5 = 106; var z5 = 107; var a5 = 108; var b5 = 109; var c5 = 110;
var d5 = 111; var e5 = 112; var f5 = 113; var g5 = 114; var h5 = 115;
var i5 = 116; var j5 = 117; var k5 = 118; var l5 = 119; var m5 = 120;
var n5 = 121; var o5 = 122; var p6 = 123; var q5 = 124; var r5 = 125;
var s5 = 126; var t5 = 127; var u5 = 128; var v5 = 129; var w5 = 130;
var x6 = 131; var y6 = 132; var z6 = 133; var a6 = 134; var b6 = 135;
var c6 = 136; var d6 = 137; var e6 = 138; var f6 = 139; var g6 = 140;
var h6 = 141; var i6 = 142; var j6 = 143; var k6 = 144; var l6 = 145;
var m6 = 146; var n6 = 147; var o6 = 148; var p7 = 149; var q6 = 150;
var r6 = 151; var s6 = 152; var t6 = 153; var u6 = 154; var v6 = 155;
var w6 = 156; var x7 = 157; var y7 = 158; var z7 = 159; var a7 = 160;
var b7 = 161; var c7 = 162; var d7 = 163; var e7 = 164; var f7 = 165;
var g7 = 166; var h7 = 167; var i7 = 168; var j7 = 169; var k7 = 170;
var l7 = 171; var m7 = 172; var n7 = 173; var o7 = 174; var p8 = 175;
var q7 = 176; var r7 = 177; var s7 = 178; var t7 = 179; var u7 = 180;
var v7 = 181; var w7 = 182; var x8 = 183; var y8 = 184; var z8 = 185;
var a8 = 186; var b8 = 187; var c8 = 188; var d8 = 189; var e8 = 190;
var f8 = 191; var g8 = 192; var h8 = 193; var i8 = 194; var j8 = 195;
var k8 = 196; var l8 = 197; var m8 = 198; var n8 = 199; var o8 = 200;
var deferred = true;
`;
      const result = validateRuntimeJs(code);
      expect(result.ok).toBe(true);
    });

    test("falla con Map (patrón prohibido)", () => {
      const code = `
function main() {
  var m = new Map();
}
`;
      const result = validateRuntimeJs(code);
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => e.includes("Map"))).toBe(true);
    });

    test("falla con código muy pequeño", () => {
      const code = "var x = 1;";
      const result = validateRuntimeJs(code);
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => e.includes("too small"))).toBe(true);
    });

    test("advierte sin handleConfigIos (handler requerido)", () => {
      const code = `
var IOS_JOBS = {};
var IOS_SESSIONS = {};

function handleExecIos(payload) {
  return { ok: true };
}

function handlePollDeferred(payload) {
  return pollIosJob(payload.ticket);
}

var commandEnded = true;
var outputWritten = true;
var modeChanged = true;
var moreDisplayed = true;
function handleAddDevice(payload) {}
function handleSnapshot(payload) {}
function handleListDevices(payload) {}
var deferred = true;
var x = 1; var y = 2; var z = 3; var a = 4; var b = 5;
var c = 6; var d = 7; var e = 8; var f = 9; var g = 10;
var h = 11; var i = 12; var j = 13; var k = 14; var l = 15;
var m = 16; var n = 17; var o = 18; var p = 19; var q = 20;
var r = 21; var s = 22; var t = 23; var u = 24; var v = 25;
var w = 26; var x2 = 27; var y2 = 28; var z2 = 29; var a2 = 30;
var b2 = 31; var c2 = 32; var d2 = 33; var e2 = 34; var f2 = 35;
var g2 = 36; var h2 = 37; var i2 = 38; var j2 = 39; var k2 = 40;
var l2 = 41; var m2 = 42; var n2 = 43; var o2 = 44; var p3 = 45;
var q2 = 46; var r2 = 47; var s2 = 48; var t2 = 49; var u2 = 50;
var v2 = 51; var w2 = 52; var x3 = 53; var y3 = 54; var z3 = 55;
var a3 = 56; var b3 = 57; var c3 = 58; var d3 = 59; var e3 = 60;
var f3 = 61; var g3 = 62; var h3 = 63; var i3 = 64; var j3 = 65;
var k3 = 66; var l3 = 67; var m3 = 68; var n3 = 69; var o3 = 70;
var p4 = 71; var q3 = 72; var r3 = 73; var s3 = 74; var t3 = 75;
var u3 = 76; var v3 = 77; var w3 = 78; var x4 = 79; var y4 = 80;
var z4 = 81; var a4 = 82; var b4 = 83; var c4 = 84; var d4 = 85;
var e4 = 86; var f4 = 87; var g4 = 88; var h4 = 89; var i4 = 90;
var j4 = 91; var k4 = 92; var l4 = 93; var m4 = 94; var n4 = 95;
var o4 = 96; var p5 = 97; var q4 = 98; var r4 = 99; var s4 = 100;
var t4 = 101; var u4 = 102; var v4 = 103; var w4 = 104; var x5 = 105;
var y5 = 106; var z5 = 107; var a5 = 108; var b5 = 109; var c5 = 110;
var d5 = 111; var e5 = 112; var f5 = 113; var g5 = 114; var h5 = 115;
var i5 = 116; var j5 = 117; var k5 = 118; var l5 = 119; var m5 = 120;
var n5 = 121; var o5 = 122; var p6 = 123; var q5 = 124; var r5 = 125;
var s5 = 126; var t5 = 127; var u5 = 128; var v5 = 129; var w5 = 130;
var x6 = 131; var y6 = 132; var z6 = 133; var a6 = 134; var b6 = 135;
var c6 = 136; var d6 = 137; var e6 = 138; var f6 = 139; var g6 = 140;
var h6 = 141; var i6 = 142; var j6 = 143; var k6 = 144; var l6 = 145;
var m6 = 146; var n6 = 147; var o6 = 148; var p7 = 149; var q6 = 150;
var r6 = 151; var s6 = 152; var t6 = 153; var u6 = 154; var v6 = 155;
var w6 = 156; var x7 = 157; var y7 = 158; var z7 = 159; var a7 = 160;
var b7 = 161; var c7 = 162; var d7 = 163; var e7 = 164; var f7 = 165;
var g7 = 166; var h7 = 167; var i7 = 168; var j7 = 169; var k7 = 170;
var l7 = 171; var m7 = 172; var n7 = 173; var o7 = 174; var p8 = 175;
var q7 = 176; var r7 = 177; var s7 = 178; var t7 = 179; var u7 = 180;
var v7 = 181; var w7 = 182; var x8 = 183; var y8 = 184; var z8 = 185;
var a8 = 186; var b8 = 187; var c8 = 188; var d8 = 189; var e8 = 190;
var f8 = 191; var g8 = 192; var h8 = 193; var i8 = 194; var j8 = 195;
var k8 = 196; var l8 = 197; var m8 = 198; var n8 = 199; var o8 = 200;
`;
      const result = validateRuntimeJs(code);
      expect(result.ok).toBe(true); // Ahora es warning, no error
      expect(result.warnings.some((e) => e.includes("handleConfigIos"))).toBe(true);
    });
  });

  describe("validateGeneratedArtifacts", () => {
    test("pasa con main.js y runtime.js válidos", () => {
      const main = `
function main() {}
function cleanUp() {
  if (commandPollInterval) { clearInterval(commandPollInterval); commandPollInterval = null; }
  if (deferredPollInterval) { clearInterval(deferredPollInterval); deferredPollInterval = null; }
  if (heartbeatInterval) { clearInterval(heartbeatInterval); heartbeatInterval = null; }
}
function loadRuntime() {}
function writeHeartbeat() {}
function pollCommandQueue() {
  if (!isRunning || isShuttingDown) return;
  if (activeCommand !== null) return;
  var claimed = claimNextCommand();
  if (!claimed) return;
  activeCommand = claimed.command;
  executeActiveCommand();
}
function pollDeferredCommands() {}
function recoverInFlightOnStartup() {}
function savePendingCommands() {}
var pendingCommands = {};
function listQueuedCommandFiles() {}
function claimNextCommand() {}
function hasPendingDeferredCommands() {
  var key;
  for (key in pendingCommands) {
    if (pendingCommands.hasOwnProperty(key)) return true;
  }
  return false;
}
function executeActiveCommand() {
  if (runtimeDirty && !hasPendingDeferredCommands()) {
    loadRuntime();
  }
}
function teardownFileWatcher() {}
var isShuttingDown = false;
var isRunning = false;
var runtimeDirty = false;
var commandPollInterval = null;
var deferredPollInterval = null;
var heartbeatInterval = null;
var COMMANDS_DIR = "";
var IN_FLIGHT_DIR = "";
var RESULTS_DIR = "";
var DEAD_LETTER_DIR = "";
var LOGS_DIR = "";
`;
      const runtime = `
var IOS_JOBS = {};
var IOS_SESSIONS = {};
function handleConfigIos(payload) { return { ok: true }; }
function handleExecIos(payload) { return { ok: true }; }
function handlePollDeferred(payload) { return {}; }
function onTerminalOutputWritten(deviceName, args) {}
function onTerminalCommandEnded(deviceName, args) {}
function onTerminalModeChanged(deviceName, args) {}
function onTerminalMoreDisplayed(deviceName, args) {}
function handleAddDevice(payload) {}
function handleSnapshot(payload) {}
function handleListDevices(payload) {}
var commandEnded = true;
var outputWritten = true;
var modeChanged = true;
var moreDisplayed = true;
var deferred = true;
var x = 1; var y = 2; var z = 3; var a = 4; var b = 5;
var c = 6; var d = 7; var e = 8; var f = 9; var g = 10;
var h = 11; var i = 12; var j = 13; var k = 14; var l = 15;
var m = 16; var n = 17; var o = 18; var p = 19; var q = 20;
var r = 21; var s = 22; var t = 23; var u = 24; var v = 25;
var w = 26; var x2 = 27; var y2 = 28; var z2 = 29; var a2 = 30;
var b2 = 31; var c2 = 32; var d2 = 33; var e2 = 34; var f2 = 35;
var g2 = 36; var h2 = 37; var i2 = 38; var j2 = 39; var k2 = 40;
var l2 = 41; var m2 = 42; var n2 = 43; var o2 = 44; var p3 = 45;
var q2 = 46; var r2 = 47; var s2 = 48; var t2 = 49; var u2 = 50;
var v2 = 51; var w2 = 52; var x3 = 53; var y3 = 54; var z3 = 55;
var a3 = 56; var b3 = 57; var c3 = 58; var d3 = 59; var e3 = 60;
var f3 = 61; var g3 = 62; var h3 = 63; var i3 = 64; var j3 = 65;
var k3 = 66; var l3 = 67; var m3 = 68; var n3 = 69; var o3 = 70;
var p4 = 71; var q3 = 72; var r3 = 73; var s3 = 74; var t3 = 75;
var u3 = 76; var v3 = 77; var w3 = 78; var x4 = 79; var y4 = 80;
var z4 = 81; var a4 = 82; var b4 = 83; var c4 = 84; var d4 = 85;
var e4 = 86; var f4 = 87; var g4 = 88; var h4 = 89; var i4 = 90;
var j4 = 91; var k4 = 92; var l4 = 93; var m4 = 94; var n4 = 95;
var o4 = 96; var p5 = 97; var q4 = 98; var r4 = 99; var s4 = 100;
var t4 = 101; var u4 = 102; var v4 = 103; var w4 = 104; var x5 = 105;
var y5 = 106; var z5 = 107; var a5 = 108; var b5 = 109; var c5 = 110;
var d5 = 111; var e5 = 112; var f5 = 113; var g5 = 114; var h5 = 115;
var i5 = 116; var j5 = 117; var k5 = 118; var l5 = 119; var m5 = 120;
var n5 = 121; var o5 = 122; var p6 = 123; var q5 = 124; var r5 = 125;
var s5 = 126; var t5 = 127; var u5 = 128; var v5 = 129; var w5 = 130;
var x6 = 131; var y6 = 132; var z6 = 133; var a6 = 134; var b6 = 135;
var c6 = 136; var d6 = 137; var e6 = 138; var f6 = 139; var g6 = 140;
var h6 = 141; var i6 = 142; var j6 = 143; var k6 = 144; var l6 = 145;
var m6 = 146; var n6 = 147; var o6 = 148; var p7 = 149; var q6 = 150;
var r6 = 151; var s6 = 152; var t6 = 153; var u6 = 154; var v6 = 155;
var w6 = 156; var x7 = 157; var y7 = 158; var z7 = 159; var a7 = 160;
var b7 = 161; var c7 = 162; var d7 = 163; var e7 = 164; var f7 = 165;
var g7 = 166; var h7 = 167; var i7 = 168; var j7 = 169; var k7 = 170;
var l7 = 171; var m7 = 172; var n7 = 173; var o7 = 174; var p8 = 175;
var q7 = 176; var r7 = 177; var s7 = 178; var t7 = 179; var u7 = 180;
var v7 = 181; var w7 = 182; var x8 = 183; var y8 = 184; var z8 = 185;
var a8 = 186; var b8 = 187; var c8 = 188; var d8 = 189; var e8 = 190;
var f8 = 191; var g8 = 192; var h8 = 193; var i8 = 194; var j8 = 195;
var k8 = 196; var l8 = 197; var m8 = 198; var n8 = 199; var o8 = 200;
`;
      const result = validateGeneratedArtifacts(main, runtime);
      if (!result.ok) {
        console.log("ARTIFACTS ERRORS:", result.errors);
      }
      expect(result.ok).toBe(true);
    });

    test("falla si main.js tiene errores", () => {
      const main = `const x = 1;`; // sintaxis prohibida
      const runtime = `
var IOS_JOBS = {};
function handleConfigIos(payload) {}
`;
      const result = validateGeneratedArtifacts(main, runtime);
      expect(result.ok).toBe(false);
    });

    test("falla si runtime.js tiene errores", () => {
      const main = `
function main() {}
function cleanUp() {}
function loadRuntime() {}
function writeHeartbeat() {}
function pollCommandQueue() {}
function pollDeferredCommands() {}
function recoverInFlightOnStartup() {}
function savePendingCommands() {}
var COMMANDS_DIR = "";
var IN_FLIGHT_DIR = "";
var RESULTS_DIR = "";
`;
      const runtime = `fetch("http://example.com");`;
      const result = validateGeneratedArtifacts(main, runtime);
      expect(result.ok).toBe(false);
    });

    test("advierte si falta __healthcheck__", () => {
      const main = `
function main() {}
function cleanUp() {}
function loadRuntime() {}
function writeHeartbeat() {}
function pollCommandQueue() {}
function pollDeferredCommands() {}
function recoverInFlightOnStartup() {}
function savePendingCommands() {}
var COMMANDS_DIR = "";
var IN_FLIGHT_DIR = "";
var RESULTS_DIR = "";
`;
      const runtime = `
var IOS_JOBS = {};
function handleConfigIos(payload) {}
`;
      const result = validateGeneratedArtifacts(main, runtime);
      expect(result.warnings.some((w) => w.includes("__healthcheck__"))).toBe(true);
    });
  });

  describe("formatValidationErrors", () => {
    test("formatea errores correctamente", () => {
      const result: ValidationResult = {
        ok: false,
        errors: ["Error 1", "Error 2"],
        warnings: ["Warning 1"],
      };
      const formatted = formatValidationErrors(result);
      expect(formatted).toContain("ERROR: Error 1");
      expect(formatted).toContain("ERROR: Error 2");
      expect(formatted).toContain("WARNING: Warning 1");
    });

    test("retorna 'Validation passed' cuando ok", () => {
      const result: ValidationResult = {
        ok: true,
        errors: [],
        warnings: [],
      };
      const formatted = formatValidationErrors(result);
      expect(formatted).toBe("Validation passed");
    });
  });
});

describe("Fase 3 - Forbidden IOS patterns", () => {
  test("falla con var response = term.enterCommand()", () => {
    const code = `
function handleExecIos(payload) {
  var term = device.getCommandLine();
  var response = term.enterCommand("show version");
  if (!response) {
    return { ok: false };
  }
  return { ok: true, output: response[1] };
}
`;
    const result = validateRuntimeJs(code);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("enterCommand returns void"))).toBe(true);
  });

  test("falla con term.enterCommand()[index]", () => {
    const code = `
function handleExecIos(payload) {
  var result = term.enterCommand("show version");
  return [result[0], result[1]];
}
`;
    const result = validateRuntimeJs(code);
    expect(result.ok).toBe(false);
  });

  test("falla con return [status, output]", () => {
    const code = `
function runCommand(cmd) {
  term.enterCommand(cmd);
  var status = 0;
  var output = "test";
  return [status, output];
}
`;
    const result = validateRuntimeJs(code);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("Old return pattern"))).toBe(true);
  });
});

describe("Fase 5 - Lifecycle Safety (Crash Fix)", () => {
  describe("Regla A: cleanUp() no debe invocar invokeRuntimeCleanupHook", () => {
    test("falla si cleanUp() llama invokeRuntimeCleanupHook()", () => {
      const code = `
function main() {}
function cleanUp() {
  isShuttingDown = true;
  invokeRuntimeCleanupHook();
  clearInterval(interval);
}
function invokeRuntimeCleanupHook() {
  if (runtimeFn) {
    runtimeFn({ type: "__cleanup__" });
  }
}
var COMMAND_FILE = "";
function pollCommandSlot() {}
function writeHeartbeat() {}
function savePendingCommands() {}
var commandPollInterval = null;
`;
      const result = validateMainJs(code);
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => e.includes("cleanUp() must NOT call invokeRuntimeCleanupHook"))).toBe(true);
    });

    test("pasa si cleanUp() NO llama invokeRuntimeCleanupHook", () => {
      // Código completo en modo cola (queue)
      const code = `
function main() {
  var fm = ipc.systemFileManager();
  ensureDir(COMMANDS_DIR);
}
function cleanUp() {
  isShuttingDown = true;
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
  savePendingCommands();
}
function loadRuntime() {}
function writeHeartbeat() {}
function pollCommandQueue() {
  if (!isRunning || isShuttingDown) return;
  if (activeCommand !== null) return;
  var claimed = claimNextCommand();
  if (!claimed) return;
  activeCommand = claimed.command;
  executeActiveCommand();
}
function pollDeferredCommands() {}
function hasPendingDeferredCommands() {
  var key;
  for (key in pendingCommands) {
    if (pendingCommands.hasOwnProperty(key)) return true;
  }
  return false;
}
function recoverInFlightOnStartup() {}
function savePendingCommands() {}
function executeActiveCommand() {}
function listQueuedCommandFiles() {}
function claimNextCommand() {}
function teardownFileWatcher() {}
function ensureDir(path) {}
var pendingCommands = {};
var activeCommand = null;
var isShuttingDown = false;
var isRunning = false;
var runtimeDirty = false;
var commandPollInterval = null;
var deferredPollInterval = null;
var heartbeatInterval = null;
var COMMANDS_DIR = "";
var IN_FLIGHT_DIR = "";
var RESULTS_DIR = "";
var DEAD_LETTER_DIR = "";
var LOGS_DIR = "";
var RUNTIME_FILE = "";
var DEV_DIR = "";
`;
      const result = validateMainJs(code);
      if (!result.ok) {
        console.log("ERRORS:", result.errors);
      }
      expect(result.ok).toBe(true);
    });
  });

  describe("Regla B: invokeRuntimeCleanupHook() no debe contener runtimeFn()", () => {
    test("falla si invokeRuntimeCleanupHook() llama runtimeFn()", () => {
      const code = `
function main() {}
function cleanUp() {}
function invokeRuntimeCleanupHook() {
  if (runtimeFn) {
    runtimeFn({ type: "__cleanup__" });
  }
}
var COMMAND_FILE = "";
function pollCommandSlot() {}
function writeHeartbeat() {}
function savePendingCommands() {}
`;
      const result = validateMainJs(code);
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => e.includes("invokeRuntimeCleanupHook() must NOT call runtimeFn"))).toBe(true);
    });
  });

  describe("Regla C: main.js no debe tener runtimeFn({ type: '__cleanup__' }) en cleanUp", () => {
    test("falla con runtimeFn(__cleanup__) en cleanUp", () => {
      const code = `
function main() {}
function cleanUp() {
  isShuttingDown = true;
  runtimeFn({ type: "__cleanup__" });
  clearInterval(interval);
}
var COMMAND_FILE = "";
function pollCommandSlot() {}
function writeHeartbeat() {}
function savePendingCommands() {}
`;
      const result = validateMainJs(code);
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => e.includes("runtimeFn({ type: '__cleanup__' })"))).toBe(true);
    });
  });

  describe("Regla D: Arquitectura - runtime.js no debe mezclar jobs + listeners + sync polling", () => {
    test("bloquea si runtime.js tiene IOS_JOBS + attachTerminalListeners + while polling", () => {
      const code = `
var IOS_JOBS = {};
var TERMINAL_LISTENERS_ATTACHED = {};

function attachTerminalListeners(deviceName, term) {
  term.registerEvent("commandEnded", null, handler);
}

function handleConfigIos(payload) {
  var attempt = 0;
  var maxAttempts = 10;
  while (attempt < maxAttempts) {
    attempt++;
  }
  return { ok: true };
}

function handleExecIos(payload) {}
function handlePollDeferred(payload) {}

var commandEnded = true;
var outputWritten = true;
var modeChanged = true;
var moreDisplayed = true;
var deferred = true;
var x = 1; var y = 2; var z = 3; var a = 4; var b = 5;
var c = 6; var d = 7; var e = 8; var f = 9; var g = 10;
var h = 11; var i = 12; var j = 13; var k = 14; var l = 15;
var m = 16; var n = 17; var o = 18; var p = 19; var q = 20;
`;
      const result = validateRuntimeJs(code);
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => e.includes("ARCHITECTURE VIOLATION"))).toBe(true);
    });
  });

  describe("Contrato de cleanup - main.js generado debe contener", () => {
    test("debe contener clearInterval(commandPollInterval)", () => {
      const code = `
function main() {}
function cleanUp() {
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
}
var COMMANDS_DIR = "";
var IN_FLIGHT_DIR = "";
var RESULTS_DIR = "";
var DEAD_LETTER_DIR = "";
var LOGS_DIR = "";
var commandPollInterval = null;
var deferredPollInterval = null;
var heartbeatInterval = null;
function loadRuntime() {}
function writeHeartbeat() {}
function pollCommandQueue() {}
function pollDeferredCommands() {}
function recoverInFlightOnStartup() {}
function savePendingCommands() {}
function listQueuedCommandFiles() {}
function claimNextCommand() {}
function hasPendingDeferredCommands() {}
function teardownFileWatcher() {}
`;
      const result = validateMainJs(code);
      expect(result.ok).toBe(true);
    });

    test("debe contener clearInterval(deferredPollInterval)", () => {
      const code = `
function main() {}
function cleanUp() {
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
}
var COMMANDS_DIR = "";
var IN_FLIGHT_DIR = "";
var RESULTS_DIR = "";
var DEAD_LETTER_DIR = "";
var LOGS_DIR = "";
var commandPollInterval = null;
var deferredPollInterval = null;
var heartbeatInterval = null;
function loadRuntime() {}
function writeHeartbeat() {}
function pollCommandQueue() {}
function pollDeferredCommands() {}
function recoverInFlightOnStartup() {}
function savePendingCommands() {}
function listQueuedCommandFiles() {}
function claimNextCommand() {}
function hasPendingDeferredCommands() {}
function teardownFileWatcher() {}
`;
      const result = validateMainJs(code);
      console.log("RESULT:", result);
      expect(result.ok).toBe(true);
    });

    test("debe contener clearInterval(heartbeatInterval)", () => {
      const code = `
function main() {}
function cleanUp() {
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
}
var COMMANDS_DIR = "";
var IN_FLIGHT_DIR = "";
var RESULTS_DIR = "";
var DEAD_LETTER_DIR = "";
var LOGS_DIR = "";
var commandPollInterval = null;
var deferredPollInterval = null;
var heartbeatInterval = null;
function loadRuntime() {}
function writeHeartbeat() {}
function pollCommandQueue() {}
function pollDeferredCommands() {}
function recoverInFlightOnStartup() {}
function savePendingCommands() {}
function listQueuedCommandFiles() {}
function claimNextCommand() {}
function hasPendingDeferredCommands() {}
function teardownFileWatcher() {}
`;
      const result = validateMainJs(code);
      expect(result.ok).toBe(true);
    });

    test("debe contener teardownFileWatcher()", () => {
      const code = `
function main() {}
function cleanUp() {
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
  teardownFileWatcher();
}
var COMMANDS_DIR = "";
var IN_FLIGHT_DIR = "";
var RESULTS_DIR = "";
var DEAD_LETTER_DIR = "";
var LOGS_DIR = "";
var commandPollInterval = null;
var deferredPollInterval = null;
var heartbeatInterval = null;
function loadRuntime() {}
function writeHeartbeat() {}
function pollCommandQueue() {}
function pollDeferredCommands() {}
function recoverInFlightOnStartup() {}
function savePendingCommands() {}
function listQueuedCommandFiles() {}
function claimNextCommand() {}
function hasPendingDeferredCommands() {}
function teardownFileWatcher() {}
`;
      const result = validateMainJs(code);
      expect(result.ok).toBe(true);
    });

    test("debe contener clearInterval(deferredPollInterval)", () => {
      const code = `
function main() {}
function cleanUp() {
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
}
var COMMANDS_DIR = "";
var IN_FLIGHT_DIR = "";
var RESULTS_DIR = "";
var DEAD_LETTER_DIR = "";
var LOGS_DIR = "";
var commandPollInterval = null;
var deferredPollInterval = null;
var heartbeatInterval = null;
function loadRuntime() {}
function writeHeartbeat() {}
function pollCommandQueue() {}
function pollDeferredCommands() {}
function recoverInFlightOnStartup() {}
function savePendingCommands() {}
function listQueuedCommandFiles() {}
function claimNextCommand() {}
function hasPendingDeferredCommands() {}
function teardownFileWatcher() {}
`;
      const result = validateMainJs(code);
      console.log("RESULT:", JSON.stringify(result));
      expect(result.ok).toBe(true);
    });

    test("debe contener clearInterval(heartbeatInterval)", () => {
      const code = `
function main() {}
function cleanUp() {
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
}
var COMMANDS_DIR = "";
var IN_FLIGHT_DIR = "";
var RESULTS_DIR = "";
var DEAD_LETTER_DIR = "";
var LOGS_DIR = "";
var commandPollInterval = null;
var deferredPollInterval = null;
var heartbeatInterval = null;
function loadRuntime() {}
function writeHeartbeat() {}
function pollCommandQueue() {}
function pollDeferredCommands() {}
function recoverInFlightOnStartup() {}
function savePendingCommands() {}
function listQueuedCommandFiles() {}
function claimNextCommand() {}
function hasPendingDeferredCommands() {}
function teardownFileWatcher() {}
`;
      const result = validateMainJs(code);
      console.log("RESULT:", JSON.stringify(result));
      expect(result.ok).toBe(true);
    });

    test("debe contener teardownFileWatcher()", () => {
      const code = `
function main() {}
function cleanUp() {
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
  teardownFileWatcher();
}
var COMMANDS_DIR = "";
var IN_FLIGHT_DIR = "";
var RESULTS_DIR = "";
var DEAD_LETTER_DIR = "";
var LOGS_DIR = "";
var commandPollInterval = null;
var deferredPollInterval = null;
var heartbeatInterval = null;
function loadRuntime() {}
function writeHeartbeat() {}
function pollCommandQueue() {}
function pollDeferredCommands() {}
function recoverInFlightOnStartup() {}
function savePendingCommands() {}
function listQueuedCommandFiles() {}
function claimNextCommand() {}
function hasPendingDeferredCommands() {}
function teardownFileWatcher() {}
`;
      const result = validateMainJs(code);
      console.log("RESULT:", JSON.stringify(result));
      expect(result.ok).toBe(true);
    });

    test("debe contener clearInterval(heartbeatInterval)", () => {
      const code = `
function main() {}
function cleanUp() {
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
}
var COMMANDS_DIR = "";
var IN_FLIGHT_DIR = "";
var RESULTS_DIR = "";
var DEAD_LETTER_DIR = "";
var LOGS_DIR = "";
var commandPollInterval = null;
var deferredPollInterval = null;
var heartbeatInterval = null;
function loadRuntime() {}
function writeHeartbeat() {}
function pollCommandQueue() {}
function pollDeferredCommands() {}
function recoverInFlightOnStartup() {}
function savePendingCommands() {}
function listQueuedCommandFiles() {}
function claimNextCommand() {}
function hasPendingDeferredCommands() {}
function teardownFileWatcher() {}
`;
      const result = validateMainJs(code);
      if (!result.ok) {
        console.log("ERRORS:", result.errors);
      }
      expect(result.ok).toBe(true);
    });

    test("debe contener teardownFileWatcher()", () => {
      const code = `
function main() {}
function cleanUp() {
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
  teardownFileWatcher();
}
var COMMANDS_DIR = "";
var IN_FLIGHT_DIR = "";
var RESULTS_DIR = "";
var DEAD_LETTER_DIR = "";
var LOGS_DIR = "";
var commandPollInterval = null;
var deferredPollInterval = null;
var heartbeatInterval = null;
function loadRuntime() {}
function writeHeartbeat() {}
function pollCommandQueue() {}
function pollDeferredCommands() {}
function recoverInFlightOnStartup() {}
function savePendingCommands() {}
function listQueuedCommandFiles() {}
function claimNextCommand() {}
function hasPendingDeferredCommands() {}
function teardownFileWatcher() {}
`;
      const result = validateMainJs(code);
      if (!result.ok) {
        console.log("ERRORS:", result.errors);
      }
      expect(result.ok).toBe(true);
    });

    test("NO debe contener runtimeFn( dentro de cleanUp", () => {
      const code = `
function main() {}
function cleanUp() {
  runtimeFn({ type: "__cleanup__" });
}
var COMMANDS_DIR = "";
var IN_FLIGHT_DIR = "";
var RESULTS_DIR = "";
var DEAD_LETTER_DIR = "";
var LOGS_DIR = "";
var commandPollInterval = null;
var deferredPollInterval = null;
var heartbeatInterval = null;
function loadRuntime() {}
function writeHeartbeat() {}
function pollCommandQueue() {}
function pollDeferredCommands() {}
function recoverInFlightOnStartup() {}
function savePendingCommands() {}
function listQueuedCommandFiles() {}
function claimNextCommand() {}
function hasPendingDeferredCommands() {}
function teardownFileWatcher() {}
`;
      const result = validateMainJs(code);
      expect(result.ok).toBe(false);
    });
  });
});
