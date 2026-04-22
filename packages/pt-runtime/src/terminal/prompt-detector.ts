// ============================================================================
// Prompt Detector - Detecta modo, wizard, confirmaciones, paginación e idioma de sesión
// ============================================================================
// Utilizado por el terminal engine para inferir estado IOS desde prompts.
// Trabaja sobre output sanitizado (sin ANSI, sin \r).

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

/**
 * Normaliza un prompt eliminando ANSI y whitespace extra.
 * Para uso en matching y logging.
 * 
 * @param prompt - Prompt raw del terminal
 * @returns Prompt normalizado sin colores ni espacios extras
 */
export function normalizePrompt(prompt: string): string {
  return normalizeWhitespace(prompt);
}

/**
 * Compara un prompt contra un patrón.
 * 
 * @param pattern - String o RegExp a buscar
 * @param prompt - Prompt normalizado
 * @returns true si el patrón matches
 */
export function promptMatches(pattern: string | RegExp, prompt: string): boolean {
  const normalized = normalizePrompt(prompt);
  if (!normalized) return false;
  if (typeof pattern === "string") return normalized.includes(pattern);
  return pattern.test(normalized);
}

/**
 * Detecta qué tipo de sesión está corriendo: IOS CLI, host prompt, o desconocido.
 * Analiza el prompt/output para determinar si es un router/switch (IOS) o PC/Server (host).
 * 
 * @param promptOrOutput - Prompt actual o output del terminal
 * @returns "ios", "host", o "unknown"
 * 
 * @example
 * detectSessionKind("Router#") // → "ios"
 * detectSessionKind("PC>") // → "host"
 * detectSessionKind("something else") // → "unknown"
 */
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

/**
 * Detecta el modo IOS desde un prompt normalizado.
 * Analiza sufijos del prompt para determinar modo: user-exec, privileged-exec,
 * config (y submodes como config-if, config-router, etc.), wizard, pager, boot.
 * 
 * @param prompt - Prompt normalizado del terminal
 * @returns TerminalMode detectado o "unknown"
 * 
 * @example
 * detectModeFromPrompt("Router#") // → "privileged-exec"
 * detectModeFromPrompt("Router(config-if)#") // → "config-if"
 * detectModeFromPrompt("Router>") // → "user-exec"
 * detectModeFromPrompt("PC>") // → "host-prompt"
 */
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
  if (/\(config-if-range\)#$/i.test(p)) return "config-if-range";
  if (/\(dhcp-config\)#$/i.test(p)) return "dhcp-config";
  if (/\(dhcp-pool\)#$/i.test(p)) return "dhcp-pool";
  if (/\(config-telephony\)#$/i.test(p)) return "config-telephony";
  if (/\(config-ephone\)#$/i.test(p)) return "config-ephone";
  if (/\(config-ephone-dn\)#$/i.test(p)) return "config-ephone-dn";
  if (/\(config-voip\)#$/i.test(p)) return "config-voip";

  // Generic config / unknown config submodes collapse to global-config
  if (/\(config[^)]*\)#$/i.test(p)) return "global-config";

  if (/>$/.test(p)) return "user-exec";
  if (/#$/.test(p)) return "privileged-exec";

  return "unknown";
}

/**
 * Detecta si el output contiene el diálogo de initial configuration wizard.
 * Este diálogo bloquea la terminal hasta que se responda "no".
 * 
 * @param output - Output del terminal
 * @returns true si se detectó el wizard
 */
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

/**
 * Detecta prompts de confirmación del IOS.
 * Incluye [confirm], [yes/no]:, overwrite, destination filename.
 * 
 * @param output - Output del terminal
 * @returns true si se detectó prompt de confirmación
 */
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

/**
 * Detecta si el output contiene paging (--More--).
 * El pager aparece en outputs largos y requiere SPACE para continuar.
 * 
 * @param output - Output del terminal
 * @returns true si se detectó pager
 */
export function detectPager(output: string): boolean {
  const text = stripAnsi(output);
  return /--More--/i.test(text) || /\bMore\b/i.test(text);
}

/**
 * Detecta output de boot de router (ROMMON, bootstrap).
 * Usado para identificar si el dispositivo está en proceso de booteo.
 * 
 * @param output - Output del terminal
 * @returns true si parece output de boot
 */
export function detectBootOutput(output: string): boolean {
  const text = normalizeWhitespace(output).toLowerCase();
  return (
    text.includes("self decompressing the image") ||
    text.includes("bootstrap") ||
    text.includes("rommon") ||
    text.includes("boot loader")
  );
}

/**
 * Detecta output de comandos host busy (ping, traceroute).
 * Reconoce respuestas de ping, timeouts, unreachables, y trace complete.
 * 
 * @param output - Output del terminal
 * @returns true si parece output de ping/traceroute
 */
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

export function detectDnsLookup(output: string): boolean {
  const text = normalizeWhitespace(output).toLowerCase();
  return text.includes("translating") && text.includes("domain");
}

export function detectAuthPrompt(output: string): boolean {
  const line = lastNonEmptyLine(output);
  if (!line) return false;

  return (
    /^username:/i.test(line) ||
    /^password:/i.test(line) ||
    /^login:/i.test(line)
  );
}

export function detectReloadPrompt(output: string): boolean {
  const text = normalizeWhitespace(output).toLowerCase();
  return (
    text.includes("reload") &&
    text.includes("confirm")
  );
}

export function detectErasePrompt(output: string): boolean {
  const text = normalizeWhitespace(output).toLowerCase();
  return (
    text.includes("erase") &&
    text.includes("confirm")
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
    mode === "config-subif" ||
    mode === "config-if-range" ||
    mode === "dhcp-config" ||
    mode === "dhcp-pool" ||
    mode === "config-telephony" ||
    mode === "config-ephone" ||
    mode === "config-ephone-dn" ||
    mode === "config-voip"
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