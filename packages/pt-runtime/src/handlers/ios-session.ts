/**
 * iOS Session Management - Session state tracking and CLI mode inference
 * Handles prompt parsing, mode detection, and session state updates
 */

export interface RuntimeSessionState {
  mode: string;
  paging: boolean;
  awaitingConfirm: boolean;
  awaitingPassword: boolean;
  awaitingDnsLookup: boolean;
}

export function inferModeFromPrompt(prompt: string): string {
  const trimmed = prompt.trim();
  if (trimmed.endsWith("(config)#")) return "config";
  if (trimmed.endsWith("(config-if)#")) return "config-if";
  if (trimmed.endsWith("(config-line)#")) return "config-line";
  if (trimmed.endsWith("(config-router)#")) return "config-router";
  if (trimmed.endsWith("(config-subif)#")) return "config-subif";
  if (trimmed.endsWith("(config-vlan)#")) return "config-vlan";
  if (trimmed.endsWith("#")) return "priv-exec";
  if (trimmed.endsWith(">")) return "user-exec";
  return "unknown";
}

export function updateSessionFromOutput(session: RuntimeSessionState, output: string): void {
  session.paging = output.includes("--More--");
  session.awaitingConfirm = /\n\[confirm\]/i.test(output) || output.startsWith("[confirm]");
  session.awaitingPassword = /^Password:/im.test(output);
  session.awaitingDnsLookup = /translating\s+["']?.+["']?\.\.\./i.test(output);

  const lines = output.trim().split('\n');
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i]!.trim();
    if (line && !line.includes("--More--") && !line.startsWith("%")) {
      const inferred = inferModeFromPrompt(line);
      if (inferred !== "unknown") {
        session.mode = inferred;
        break;
      }
    }
  }
}

export function isInConfigMode(mode: string): boolean {
  return mode.startsWith("config");
}

export function isInPrivilegedMode(mode: string): boolean {
  return mode === "priv-exec" || isInConfigMode(mode);
}
