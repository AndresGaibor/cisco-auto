// Stub que re-exporta desde IOS_DOMAIN global
// La lógica real vive en ios-domain.js (generado desde ios-domain/src/terminal-execution/kernel/)
// FIX: PT usa self, no globalThis
const _g = typeof self !== "undefined" ? self : globalThis;

function stripAnsiCodes(value: unknown): string {
  return String(value ?? "").replace(/\x1b\[[0-9;]*[a-zA-Z]|\x1b[()][a-zA-Z]/g, "");
}

function localIsHostPrompt(value: unknown): boolean {
  const line = stripAnsiCodes(String(value ?? "").trim());
  return /[A-Z]:\\>$/i.test(line) || /\b(?:pc|server|laptop|host|client|terminal)[A-Za-z0-9._-]*>$/i.test(line);
}

function localNativeHostFallbackBlockLooksComplete(block: string, command: string, prompt: string): boolean {
  const text = String(block ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) return false;
  const lastLine = lines.length > 0 ? lines[lines.length - 1] : "";
  if (!localIsHostPrompt(lastLine)) return false;
  const normalizedCommand = String(command ?? "").trim().replace(/\s+/g, " ").toLowerCase();
  const meaningfulLines = lines.filter((line) => {
    const normalizedLine = line.trim().toLowerCase();
    if (!normalizedLine) return false;
    if (normalizedLine === normalizedCommand) return false;
    if (localIsHostPrompt(line)) return false;
    if (/^cisco packet tracer pc command line/i.test(line)) return false;
    return true;
  });
  return meaningfulLines.length > 0;
}

export const normalizeEol = (v: unknown) => (_g as any).IOS_DOMAIN?.kernel?.normalizeEol?.(v) ?? String(v ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
export const isIosPrompt = (v: unknown) => (_g as any).IOS_DOMAIN?.kernel?.isIosPrompt?.(v) ?? /^[A-Za-z0-9._-]+(?:\(config[^)]*\))?[>#]$/.test(String(v ?? "").trim());
export const isHostPrompt = (v: unknown) => (_g as any).IOS_DOMAIN?.kernel?.isHostPrompt?.(v) ?? localIsHostPrompt(v);
export const lastNonEmptyLine = (v: unknown) => {
  if ((_g as any).IOS_DOMAIN?.kernel?.lastNonEmptyLine) return (_g as any).IOS_DOMAIN?.kernel?.lastNonEmptyLine?.(v);
  const text = String(v ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  return lines.length > 0 ? lines[lines.length - 1] : "";
};
export const lineContainsCommandEcho = (line: string, cmd: string) => (_g as any).IOS_DOMAIN?.kernel?.lineContainsCommandEcho?.(line, cmd) ?? false;
export const isPagerOnlyLine = (line: string) => (_g as any).IOS_DOMAIN?.kernel?.isPagerOnlyLine?.(line) ?? /^--More--$/i.test(String(line ?? "").trim());
export const nativeHostFallbackBlockLooksComplete = (block: string, command: string, prompt: string) => (_g as any).IOS_DOMAIN?.kernel?.nativeHostFallbackBlockLooksComplete?.(block, command, prompt) ?? localNativeHostFallbackBlockLooksComplete(block, command, prompt);
