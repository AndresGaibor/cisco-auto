/**
 * Runtime Session Template - Generates IOS session management section
 * Handles state persistence, cleanup, and session lifecycle
 * NOTE: IOS JOBS y Terminal Listeners fueron migrados a main.ts (Phase 5)
 * Este archivo ahora solo contiene helpers puros para el runtime
 */

export function generateSessionTemplate(): string {
  return `// ============================================================================
// IOS Session State - Read-only helpers for runtime.js
// NOTE: IOS_JOBS y listeners fueron migrados a main.js para estado persistente
// Este archivo solo contiene funciones de sesión sin estado
// ============================================================================

var IOS_SESSIONS = {};
var SESSION_DIRTY = false;
var SESSION_FILE = DEV_DIR + "/sessions/ios-sessions.json";

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
`;
}
