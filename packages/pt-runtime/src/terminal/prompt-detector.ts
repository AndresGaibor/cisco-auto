// ============================================================================
// Prompt Detector - Detecta modo de terminal de prompt
// ============================================================================

import type { TerminalMode } from "./session-state";

const PATTERNS = {
  userExec: />$/,
  privExec: /#$/,
  config: /\(config\)#$/,
  configIf: /\(config-if\)#/,
  configLine: /\(config-line\)#/,
  configRouter: /\(config-router\)#/,
  configVlan: /\(config-vlan\)#/,
  wizard: /---\?$/,
  confirm: /\[yes\/no\]$/i,
  pager: /--More--$/i,
  boot: /ROMMON|boot>/i,
};

export function detectModeFromPrompt(prompt: string): TerminalMode {
  if (!prompt || typeof prompt !== "string") {
    return "unknown";
  }

  const trimmed = prompt.trim();

  if (PATTERNS.configVlan.test(trimmed)) {
    return "config-vlan";
  }
  if (PATTERNS.configRouter.test(trimmed)) {
    return "config-router";
  }
  if (PATTERNS.configLine.test(trimmed)) {
    return "config-line";
  }
  if (PATTERNS.configIf.test(trimmed)) {
    return "config-if";
  }
  if (PATTERNS.config.test(trimmed)) {
    return "global-config";
  }
  if (PATTERNS.privExec.test(trimmed)) {
    return "privileged-exec";
  }
  if (PATTERNS.userExec.test(trimmed)) {
    return "user-exec";
  }
  if (PATTERNS.boot.test(trimmed)) {
    return "boot";
  }

  return "unknown";
}

export function detectWizardFromOutput(output: string): boolean {
  if (!output) return false;
  const lower = output.toLowerCase();
  return (
    lower.includes("initial configuration dialog") ||
    lower.includes("would you like to enter the initial") ||
    lower.includes("setup")
  );
}

export function detectConfirmPrompt(output: string): boolean {
  if (!output) return false;
  return PATTERNS.confirm.test(output);
}

export function detectPager(output: string): boolean {
  if (!output) return false;
  return PATTERNS.pager.test(output);
}

export function normalizePrompt(prompt: string): string {
  if (!prompt) return "";
  return prompt.trim().replace(/\s+/g, " ");
}

export function promptMatches(pattern: string | RegExp, prompt: string): boolean {
  if (!prompt || !pattern) return false;
  if (typeof pattern === "string") {
    return prompt.includes(pattern);
  }
  return pattern.test(prompt);
}

export function isPrivilegedMode(mode: TerminalMode): boolean {
  return mode === "privileged-exec" || mode.startsWith("config");
}

export function isConfigMode(mode: TerminalMode): boolean {
  return mode.startsWith("config");
}

export function needsEnable(currentMode: TerminalMode): boolean {
  return currentMode === "user-exec";
}

export function needsConfigTerminal(currentMode: TerminalMode): boolean {
  return currentMode !== "global-config" && currentMode !== "config-if" && currentMode !== "config-line";
}