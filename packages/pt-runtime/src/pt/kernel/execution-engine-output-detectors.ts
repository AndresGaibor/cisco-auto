// Stub que re-exporta desde IOS_DOMAIN global
// La lógica real vive en ios-domain.js (generado desde ios-domain/src/terminal-execution/kernel/)
// FIX: PT usa self, no globalThis
const _g = typeof self !== "undefined" ? self : globalThis;
export const normalizeEol = (v: unknown) => (_g as any).IOS_DOMAIN?.kernel?.normalizeEol?.(v) ?? String(v ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
export const isIosPrompt = (v: unknown) => (_g as any).IOS_DOMAIN?.kernel?.isIosPrompt?.(v) ?? false;
export const isHostPrompt = (v: unknown) => (_g as any).IOS_DOMAIN?.kernel?.isHostPrompt?.(v) ?? false;
export const lastNonEmptyLine = (v: unknown) => (_g as any).IOS_DOMAIN?.kernel?.lastNonEmptyLine?.(v) ?? "";
export const lineContainsCommandEcho = (line: string, cmd: string) => (_g as any).IOS_DOMAIN?.kernel?.lineContainsCommandEcho?.(line, cmd) ?? false;
export const isPagerOnlyLine = (line: string) => (_g as any).IOS_DOMAIN?.kernel?.isPagerOnlyLine?.(line) ?? /^--More--$/i.test(String(line ?? "").trim());
export const nativeHostFallbackBlockLooksComplete = (block: string, command: string, prompt: string) => (_g as any).IOS_DOMAIN?.kernel?.nativeHostFallbackBlockLooksComplete?.(block, command, prompt) ?? false;
