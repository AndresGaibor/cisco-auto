// ============================================================================
// Prompt Detector - Detecta modo, wizard, confirmaciones, paginación e idioma de sesión
// ============================================================================
// Utilizado por el terminal engine para inferir estado IOS desde prompts.
// Trabaja sobre output sanitizado (sin ANSI, sin \r).

import type { TerminalMode, TerminalSessionKind } from "./session-state";
import { 
  stripAnsi, 
  normalizeWhitespace, 
  sanitizeCommandOutput as internalSanitizeOutput 
} from "./command-sanitizer";

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

  const p = text.toLowerCase();

  // Heurísticas de Host
  if (
    /[A-Z]:\\>$/i.test(text) || 
    /\b(pc|server|laptop|client|tablet|host|station|terminal|workstation|node)[a-zA-Z0-9_-]*>/i.test(text) ||
    p === "js>" || 
    p === "python>>>"
  ) {
    return "host";
  }

  // IOS: Termina en # (todos los modos privileged/config) o > (user-exec)
  if (/#$/.test(text) || /\(config[^)]*\)#$/i.test(text)) {
    return "ios";
  }

  // WLC / ASA / Wizards
  if (
    p.indexOf("cisco controller") !== -1 || 
    p.indexOf("ciscoasa") !== -1 || 
    p.indexOf("initial configuration dialog") !== -1
  ) {
    return "ios";
  }

  if (/>$/.test(text)) {
    if (p.indexOf("router") !== -1 || p.indexOf("switch") !== -1) {
      return "ios";
    }
    // Por defecto, si termina en > y no es host conocido, asumimos IOS user-exec
    return "ios";
  }

  return "unknown";
}

/**
 * Detecta el modo IOS desde un prompt normalizado.
 */
export function detectModeFromPrompt(prompt: string): TerminalMode {
  const p = normalizePrompt(prompt);

  if (!p) return "unknown";

  // WLC Prompt: (Cisco Controller) >
  if (/\(Cisco Controller\)\s*>$/i.test(p)) {
    return "user-exec";
  }

  // Boot / ROMMON
  if (/rommon|boot>/i.test(p)) return "boot";

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

  // Pager / Wizard / Confirm
  if (/--more--/i.test(p) || /\bMore\b/i.test(p)) return "pager";
  if (/\[confirm\]$/i.test(p)) return "confirm";
  if (
    /would you like to enter the initial configuration dialog\?/i.test(p) ||
    /\[yes\/no\]:?$/i.test(p)
  ) {
    return "wizard";
  }

  // Host prompt
  if (/>$/.test(p)) {
    // Si detectamos que es un host (por nombre o heurística)
    if (/\b(pc|server|laptop|printer|tablet|host|station|client)[a-zA-Z0-9_-]*>/i.test(p)) {
      return "host-prompt";
    }
    
    // El prompt de Windows C:\> NO es user-exec de IOS
    if (/[A-Z]:\\>$/i.test(p)) {
      return "host-prompt";
    }

    // Sub-shells comunes en PT
    if (p === "js>" || p === "python>>>") {
      return "host-prompt";
    }

    return "user-exec";
  }

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
    text.indexOf("initial configuration dialog") !== -1 ||
    text.indexOf("would you like to enter the initial") !== -1 ||
    text.indexOf("press return to get started") !== -1 ||
    text.indexOf("continue with configuration dialog") !== -1 ||
    text.indexOf("cisco wireless lan controller setup wizard") !== -1 ||
    text.indexOf("welcome to the cisco wireless") !== -1
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
    /\(y\/n\)\??:?\s*$/i.test(line) ||
    /destination filename \[[^\]]+\]\??$/i.test(line) ||
    /overwrite\?? \[confirm\]$/i.test(line) ||
    /erase.*\[confirm\]$/i.test(line) ||
    /delete.*\[confirm\]$/i.test(line) ||
    /reload\? \[confirm\]$/i.test(line)
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
    text.includes("ping statistics") ||
    text.includes("connected to") ||
    text.includes("trying") ||
    text.includes("escape character is") ||
    text.includes("connection closed")
  );
}

export function detectDnsLookup(output: string): boolean {
  const text = output.toLowerCase();
  return text.indexOf("translating") !== -1 && (text.indexOf("domain server") !== -1 || text.indexOf("...") !== -1);
}

export function detectAuthPrompt(output: string): boolean {
  const line = lastNonEmptyLine(output);
  if (!line) return false;

  return (
    /username:/i.test(line) ||
    /password:/i.test(line) ||
    /login:/i.test(line)
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

/**
 * Lee el output actual del terminal intentando varios métodos de PT.
 * Sanitiza caracteres de control BELL, ANSI, Backspace y no imprimibles.
 */
export function readTerminalOutput(terminal: any): string {
  try {
    const methods = [
      "getAllOutput", "getBuffer", "getOutput", "getText", 
      "readAll", "read", "getHistory", "history"
    ];
    let raw = "";

    // 1. Probar métodos directos
    for (let i = 0; i < methods.length; i++) {
      const m = methods[i]!;
      if (typeof terminal[m] === "function") {
        try {
          const out = terminal[m]();
          if (out && typeof out === "string" && out.length > 0) {
            // @ts-ignore
            if (typeof dprint === "function") dprint("[readTerminalOutput] method=" + m + " len=" + out.length);
            raw = out;
            break;
          }
        } catch(e) {}
      }
    }

    // 2. Probar vía getConsole() si existe (común en switches)
    if (!raw && typeof terminal.getConsole === "function") {
        try {
            const consoleObj = terminal.getConsole();
            if (consoleObj) {
                for (let i = 0; i < methods.length; i++) {
                    const m = methods[i]!;
                    if (typeof consoleObj[m] === "function") {
                        try {
                            const out = consoleObj[m]();
                            if (out && typeof out === "string" && out.length > 0) {
                                raw = out;
                                break;
                            }
                        } catch(e) {}
                    }
                }
            }
        } catch(e) {}
    }

    if (!raw && typeof terminal.toString === "function") {
        try {
            const s = terminal.toString();
            if (s && s.indexOf("Terminal") === -1 && s.indexOf("[object") === -1) raw = s;
        } catch(e) {}
    }

    return sanitizeOutput(raw);
  } catch {
    return "";
  }
}

/**
 * Sanitiza una cadena de output de terminal para detección de prompt.
 * Elimina \r y caracteres de control pero preserva \n.
 */
export function sanitizeOutput(output: string): string {
    if (!output) return "";
    return output
      .replace(/\r/g, "")
      .replace(/\u0007/g, "") // Bell
      .replace(/\u001b\[[0-9;]*[a-zA-Z]/g, ""); // ANSI
}
/**
 * Elimina el output base (baseline) de una cadena de output completa.
 * Desactivado para IOS para evitar pérdida de datos en ráfagas de logs.
 */
export function stripBaselineOutput(output: string, baseline: string): string {
  if (!output) return "";
  if (!baseline) return output;

  // No recortar NADA en IOS. Devolvemos todo el buffer para máxima visibilidad.
  // Heurística: si no detectamos un prompt de Host, asumimos que es IOS/Red.
  const isHost = /^[A-Z]:\\>/i.test(baseline) || /^[A-Z]:\\>/i.test(output);
  if (!isHost) {
      return output;
  }

  // Lógica de recorte solo para Host (PC)
  if (output.substring(0, baseline.length) === baseline) {
    return output.substring(baseline.length);
  }

  const lines = baseline.split("\n");
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i]?.trim();
    if (!line || line === "C:\\>") continue;

    const idx = output.lastIndexOf(line);
    if (idx !== -1) {
      return output.substring(idx + line.length);
    }
  }

  return output;
}