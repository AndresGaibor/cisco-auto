// ============================================================================
// Terminal Ready - Verifica y prepara el terminal para ejecutar comandos
// ============================================================================
// Proporciona funciones para verificar si el terminal está listo para recibir
// comandos, leer el prompt/modo de forma segura, y despertar el terminal si es necesario.
// Incluye detección de log storms (syslog noise) y soporte para enable automático.

import { detectModeFromPrompt, normalizePrompt, readTerminalSnapshot } from "./prompt-detector";
import type { TerminalSessionKind, TerminalMode } from "./session-state";

export interface TerminalReadyOptions {
  maxRetries?: number;
  retryDelayMs?: number;
  wakeUpOnFail?: boolean;
  ensurePrivileged?: boolean;
  quietThresholdMs?: number;
}

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_RETRY_DELAY_MS = 500;
const DEFAULT_QUIET_THRESHOLD_MS = 2000;

/**
 * Lee el prompt del terminal de forma segura, sin lanzar excepciones.
 */
export function getPromptSafe(terminal: any): string {
  try {
    if (typeof terminal.getPrompt === "function") {
      const p = terminal.getPrompt();
      if (p && typeof p === "string") {
        return p;
      }
    }
    return "";
  } catch {
    return "";
  }
}

/**
 * Lee el modo del terminal de forma segura, sin lanzar excepciones.
 */
export function getModeSafe(terminal: any): string {
  try {
    if (typeof terminal.getMode === "function") {
      const m = terminal.getMode();
      if (m && typeof m === "string") {
        return m;
      }
    }

    const prompt = getPromptSafe(terminal);
    if (prompt) {
      return detectModeFromPrompt(prompt);
    }

    return "unknown";
  } catch {
    return "unknown";
  }
}

/**
 * Verifica si el terminal está listo para recibir un comando.
 * Para IOS: verifica que haya un prompt válido.
 * Para Host: verifica que haya un prompt de host válido.
 */
export function isTerminalReadyForCommand(
  terminal: any,
  kind: TerminalSessionKind
): boolean {
  const prompt = getPromptSafe(terminal);
  if (!prompt || !prompt.trim()) return false;

  const normalizedPrompt = normalizePrompt(prompt);

  if (kind === "host") {
    return (
      /[A-Z]:\\>/i.test(normalizedPrompt) ||
      /\b(pc|server|laptop|client|terminal)[a-zA-Z0-9_-]*>/i.test(normalizedPrompt) ||
      normalizedPrompt === "js>" ||
      normalizedPrompt === "python>>>"
    );
  }

  return (
    />$/.test(normalizedPrompt) ||
    /#$/.test(normalizedPrompt) ||
    /\(config[^)]*\)#$/.test(normalizedPrompt)
  );
}

/**
 * Despierta el terminal enviando un Enter.
 * Útil para IOS donde el terminal puede estar dormido después de un comando largo.
 */
export function wakeTerminal(terminal: any): void {
  try {
    if (typeof terminal.enterChar === "function") {
      terminal.enterChar(13, 0);
    }
  } catch {
  }
}

/**
 * Detecta si hay syslog reciente en el output del terminal.
 * Útil para switches con log storm (CDP, STP, etc.).
 */
export function hasRecentSyslog(terminal: any, quietThresholdMs: number): boolean {
  try {
    const snapshot = readTerminalSnapshot(terminal);
    const output = snapshot.raw;

    if (!output) return true;

    const syslogPatterns = [
      "%CDP-4-",
      "%LINEPROTO-5-UPDOWN",
      "%LINK-3-UPDOWN",
      "%SYS-5-CONFIG_I",
      "%SYS-5-RELOAD",
      "%STP-5-",
      "%PVST-5-",
      "%VLAN-",
    ];

    const lines = output.split("\n");
    const recentLines = lines.slice(-10);

    for (let i = 0; i < recentLines.length; i++) {
      const line = recentLines[i] || "";
      for (let j = 0; j < syslogPatterns.length; j++) {
        if (line.indexOf(syslogPatterns[j]) !== -1) {
          return true;
        }
      }
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Asegura que el terminal esté listo para ejecutar un comando.
 * Intenta múltiples veces si es necesario.
 * Soporta:
 * - waiting for stable prompt (not just present)
 * - detection de log storm (syslog noise)
 * - enable automático si ensurePrivileged=true
 */
export async function ensureTerminalReady(
  terminal: any,
  kind: TerminalSessionKind,
  options: TerminalReadyOptions = {}
): Promise<{ ready: boolean; prompt: string; mode: string }> {
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  const retryDelayMs = options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
  const wakeUpOnFail = options.wakeUpOnFail ?? true;
  const ensurePrivileged = options.ensurePrivileged ?? false;
  const quietThresholdMs = options.quietThresholdMs ?? DEFAULT_QUIET_THRESHOLD_MS;

  let lastOutputLength = 0;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const prompt = getPromptSafe(terminal);
    const mode = getModeSafe(terminal);

    if (isTerminalReadyForCommand(terminal, kind)) {
      const snapshot = readTerminalSnapshot(terminal);
      const currentLength = snapshot.raw.length;
      const outputDelta = currentLength - lastOutputLength;

      if (outputDelta > 0) {
        const hasNoise = hasRecentSyslog(terminal, quietThresholdMs);
        if (hasNoise) {
          lastOutputLength = currentLength;
          if (attempt < maxRetries - 1) {
            await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
            continue;
          }
        }
      }

      if (ensurePrivileged && kind === "ios" && mode !== "privileged-exec") {
        try {
          terminal.enterCommand("enable");
          terminal.enterChar(13, 0);
          await new Promise((resolve) => setTimeout(resolve, 300));
          const newPrompt = getPromptSafe(terminal);
          const newMode = getModeSafe(terminal);
          if (newMode === "privileged-exec") {
            return { ready: true, prompt: newPrompt, mode: newMode };
          }
        } catch {}
      }

      return { ready: true, prompt, mode };
    }

    if (attempt < maxRetries - 1) {
      if (wakeUpOnFail) {
        wakeTerminal(terminal);
      }
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    }
  }

  const finalPrompt = getPromptSafe(terminal);
  const finalMode = getModeSafe(terminal);
  return { ready: false, prompt: finalPrompt, mode: finalMode };
}

/**
 * Version síncrona de ensureTerminalReady para casos donde no se puede usar async.
 */
export function ensureTerminalReadySync(
  terminal: any,
  kind: TerminalSessionKind,
  options: TerminalReadyOptions = {}
): { ready: boolean; prompt: string; mode: string } {
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  const wakeUpOnFail = options.wakeUpOnFail ?? true;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const prompt = getPromptSafe(terminal);
    const mode = getModeSafe(terminal);

    if (isTerminalReadyForCommand(terminal, kind)) {
      return { ready: true, prompt, mode };
    }

    if (attempt < maxRetries - 1) {
      if (wakeUpOnFail) {
        wakeTerminal(terminal);
      }
    }
  }

  const finalPrompt = getPromptSafe(terminal);
  const finalMode = getModeSafe(terminal);
  return { ready: false, prompt: finalPrompt, mode: finalMode };
}