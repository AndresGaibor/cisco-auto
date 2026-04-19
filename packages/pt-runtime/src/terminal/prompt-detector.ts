// ============================================================================
// Prompt Detector - Detecta modo, wizard, confirmaciones, paginación e idioma de sesión
// ============================================================================

import type { TerminalMode, TerminalSessionKind } from "./session-state";

const ANSI_RE = /\x1B\[[0-9;]*[A-Za-z]/g;

function stripAnsi(input: string): string {
  return String(input ?? "").replace(ANSI_RE, "");
}

function normalizeWhitespace(input: string): string {
  return stripAnsi(input).replace(/\r/g, "").replace(/\t/g, " ").replace(/\s+/g, " ").trim();
}

function lastNonEmptyLine(input: string): string {
  const lines = stripAnsi(input)
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.length > 0 ? lines[lines.length - 1]! : "";
}

export function normalizePrompt(prompt: string): string {
  return normalizeWhitespace(prompt);
}

export function promptMatches(pattern: string | RegExp, prompt: string): boolean {
  const normalized = normalizePrompt(prompt);
  if (!normalized) return false;
  if (typeof pattern === "string") return normalized.includes(pattern);
  return pattern.test(normalized);
}

export function detectSessionKind(promptOrOutput: string): TerminalSessionKind {
  const text = normalizeWhitespace(promptOrOutput);

  if (!text) return "unknown";

  if (
    /\b(pc|server|laptop|printer|tablet)\d*>$/i.test(text) ||
    /\bpc>$/i.test(text) ||
    /\bserver>$/i.test(text)
  ) {
    return "host";
  }

  if (
    /\b(router|switch)[^>#$()]*[>#]$/i.test(text) ||
    /\(config[^)]*\)#$/i.test(text) ||
    /initial configuration dialog/i.test(text)
  ) {
    return "ios";
  }

  return "unknown";
}

export function detectModeFromPrompt(prompt: string): TerminalMode {
  const p = normalizePrompt(prompt);

  if (!p) return "unknown";

  // Boot / ROMMON
  if (/rommon|boot>/i.test(p)) return "boot";

  // Host prompts
  if (/\b(pc|server|laptop|printer|tablet)\d*>$/i.test(p) || /\bpc>$/i.test(p) || /\bserver>$/i.test(p)) {
    return "host-prompt";
  }

  // Wizard / confirmation-ish prompt that blocks terminal usage
  if (
    /would you like to enter the initial configuration dialog\?/i.test(p) ||
    /\[yes\/no\]:?$/i.test(p)
  ) {
    return "wizard";
  }

  if (/\[confirm\]$/i.test(p)) return "confirm";
  if (/--more--$/i.test(p)) return "pager";

  // Specific config submodes first
  if (/\(config-subif\)#$/i.test(p)) return "config-subif";
  if (/\(config-if\)#$/i.test(p)) return "config-if";
  if (/\(config-line\)#$/i.test(p)) return "config-line";
  if (/\(config-router\)#$/i.test(p)) return "config-router";
  if (/\(config-vlan\)#$/i.test(p)) return "config-vlan";

  // Generic config / unknown config submodes collapse to global-config
  if (/\(config[^)]*\)#$/i.test(p)) return "global-config";

  if (/>$/.test(p)) return "user-exec";
  if (/#$/.test(p)) return "privileged-exec";

  return "unknown";
}

export function detectWizardFromOutput(output: string): boolean {
  const text = normalizeWhitespace(output).toLowerCase();
  if (!text) return false;

  return (
    text.includes("initial configuration dialog") ||
    text.includes("would you like to enter the initial") ||
    text.includes("press return to get started") ||
    text.includes("continue with configuration dialog")
  );
}

export function detectConfirmPrompt(output: string): boolean {
  const line = lastNonEmptyLine(output);
  if (!line) return false;

  return (
    /\[confirm\]$/i.test(line) ||
    /\[yes\/no\]:?$/i.test(line) ||
    /destination filename \[[^\]]+\]\??$/i.test(line) ||
    /overwrite\?? \[confirm\]$/i.test(line)
  );
}

export function detectPager(output: string): boolean {
  const text = stripAnsi(output);
  return /--More--/i.test(text) || /\bMore\b/i.test(text);
}

export function detectBootOutput(output: string): boolean {
  const text = normalizeWhitespace(output).toLowerCase();
  return (
    text.includes("self decompressing the image") ||
    text.includes("bootstrap") ||
    text.includes("rommon") ||
    text.includes("boot loader")
  );
}

export function detectHostBusy(output: string): boolean {
  const text = normalizeWhitespace(output).toLowerCase();
  if (!text) return false;

  return (
    text.includes("reply from") ||
    text.includes("request timed out") ||
    text.includes("destination host unreachable") ||
    text.includes("tracing route") ||
    text.includes("trace complete") ||
    text.includes("ping statistics")
  );
}

export function isPrivilegedMode(mode: TerminalMode): boolean {
  return mode === "privileged-exec" || isConfigMode(mode);
}

export function isConfigMode(mode: TerminalMode): boolean {
  return (
    mode === "global-config" ||
    mode === "config-if" ||
    mode === "config-line" ||
    mode === "config-router" ||
    mode === "config-vlan" ||
    mode === "config-subif"
  );
}

export function isHostMode(mode: TerminalMode): boolean {
  return mode === "host-prompt" || mode === "host-busy";
}

export function needsEnable(currentMode: TerminalMode): boolean {
  return currentMode === "user-exec";
}

export function needsConfigTerminal(currentMode: TerminalMode): boolean {
  return !isConfigMode(currentMode);
}