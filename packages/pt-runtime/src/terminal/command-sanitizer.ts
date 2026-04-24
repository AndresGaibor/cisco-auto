// ============================================================================
// Command Sanitizer - Limpia output de terminal eliminando ruidos de presentación
// ============================================================================

// eslint-disable-next-line no-control-regex
const ANSI_ESCAPE_RE = /\x1B\[[0-9;]*[A-Za-z]/g;
const NON_PRINTABLE_RE = /[^\x20-\x7E\r\n\t]/g;
// eslint-disable-next-line no-control-regex
const BELL_RE = new RegExp(String.fromCharCode(7), "g"); // \x07
const BACKSPACE_CHAR = String.fromCharCode(8); // \x08

/**
 * Elimina secuencias escape ANSI (códigos de color).
 * 
 * @param input -Texto raw
 * @returns Texto sin códigos ANSI
 */
export function stripAnsi(input: string): string {
  return String(input ?? "").replace(ANSI_ESCAPE_RE, "");
}

/**
 * Procesa caracteres de backspace (\x08) de forma lógica,
 * eliminando el carácter anterior.
 * 
 * @param input -Texto con backspaces
 * @returns Texto procesado
 */
export function processBackspaces(input: string): string {
  let processed = "";
  for (let i = 0; i < input.length; i++) {
    if (input[i] === BACKSPACE_CHAR) {
      processed = processed.slice(0, -1);
    } else {
      processed += input[i];
    }
  }
  return processed;
}

/**
 * Elimina caracteres de campana (Bell).
 * 
 * @param input -Texto raw
 * @returns Texto sin Bell
 */
export function stripBell(input: string): string {
  return input.replace(/\x07/g, "");
}

/**
 * Elimina caracteres no imprimibles excepto los válidos.
 * 
 * @param input -Texto raw
 * @returns Texto solo con caracteres imprimibles
 */
export function stripNonPrintable(input: string): string {
  return input.replace(NON_PRINTABLE_RE, "");
}

/**
 * Normaliza whitespace: elimina \r redundantes y tabs.
 * Preserva saltos de línea (\n).
 * 
 * @param input -Texto raw
 * @returns Texto normalizado
 */
export function normalizeWhitespace(input: string): string {
  return input
    .replace(/\r/g, "")
    .replace(/\t/g, " ")
    .replace(/[ ]+/g, " ")
    .trim();
}

/**
 * Sanitiza una cadena de output de terminal:
 * - Procesar backspaces (\b) de forma lógica (borra el anterior)
 * - Elimina Bell characters y ANSI
 * - Normaliza whitespace preservando saltos de línea
 * 
 * @param raw -Output raw del terminal
 * @returns Output limpio para parsing
 */
export function sanitizeCommandOutput(raw: string): string {
  if (!raw) return "";

  // 1. Procesar backspaces (\b) de forma lógica (SIN UNDERFLOW)
  let processed = "";
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] === BACKSPACE_CHAR) {
      if (processed.length > 0) {
        processed = processed.substring(0, processed.length - 1);
      }
    } else {
      processed += raw[i];
    }
  }

  // 2. Limpieza de ruidos (Preservamos \n y caracteres útiles)
  // No usamos NON_PRINTABLE_RE aquí porque es muy agresivo con IOS
  const result = processed
    .replace(BELL_RE, "")
    .replace(ANSI_ESCAPE_RE, "")
    .replace(/\r/g, "");
  
  return result.trim();
}

/**
 * Versión alternativa que procesa backspaces de forma más simple.
 * Útil para outputs donde los backspaces aparecen al final.
 * 
 * @param raw -Output raw
 * @returns Output limpio
 */
export function sanitizeCommandOutputSimple(raw: string): string {
  if (!raw) return "";

  const backspaceProcessed = raw
    .split("")
    .map((char) => (char === BACKSPACE_CHAR ? null : char))
    .filter(Boolean)
    .join("");

  return stripBell(backspaceProcessed)
    .replace(ANSI_ESCAPE_RE, "")
    .replace(NON_PRINTABLE_RE, "")
    .replace(/\r/g, "")
    .replace(/\t/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export const CommandSanitizer = {
  stripAnsi,
  processBackspaces,
  stripBell,
  stripNonPrintable,
  normalizeWhitespace,
  sanitize: sanitizeCommandOutput,
  sanitizeSimple: sanitizeCommandOutputSimple,
};