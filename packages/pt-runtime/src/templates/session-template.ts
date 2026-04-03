/**
 * Runtime Session Template - Generates IOS session management section
 * Handles state persistence, cleanup, and session lifecycle
 */

export function generateSessionTemplate(): string {
  return `// ============================================================================
// IOS Session State Management (with filesystem persistence)
// Tracks mode, paging, and confirmation state per device across commands
// Includes automatic cleanup to prevent memory leaks
// Sessions persist across PT hot-reloads via filesystem
// ============================================================================

var IOS_SESSIONS = {};
var SESSION_DIRTY = false; // Track if sessions need saving
var LAST_CLEANUP_TIME = 0;
var CLEANUP_INTERVAL_MS = 30000; // Every 30 seconds
var SESSION_ACCESS_COUNT = 0;
var SESSION_MAX_AGE_MS = 300000; // 5 minutes
var MAX_SESSIONS = 200; // Increased from 50 to support larger labs
var SESSIONS_FILE = DEV_DIR + "/sessions/ios-sessions.json";
var HEARTBEAT_FILE = DEV_DIR + "/sessions/heartbeat.json";

function isSessionStale() {
  try {
    if (!fm.fileExists(HEARTBEAT_FILE)) {
      return true; // No heartbeat = definitely stale
    }
    var content = fm.getFileContents(HEARTBEAT_FILE);
    var heartbeat = JSON.parse(content);
    var age = Date.now() - heartbeat.ts;
    return age > 15000; // Stale if no heartbeat for > 15 seconds
  } catch (e) {
    dprint("[Sessions] Heartbeat check failed, assuming stale: " + e);
    return true;
  }
}

function loadSessionsFromDisk() {
  try {
    // Check if sessions are stale (PT reopened after crash)
    if (isSessionStale()) {
      dprint("[Sessions] Sessions are stale (PT was restarted), clearing ios-sessions.json");
      fm.writePlainTextToFile(SESSIONS_FILE, JSON.stringify({}));
      return;
    }

    if (fm.fileExists(SESSIONS_FILE)) {
      var content = fm.getFileContents(SESSIONS_FILE);
      var loaded = JSON.parse(content);
      var now = Date.now();
      var loadedCount = 0;

      for (var key in loaded) {
        if (loaded[key] && loaded[key].lastUsed && (now - loaded[key].lastUsed < SESSION_MAX_AGE_MS)) {
          IOS_SESSIONS[key] = loaded[key];
          loadedCount++;
        }
      }

      dprint("[Sessions] Loaded " + loadedCount + " sessions from disk");
    }
  } catch (e) {
    dprint("[Sessions] Failed to load from disk: " + e);
  }
}

function saveSessionsToDisk() {
  if (!SESSION_DIRTY) return;
  try {
    fm.writePlainTextToFile(SESSIONS_FILE, JSON.stringify(IOS_SESSIONS, null, 2));
    SESSION_DIRTY = false;
  } catch (e) {
    dprint("[Sessions] Failed to save to disk: " + e);
  }
}

function cleanupStaleSessions() {
  var now = Date.now();
  var timeSinceCleanup = now - LAST_CLEANUP_TIME;
  var shouldCleanupByTime = timeSinceCleanup >= CLEANUP_INTERVAL_MS;
  var shouldCleanupByCount = SESSION_ACCESS_COUNT >= 10;

  if (!shouldCleanupByTime && !shouldCleanupByCount) return;

  LAST_CLEANUP_TIME = now;
  SESSION_ACCESS_COUNT = 0;

  var keys = Object.keys(IOS_SESSIONS);
  var activeKeys = [];

  // Evict by age first
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    var session = IOS_SESSIONS[key];
    if (session && session.lastUsed) {
      var age = now - session.lastUsed;
      if (age > SESSION_MAX_AGE_MS) {
        delete IOS_SESSIONS[key];
        SESSION_DIRTY = true;
      } else {
        activeKeys.push(key);
      }
    } else {
      delete IOS_SESSIONS[key];
      SESSION_DIRTY = true;
    }
  }

  // Evict excess by LRU (keep most recently used)
  if (activeKeys.length > MAX_SESSIONS) {
    activeKeys.sort(function(a, b) {
      var aTime = IOS_SESSIONS[a] && IOS_SESSIONS[a].lastUsed || 0;
      var bTime = IOS_SESSIONS[b] && IOS_SESSIONS[b].lastUsed || 0;
      return aTime - bTime;
    });

    var toRemove = activeKeys.length - MAX_SESSIONS;
    for (var j = 0; j < toRemove; j++) {
      dprint("[Sessions] Evicting session for " + activeKeys[j] + " (LRU)");
      delete IOS_SESSIONS[activeKeys[j]];
      SESSION_DIRTY = true;
    }
  }

  if (SESSION_DIRTY) {
    try {
      fm.writePlainTextToFile(SESSIONS_FILE, JSON.stringify(IOS_SESSIONS, null, 2));
      SESSION_DIRTY = false;
    } catch (e) { dprint("[Sessions] Save failed: " + e); }
  }
}

function getOrCreateSession(deviceName, term) {
  // Load from disk on first access if not yet loaded
  if (Object.keys(IOS_SESSIONS).length === 0) {
    loadSessionsFromDisk();
  }

  SESSION_ACCESS_COUNT++;
  cleanupStaleSessions();

  if (!IOS_SESSIONS[deviceName]) {
    IOS_SESSIONS[deviceName] = {
      mode: "user-exec",
      paging: false,
      awaitingConfirm: false,
      deviceName: deviceName,
      lastUsed: Date.now(),
      createdAt: Date.now()
    };
    SESSION_DIRTY = true;
    saveSessionsToDisk(); // Only save new sessions immediately
  } else {
    IOS_SESSIONS[deviceName].lastUsed = Date.now();
  }

  return IOS_SESSIONS[deviceName];
}

function inferPromptMode(output) {
  var lastLine = "";
  var lines = output.split("\\n");
  for (var i = lines.length - 1; i >= 0; i--) {
    var line = lines[i].trim();
    if (line) {
      lastLine = line;
      break;
    }
  }

  if (/--More--/i.test(lastLine) || /\\x1B\\?D/.test(lastLine)) {
    return "paging";
  }
  if (/^\\[confirm\\]/i.test(lastLine)) {
    return "awaiting-confirm";
  }
  if (/^Password:/i.test(lastLine)) {
    return "awaiting-password";
  }

  var promptMatchers = [
    { pattern: /\\(config-router\\)#\\$/, mode: "config-router" },
    { pattern: /\\(config-line\\)#\\$/, mode: "config-line" },
    { pattern: /\\(config-if\\)#\\$/, mode: "config-if" },
    { pattern: /\\(config\\)#\\$/, mode: "config" },
    { pattern: /#\\$/, mode: "priv-exec" },
    { pattern: />\\$/, mode: "user-exec" },
  ];

  for (var i = 0; i < promptMatchers.length; i++) {
    if (promptMatchers[i].pattern.test(lastLine)) {
      return promptMatchers[i].mode;
    }
  }

  return "unknown";
}

function isPrivilegedMode(mode) {
  return mode === "priv-exec" || mode === "config" ||
         mode === "config-if" || mode === "config-line" || mode === "config-router";
}

function isConfigMode(mode) {
  return mode && mode.indexOf("config") === 0;
}

function updateSessionFromOutput(session, output, term) {
  var mode = inferPromptMode(output);

  if (mode === "paging") {
    session.paging = true;
    return;
  }
  session.paging = false;

  if (mode === "awaiting-confirm") {
    session.awaitingConfirm = true;
    return;
  }
  session.awaitingConfirm = false;

  if (mode === "awaiting-password") {
    return;
  }

  if (mode !== "unknown") {
    session.mode = mode;
  }
}

function executeIosCommand(term, cmd, session) {
  var response = term.enterCommand(cmd);
  if (!response) {
    var fallbackPrompt = "";
    try {
      fallbackPrompt = term.getPrompt ? term.getPrompt() : "";
    } catch (e) {}
    updateSessionFromOutput(session, fallbackPrompt, term);
    return [0, fallbackPrompt];
  }

  if (!response[0]) {
    updateSessionFromOutput(session, response[1] || "", term);
    return response;
  }

  var status = response[0];
  var output = response[1] || "";

  updateSessionFromOutput(session, output, term);

  while (session.paging) {
    var pageResponse = term.enterCommand(" ");
    if (!pageResponse) {
      updateSessionFromOutput(session, "", term);
      break;
    }

    updateSessionFromOutput(session, pageResponse[1] || "", term);
    output += pageResponse[1] || "";
  }

  if (session.awaitingConfirm) {
    var confirmResponse = term.enterCommand("\\n");
    if (!confirmResponse) {
      updateSessionFromOutput(session, "", term);
      return [status, output];
    }

    updateSessionFromOutput(session, confirmResponse[1] || "", term);
    output += confirmResponse[1] || "";
  }

  return [status, output];
}

function ensurePrivileged(term, session) {
  if (isPrivilegedMode(session.mode)) {
    return [true, ""];
  }

  var result = executeIosCommand(term, "enable", session);

  if (isPrivilegedMode(session.mode)) {
    return [true, result[1]];
  }

  if ((result[1] || "").indexOf("#") >= 0 && (result[1] || "").indexOf("Would you like") < 0) {
    session.mode = "priv-exec";
    return [true, result[1]];
  }
  return [false, result[1]];
}

function ensureConfigMode(term, session) {
  var probe = executeIosCommand(term, "", session);
  var out = probe[1] || "";

  if (out.indexOf("initial configuration dialog") >= 0 ||
      out.indexOf("Would you like to enter") >= 0) {
    dprint("[ensureConfigMode] Dismissing initial config dialog");
    executeIosCommand(term, "no", session);

    var probe2 = executeIosCommand(term, "", session);
    if ((probe2[1] || "").indexOf("Would you like to") >= 0) {
      executeIosCommand(term, "no", session);
    }
    session.mode = "user-exec";
  }

  if (isConfigMode(session.mode)) {
    return [true, ""];
  }

  if (!isPrivilegedMode(session.mode)) {
    var privResult = ensurePrivileged(term, session);
    if (!privResult[0]) {
      return [false, privResult[1]];
    }
  }

  var result = executeIosCommand(term, "configure terminal", session);

  if (isConfigMode(session.mode)) {
    return [true, result[1]];
  }
  if ((result[1] || "").indexOf("(config)#") >= 0) {
    session.mode = "config";
    return [true, result[1]];
  }
  return [false, result[1]];
}
`;
}
