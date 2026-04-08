import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const MAIN_FILES = [
  "dist-qtscript/main/types.js",
  "dist-qtscript/main/jobs.js",
  "dist-qtscript/main/pipeline.js",
  "dist-qtscript/main/terminal.js",
  "dist-qtscript/main/bridge.js",
  "dist-qtscript/main/index.js"
];

const CORE_CONSTANTS = `
// ============================================================================
// Constants (ES3 Compatible)
// ============================================================================
var CABLE_TYPES = {
    "ethernet-straight": 8100,
    "ethernet-cross": 8101,
    "straight": 8100,
    "cross": 8101,
    "roll": 8102,
    "fiber": 8103,
    "phone": 8104,
    "cable": 8105,
    "serial": 8106,
    "auto": 8107,
    "console": 8108,
    "wireless": 8109
};

var DEVICE_TYPES = {
    router: 0,
    switch: 1,
    cloud: 2,
    pc: 8,
    server: 9,
    wirelessRouter: 11,
    multilayerSwitch: 16
};

var DEVICE_TYPE_NAMES = {
    0: "router",
    1: "switch",
    2: "cloud",
    8: "pc",
    9: "server",
    11: "wirelessRouter",
    16: "multilayerSwitch"
};

var MODEL_ALIASES = {
    "2911": "2911",
    "2960": "2960-24TT",
    "2960-24TT": "2960-24TT",
    "3560": "3560-24PS",
    "3560-24PS": "3560-24PS"
};
`;

const ES3_HELPERS = `
// ============================================================================
// ES3 Compatibility Helpers
// ============================================================================
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

function objectValues(obj) {
    var vals = [];
    if (!obj) return vals;
    for (var key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            vals.push(obj[key]);
        }
    }
    return vals;
}

function isArray(val) {
    return Object.prototype.toString.call(val) === "[object Array]";
}

function forEach(arr, fn) {
    if (!arr || !arr.length) return;
    for (var i = 0; i < arr.length; i++) {
        fn(arr[i], i);
    }
}

function forEachOwn(obj, fn) {
    if (!obj) return;
    var keys = objectKeys(obj);
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        fn(key, obj[key], i);
    }
}

function filter(arr, fn) {
    if (!arr || !arr.length) return [];
    var result = [];
    for (var i = 0; i < arr.length; i++) {
        if (fn(arr[i], i)) {
            result.push(arr[i]);
        }
    }
    return result;
}

function map(arr, fn) {
    if (!arr || !arr.length) return [];
    var result = [];
    for (var i = 0; i < arr.length; i++) {
        result.push(fn(arr[i], i));
    }
    return result;
}

function extend(target, source) {
    if (!source) return target;
    var keys = objectKeys(source);
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        target[key] = source[key];
    }
    return target;
}

function clone(obj) {
    if (!obj || typeof obj !== "object") return obj;
    if (isArray(obj)) return obj.slice();
    return extend({}, obj);
}

function trim(str) {
    if (!str) return "";
    return str.replace(/^\\s+|\\s+$/g, "");
}

function split(str, sep) {
    if (!str) return [];
    return str.split(sep);
}

function join(arr, sep) {
    if (!arr || !arr.length) return "";
    return arr.join(sep);
}

function startsWith(str, prefix) {
    if (!str || !prefix) return false;
    return str.indexOf(prefix) === 0;
}

function endsWith(str, suffix) {
    if (!str || !suffix) return false;
    return str.indexOf(suffix) === str.length - suffix.length;
}

function includes(arr, item) {
    if (!arr || !arr.length) return false;
    for (var i = 0; i < arr.length; i++) {
        if (arr[i] === item) return true;
    }
    return false;
}

function padStart(str, length, pad) {
    if (!str) str = "";
    if (str.length >= length) return str;
    var result = str;
    while (result.length < length) {
        result = pad + result;
    }
    return result;
}

function padEnd(str, length, pad) {
    if (!str) str = "";
    if (str.length >= length) return str;
    var result = str;
    while (result.length < length) {
        result = result + pad;
    }
    return result;
}

function repeat(str, count) {
    if (!str || count <= 0) return "";
    var result = "";
    for (var i = 0; i < count; i++) {
        result += str;
    }
    return result;
}
`;

function cleanFile(content: string): string {
  return content
    .replace(/^"use strict";\n/gm, "")
    .replace(/^var\s+\w+\s*=\s*require\([^)]+\);\n/gm, "")
    .replace(/^Object\.defineProperty\([\s\S]*?\}\);\n?/gm, "")
    .replace(/^exports\.\w+\s*=\s*[^;]+;\n/gm, "")
    .replace(/^exports\.\w+\s*=\s*exports\.\w+\s*=\s*[^;]+;\n/gm, "")
    .replace(/^import\s+.+$/gm, "")
    .replace(/^export\s+.+$/gm, "")
    .replace(/^export\s+\{[^}]+\};\n/gm, "")
    .replace(/^export\s+default\s+.+$/gm, "")
    .replace(/^\/\*\*[\s\S]*?\*\/\n?/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function bundleMain(): string {
  let output = `/**
 * PT Control V2 - Main (ES3 Compatible)
 * PT Script Module - Persistent state
 * Auto-generated - DO NOT EDIT MANUALLY
 */

var DEV_DIR = {{DEV_DIR_LITERAL}};

var PT_API = {
  openFile: openFile,
  readFile: readFile,
  writeFile: writeFile,
  closeFile: closeFile,
  getDeviceList: getDeviceList,
  sendToIOS: sendToIOS,
  connectTo: connectTo,
  disconnect: disconnect,
  ping: ping,
  getConsoleOutput: getConsoleOutput
};

// Session state
var sessionState = null;
var iosJobs = null;
var pendingJobs = [];

function setIosJobs(jobs) {
  iosJobs = jobs;
}

function getJobs() {
  return pendingJobs;
}

function enqueueJob(job) {
  pendingJobs.push(job);
  PT_API.sendToIOS(JSON.stringify(job));
}

function dequeueJob(jobId) {
  pendingJobs = pendingJobs.filter(function(j) { return j.id !== jobId; });
}

function createTerminal(deviceName) {
  return PT_API.getConsoleOutput(deviceName);
}

${CORE_CONSTANTS}

${ES3_HELPERS}

`;

  for (const file of MAIN_FILES) {
    const path = resolve(ROOT, file);
    if (!existsSync(path)) {
      console.warn(`[Bundle] Missing: ${file}`);
      continue;
    }
    const content = readFileSync(path, "utf-8");
    const cleaned = cleanFile(content);
    output += `// === ${file.split("/").pop()} ===\n`;
    output += cleaned + "\n\n";
  }

  output += `
// ============================================================================
// Main Entry Point
// ============================================================================
// Called when PT loads main.js
var mainExports = {
  onLoad: onLoad,
  onDeviceAdded: onDeviceAdded,
  onDeviceRemoved: onDeviceRemoved,
  onLinkAdded: onLinkAdded,
  onLinkRemoved: onLinkRemoved,
  onTerminate: onTerminate
};

mainExports;
`;

  return output;
}

const mainCode = bundleMain();
writeFileSync(resolve(ROOT, "generated/main.js"), mainCode, "utf-8");
console.log("[Bundle] Generated generated/main.js");
