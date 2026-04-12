/**
 * @deprecated Use src/build/ instead
 * This file will be removed in next major version
 */
/**
 * Runtime Dispatcher Template - Command dispatcher and factory
 * Routes payloads to appropriate handlers with validation and error handling
 * GENERATED from command-catalog.ts - DO NOT EDIT MANUALLY
 */

import { PUBLIC_COMMAND_CATALOG, INTERNAL_COMMAND_CATALOG } from "@cisco-auto/types";
import type { CommandCatalogEntry } from "@cisco-auto/types";

function generateDispatcherCases(commands: CommandCatalogEntry[]): string {
  return commands.map((cmd) => {
    return `      case "${cmd.type}": return ${cmd.handler}(payload);`;
  }).join("\n");
}

export function generateDispatcherTemplate(): string {
  const publicCases = generateDispatcherCases(PUBLIC_COMMAND_CATALOG);
  const internalCases = generateDispatcherCases(INTERNAL_COMMAND_CATALOG);

  return `// ============================================================================
// Command Dispatcher
// ============================================================================
// Dispatches payloads to pure handlers with validation and exception capture.
// Never allows unhandled exceptions to escape.
// ============================================================================

function dispatch(payload, host) {
  if (!payload || typeof payload !== "object") {
    return { ok: false, error: "Invalid payload", code: "INVALID_PAYLOAD" };
  }

  if (!payload.type || typeof payload.type !== "string") {
    return { ok: false, error: "Missing payload.type", code: "MISSING_TYPE" };
  }

  var ipc = host && host.ipc ? host.ipc : (typeof ipc !== "undefined" ? ipc : null);
  var dprintFn = host && host.dprint ? host.dprint : (typeof dprint !== "undefined" ? dprint : function() {});

  try {
    dprintFn("[Runtime] Processing: " + payload.type);

    switch (payload.type) {
      case "__healthcheck__": return { ok: true, runtime: "pt-runtime", version: "0.1.0" };
${publicCases}
${internalCases}
      default: return { ok: false, error: "Unknown payload type: " + payload.type, code: "UNKNOWN_HANDLER" };
    }
  } catch (e) {
    dprintFn("[Runtime] Handler exception: " + String(e));
    return { ok: false, error: String(e), code: "HANDLER_EXCEPTION" };
  }
}
`;
}
