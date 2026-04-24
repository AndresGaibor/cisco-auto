// ============================================================================
// IOS Output Sanitizer
// Elimina códigos ANSI, --More--, y caracteres de control del output IOS antes de parsing
// ============================================================================

/**
 * Resultado de sanitización con flags indicando qué se encontró y limpió.
 */
export interface SanitizeResult {
  /** Output limpio sin ANSI, control chars ni --More-- */
  cleaned: string;
  /** Si se detectaron y removieron códigos ANSI (colores, cursor) */
  hadAnsi: boolean;
  /** Si se detectaron y removieron prompts --More-- */
  hadMore: boolean;
  /** Si se removieron caracteres de control VT100/IOS */
  hadControlChars: boolean;
  /** Si el output parece estar truncado (no termina en prompt válido) */
  hadTruncation: boolean;
}

/**
 * Elimina secuencias ANSI CSI y standalone ESC del output.
 * Las secuencias CSI son del tipo ESC[<n>m (colors, atributos) o ESC[<n>H (cursor).
 * @param output - Output posiblemente包含ANSI
 * @returns Output limpio y flag indicando si había ANSI
 */
function stripAnsi(output: string): { cleaned: string; hadAnsi: boolean } {
  const ansiPattern = /\x1B\[[0-9;]*[a-zA-Z]/g;
  const standaloneEsc = /\x1B(?!\[[0-9;]*[a-zA-Z])/g;
  const hadAnsi = ansiPattern.test(output) || standaloneEsc.test(output);
  let cleaned = output.replace(ansiPattern, "");
  cleaned = cleaned.replace(standaloneEsc, "");
  return { cleaned, hadAnsi };
}

/**
 * Elimina caracteres de control VT100/IOS常见于输出.
 * Incluye: ESC[?D (reverse index), \x08 (backspace), ESC[K (clear to EOL).
 * @param output - Output posiblemente包含控制字符
 * @returns Output limpio y flag indicando si había control chars
 */
function stripControlChars(output: string): { cleaned: string; hadControlChars: boolean } {
  const controlPattern = /\x1B\[\?D|\x08|\x1B\[K/g;
  const hadControlChars = controlPattern.test(output);
  const cleaned = output.replace(controlPattern, "");
  return { cleaned, hadControlChars };
}

/**
 * Normaliza line endings混合\r\n y \n a solo \n.
 * IOS usa \r\n pero algunos outputs pueden venir con solo \n.
 * @param output - Output con line endings mixtos
 * @returns Output con solo \n como line ending
 */
function normalizeLineEndings(output: string): string {
  return output.replace(/\r\n?/g, "\n");
}

/**
 * Elimina prompts de paginación --More-- y variantes.
 * Aplica regex que matchea "--More--", "-- More --", y otros variantes con espacios.
 * @param output - Output posiblemente包含--More--
 * @returns Output limpio y flag indicando si había --More--
 */
function stripMore(output: string): { cleaned: string; hadMore: boolean } {
  const morePattern = /--+\s*[Mm]o+re\s*-+/g;
  const hadMore = morePattern.test(output);
  const cleaned = output.replace(morePattern, "");
  return { cleaned, hadMore };
}

/**
 * Colapsa líneas en blanco excessivas a máximo 2 líneas seguidas.
 * IOS output puede tener múltiples líneas en blanco que no son útiles para parsing.
 * @param output - Output posiblemente con líneas en blanco excessivas
 * @returns Output con líneas en blanco colapsadas
 */
function collapseBlankLines(output: string): string {
  return output.replace(/\n{3,}/g, "\n\n");
}

/**
 * Detecta si el output parece estar truncado.
 * Un output está truncado si no termina en un prompt IOS válido.
 * Esto es útil para detectar cuando el usuario presionó Ctrl+C durante paging.
 * @param output - Output a verificar
 * @returns true si parece truncado, false si termina correctamente
 */
function detectTruncation(output: string): boolean {
  const trimmed = output.trim();
  if (!trimmed || trimmed.length < 20) return false;

  const lines = trimmed.split("\n");
  const lastLine = lines[lines.length - 1]!.trim();

  // Check if ends with a valid IOS prompt
  if (/^[A-Za-z0-9\-_*( )]+\s*[>#]\s*$/.test(lastLine)) return false;
  if (/^\(config[^\)]*\)\s*#\s*$/.test(lastLine)) return false;
  if (/^\(config-[a-z]+\)\s*#\s*$/.test(lastLine)) return false;
  if (/^\[confirm\]\s*$/i.test(lastLine)) return false;
  if (/^Password:\s*$/i.test(lastLine)) return false;
  if (/^Username:\s*$/i.test(lastLine)) return false;

  // Looks like partial output
  if (/^%/.test(lastLine)) return true; // error line at end
  if (/^Interface\s+/i.test(lastLine)) return true; // mid-table
  if (/^\s{2,}[A-Z]/.test(lastLine)) return true; // indented continuation

  return true;
}

/**
 * Limpia output IOS eliminando ANSI, caracteres de control, y --More--.
 * Detecta si el output está truncado y retorna flags indicando qué se limpió.
 * @param raw - Output bruto del terminal IOS
 * @returns Resultado con output limpio y flags de lo que se detectó
 */
export function sanitizeOutput(raw: string): SanitizeResult {
  if (!raw || raw.length === 0) {
    return { cleaned: "", hadAnsi: false, hadMore: false, hadControlChars: false, hadTruncation: false };
  }

  let output = raw;

  const ansiResult = stripAnsi(output);
  output = ansiResult.cleaned;

  const ctrlResult = stripControlChars(output);
  output = ctrlResult.cleaned;

  output = normalizeLineEndings(output);

  const moreResult = stripMore(output);
  output = moreResult.cleaned;

  output = collapseBlankLines(output);

  const hadTruncation = detectTruncation(output);

  return {
    cleaned: output,
    hadAnsi: ansiResult.hadAnsi,
    hadMore: moreResult.hadMore,
    hadControlChars: ctrlResult.hadControlChars,
    hadTruncation,
  };
}