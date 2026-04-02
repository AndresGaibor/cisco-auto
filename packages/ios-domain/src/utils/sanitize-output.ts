// ============================================================================
// IOS Output Sanitizer
// Removes ANSI, --More--, control chars from IOS output before parsing
// ============================================================================

export interface SanitizeResult {
  cleaned: string;
  hadAnsi: boolean;
  hadMore: boolean;
  hadControlChars: boolean;
  hadTruncation: boolean;
}

function stripAnsi(output: string): { cleaned: string; hadAnsi: boolean } {
  // ANSI CSI sequences ending in a letter (color, cursor, etc.)
  // ESC[...m (SGR/set graphics rendition), ESC[...H (cursor position), etc.
  const ansiPattern = /\x1B\[[0-9;]*[a-zA-Z]/g;
  // Also strip standalone ESC (not followed by [)
  const standaloneEsc = /\x1B(?!\[[0-9;]*[a-zA-Z])/g;
  const hadAnsi = ansiPattern.test(output) || standaloneEsc.test(output);
  let cleaned = output.replace(ansiPattern, "");
  cleaned = cleaned.replace(standaloneEsc, "");
  return { cleaned, hadAnsi };
}

function stripControlChars(output: string): { cleaned: string; hadControlChars: boolean } {
  // VT100/IOS control characters found in CLI output
  // \x1B[?D - reverse index (cursor left) - 4 chars: ESC [ ? D
  // \x08 - backspace
  // \x1B[K - clear to end of line
  const controlPattern = /\x1B\[\?D|\x08|\x1B\[K/g;
  const hadControlChars = controlPattern.test(output);
  const cleaned = output.replace(controlPattern, "");
  return { cleaned, hadControlChars };
}

function normalizeLineEndings(output: string): string {
  return output.replace(/\r\n?/g, "\n");
}

function stripMore(output: string): { cleaned: string; hadMore: boolean } {
  // --More--, -- More --, and variants
  const morePattern = /--+\s*[Mm]o+re\s*-+/g;
  const hadMore = morePattern.test(output);
  const cleaned = output.replace(morePattern, "");
  return { cleaned, hadMore };
}

function collapseBlankLines(output: string): string {
  return output.replace(/\n{3,}/g, "\n\n");
}

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
