/**
 * Runtime Dispatcher Template - Command dispatcher and factory
 * Routes payloads to appropriate handlers
 * GENERATED from command-catalog.ts - DO NOT EDIT MANUALLY
 */

import { PUBLIC_COMMAND_CATALOG, INTERNAL_COMMAND_CATALOG } from "@cisco-auto/types";
import type { CommandCatalogEntry } from "@cisco-auto/types";

function generateDispatcherCases(commands: CommandCatalogEntry[]): string {
  return commands.map((cmd) => {
    if (cmd.type === "__pollDeferred") {
      return `      case "${cmd.type}": return handlePollDeferred(payload);`;
    }
    if (cmd.type === "__healthcheck__") {
      return `      case "${cmd.type}": return { ok: true, runtime: "pt-runtime", version: "0.1.0" };`;
    }
    return `      case "${cmd.type}": return ${cmd.handler}(payload);`;
  }).join("\n");
}

export function generateDispatcherTemplate(): string {
  const publicCases = generateDispatcherCases(PUBLIC_COMMAND_CATALOG);
  const internalCases = generateDispatcherCases(INTERNAL_COMMAND_CATALOG);

  return `// ============================================================================
// Command Dispatcher
// ============================================================================

return (function(payload, ipc, dprint) {
  try {
    dprint("[Runtime] Processing: " + payload.type);
    
    function handlePollDeferred(payload) {
      if (!payload || !payload.ticket) {
        return { done: true, ok: false, error: "Missing deferred ticket" };
      }
      return pollIosJob(payload.ticket);
    }
    
    switch (payload.type) {
${publicCases}
${internalCases}
      default: return { ok: false, error: "Unknown command: " + payload.type };
    }
  } catch (e) {
    dprint("[Runtime] Error: " + String(e));
    return { ok: false, error: String(e), stack: String(e.stack || "") };
  }
})(payload, ipc, dprint);
`;
}
