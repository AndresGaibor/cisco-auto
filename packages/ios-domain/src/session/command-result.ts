// ============================================================================
// Command Result Types
// ============================================================================

import type { IosMode } from "./prompt-state";

export interface CommandResult {
  ok: boolean;
  raw: string;
  status: number;
  parsed?: Record<string, unknown>;
  error?: string;
  parseError?: string;
  paging?: boolean;
  awaitingConfirm?: boolean;
  awaitingDnsLookup?: boolean;
  truncated?: boolean;
  /** Classification of the output */
  classification?: OutputClassificationType;
  /** IOS mode before command execution */
  modeBefore?: IosMode;
  /** IOS mode after command execution */
  modeAfter?: IosMode;
  /** The command that failed, if any */
  failedCommand?: string;
  /** Whether the command is retryable */
  retryable?: boolean;
  /** Warnings detected during execution */
  warnings?: string[];
}

export function isSuccessResult(result: CommandResult): boolean {
  return result.ok === true;
}

export function isErrorResult(result: CommandResult): boolean {
  return result.ok === false;
}

export function isPagingResult(result: CommandResult): boolean {
  return result.paging === true || result.raw.includes("--More--");
}

export function isConfirmPrompt(result: CommandResult): boolean {
  return result.awaitingConfirm === true || result.raw.includes("[confirm]");
}

export function isPasswordPrompt(result: CommandResult): boolean {
  return result.raw.toLowerCase().includes("password");
}

export function isParseErrorResult(result: CommandResult): boolean {
  return "parseError" in result && result.parseError !== undefined;
}

export type OutputClassificationType =
  | "success"
  | "invalid"
  | "incomplete"
  | "ambiguous"
  | "error"
  | "paging"
  | "dns-lookup"
  | "dns-lookup-timeout"
  | "confirmation-required"
  | "copy-destination"
  | "reload-confirm"
  | "erase-confirm"
  | "unsupported-command"
  | "unsupported-platform"
  | "interface-not-found"
  | "vlan-not-found"
  | "mask-invalid"
  | "ip-conflict"
  | "permission-denied"
  | "session-desync"
  | "truncated-output"
  | "warning"
  | "save-failed";

export interface OutputClassification {
  type: OutputClassificationType;
  message?: string;
  warnings?: string[];
}

export function classifyOutput(output: string): OutputClassification {
  const upperOutput = output.toUpperCase();
  const warnings: string[] = [];

  // DNS hostname lookup detection (highest priority - blocks everything)
  if (
    /translating\s+["']?.+["']?\.\.\./i.test(output) ||
    /unknown host or address/i.test(output)
  ) {
    if (/translating\s+["']?.+["']?\.\.\./i.test(output)) {
      return { type: "dns-lookup", message: "IOS DNS hostname lookup in progress" };
    }
    if (/unknown host or address/i.test(output)) {
      return { type: "dns-lookup-timeout", message: extractErrorMessage(output) ?? "DNS lookup failed - unknown host" };
    }
  }

  // Copy destination prompt
  if (/Destination filename \[/i.test(output)) {
    return { type: "copy-destination", message: "IOS is asking for copy destination filename" };
  }

  // Reload confirmation
  if (/Proceed with reload\? \[confirm\]/i.test(output)) {
    return { type: "reload-confirm", message: "IOS is asking for reload confirmation" };
  }

  // Erase confirmation
  if (/Delete filename \[/i.test(output)) {
    return { type: "erase-confirm", message: "IOS is asking for erase confirmation" };
  }

  // Confirmation required
  if (/\[confirm\]/i.test(output)) {
    return { type: "confirmation-required", message: "IOS is awaiting confirmation" };
  }

  // Interface not found
  if (/% Interface .+ does not exist/i.test(output) || /% .+ is not configured/i.test(output)) {
    return { type: "interface-not-found", message: extractErrorMessage(output) };
  }

  // VLAN not found
  if (/% Vlan \d+ does not exist/i.test(output) || /% VLAN \d+ not found/i.test(output)) {
    return { type: "vlan-not-found", message: extractErrorMessage(output) };
  }

  // Invalid mask
  if (/% (Invalid|bad|illegal) (mask|subnet)/i.test(output) || /% Invalid network mask/i.test(output)) {
    return { type: "mask-invalid", message: extractErrorMessage(output) };
  }

  // IP conflict
  if (/% (IP address|address) .+ conflicts/i.test(output) || /% Duplicate address/i.test(output)) {
    return { type: "ip-conflict", message: extractErrorMessage(output) };
  }

  // Permission denied / not in enable mode
  if (/% (Permission|privilege) denied/i.test(output) || /% Not in enable mode/i.test(output)) {
    return { type: "permission-denied", message: extractErrorMessage(output) };
  }

  // Unsupported command on platform
  if (/% (Invalid|Unsupported|Unavailable) command/i.test(output)) {
    return { type: "unsupported-command", message: extractErrorMessage(output) };
  }

  // Invalid input detected
  if (upperOutput.includes("INVALID INPUT") || /% Invalid input/i.test(output)) {
    return { type: "invalid", message: extractErrorMessage(output) };
  }

  // Incomplete command
  if (upperOutput.includes("INCOMPLETE COMMAND") || /% Incomplete command/i.test(output)) {
    return { type: "incomplete", message: extractErrorMessage(output) };
  }

  // Ambiguous command
  if (upperOutput.includes("AMBIGUOUS COMMAND") || /% Ambiguous command/i.test(output)) {
    return { type: "ambiguous", message: extractErrorMessage(output) };
  }

  // Paging detected
  if (output.includes("--More--") || output.includes("-- More --")) {
    return { type: "paging" };
  }

  // Error with % marker (but not informational syslogs)
  if (upperOutput.includes("%") && (upperOutput.includes("ERROR") || upperOutput.includes("FAILED") || upperOutput.includes("WARNING"))) {
    const msg = extractErrorMessage(output);
    if (msg && !isInformationalSyslog(msg)) {
      // Check for save failures
      if (/write.*memory|save/i.test(msg)) {
        return { type: "save-failed", message: msg };
      }
      return { type: "error", message: msg };
    }
    // Has % with ERROR/FAILED but it's a syslog - treat as warning
    warnings.push(msg ?? "Unknown IOS output with % marker");
  }

  // Success with warnings (syslog messages present but no error classification)
  if (/%[A-Z]{2,}/.test(output)) {
    const syslogs = extractSyslogs(output);
    if (syslogs.length > 0) {
      warnings.push(...syslogs);
      return { type: "warning", message: "Command succeeded with syslog warnings", warnings };
    }
  }

  return { type: "success" };
}

/**
 * Check if a % line is an informational syslog (not an error)
 */
function isInformationalSyslog(line: string): boolean {
  // Common informational syslog patterns that should not be treated as errors
  const informationalPatterns = [
    /%SYS-5-CONFIG_I/i,         // Configuration changes
    /%LINEPROTO-5-UPDOWN/i,      // Line protocol up/down
    /%LINK-5-CHANGED/i,          // Interface changed
    /%DUAL-5-NBRCHANGE/i,        // Routing neighbor changes
    /%OSPF-5-ADJCHG/i,          // OSPF adjacency changes
    /%HA_EM-6-LOG/i,            // HA event manager
    /%CRYPTO-6/i,               // Crypto engine messages
    /%SSH-5/i,                  // SSH sessions
    /%VTP-5/i,                  // VTP messages
    /%SPANTREE-5/i,             // Spanning tree
    /%CDP-5/i,                  // CDP messages
  ];
  return informationalPatterns.some(p => p.test(line));
}

/**
 * Extract syslog messages from output
 */
function extractSyslogs(output: string): string[] {
  const lines = output.split("\n");
  const syslogs: string[] = [];
  for (const line of lines) {
    if (line.includes("%") && /^%[A-Z]/.test(line.trim())) {
      const trimmed = line.trim();
      if (!isInformationalSyslog(trimmed)) {
        syslogs.push(trimmed);
      }
    }
  }
  return syslogs;
}

function extractErrorMessage(output: string): string | undefined {
  const lines = output.split("\n");
  // Priority order: actual errors first, then other %
  const errorPriority = [
    /% Invalid input/i,
    /% Incomplete command/i,
    /% Ambiguous command/i,
    /% Interface .+ does not exist/i,
    /% Vlan .+ does not exist/i,
    /% Bad mask/i,
    /% Invalid (address|mask|network)/i,
    /% Duplicate/i,
    /% (Permission|privilege) denied/i,
    /% Unknown/i,
    /% (ERROR|FAILED)/i,
    /translating\s+["']?.+["']?\.\.\./i,
    /unknown host or address/i,
  ];

  // First try to find priority errors
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.includes("%")) {
      for (const pattern of errorPriority) {
        if (pattern.test(trimmed)) {
          return trimmed;
        }
      }
    }
  }

  // Fallback: first % line that isn't an informational syslog
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.includes("%") && !isInformationalSyslog(trimmed)) {
      return trimmed;
    }
  }

  // Last resort: first % line
  for (const line of lines) {
    if (line.includes("%")) {
      return line.trim();
    }
  }

  return undefined;
}

export function createSuccessResult(
  raw: string,
  status = 0,
  parsed?: Record<string, unknown>
): CommandResult {
  const paging = raw.includes("--More--");
  return {
    ok: true,
    raw,
    status,
    parsed,
    paging,
  };
}

export function createErrorResult(
  error: string,
  raw = "",
  status = 1
): CommandResult {
  return {
    ok: false,
    error,
    raw,
    status,
  };
}
