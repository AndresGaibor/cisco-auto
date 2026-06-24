// packages/pt-runtime/src/pt/kernel/execution-engine-semantic.ts
// Stub que delega a la implementación real en ios-domain.js (global IOS_DOMAIN)
// La función real está en packages/ios-domain/src/terminal-execution/kernel/semantic.ts

export const buildSemanticErrorResult = (
  semanticError: { code: string; message: string },
  prompt?: unknown,
  mode?: unknown,
  cleanupOutput?: string,
): any => {
  // La implementación real está en ios-domain.js como IOS_DOMAIN.kernel.buildSemanticErrorResult
  // En PT, `self` y `globalThis` son undefined; `this` es el global en scripts no-module
  const _g = (typeof self !== "undefined" ? self : typeof globalThis !== "undefined" ? globalThis : this) as any;
  if (_g?.IOS_DOMAIN?.kernel?.buildSemanticErrorResult) {
    return _g.IOS_DOMAIN.kernel.buildSemanticErrorResult(semanticError, prompt, mode, cleanupOutput ?? "");
  }
  // Fallback: construir resultado manualmente
  const msg = semanticError?.message || "Unknown error";
  return {
    ok: false,
    output: msg,
    rawOutput: msg,
    raw: msg,
    status: 1,
    error: msg,
    code: semanticError?.code || "SEMANTIC_ERROR",
    prompt: String(prompt || ""),
    mode: String(mode || ""),
  } as any;
};

export const extractNativeCleanupOutputSinceBaseline = (currentOutput: string, baselineOutput: string): string => {
  const _g = (typeof self !== "undefined" ? self : typeof globalThis !== "undefined" ? globalThis : this) as any;
  if (_g?.IOS_DOMAIN?.kernel?.extractNativeCleanupOutputSinceBaseline) {
    return _g.IOS_DOMAIN.kernel.extractNativeCleanupOutputSinceBaseline(currentOutput, baselineOutput);
  }
  if (currentOutput.length <= baselineOutput.length) return "";
  return currentOutput.slice(baselineOutput.length);
};
