// Stub que re-exporta desde IOS_DOMAIN global
// FIX: Las funciones existen como globals en ios-domain.js, no como iosDomain.kernel
export const buildSemanticErrorResult = (output: string, command: string): { ok: false; output: string; status: number; code: string } => {
  const _g = (typeof self !== "undefined" ? self : globalThis) as any;
  if (_g?.IOS_DOMAIN?.kernel?.buildSemanticErrorResult) {
    return _g.IOS_DOMAIN.kernel.buildSemanticErrorResult({ message: output }, command, "", "");
  }
  // FIX: Llamar global directamente si existe
  if (typeof buildSemanticErrorResult === "function") {
    return (buildSemanticErrorResult as any)({ message: output }, command, "", "");
  }
  return { ok: false, output, status: 1, code: "SEMANTIC_ERROR" };
};

export const extractNativeCleanupOutputSinceBaseline = (currentOutput: string, baselineOutput: string): string => {
  const _g = (typeof self !== "undefined" ? self : globalThis) as any;
  if (_g?.IOS_DOMAIN?.kernel?.extractNativeCleanupOutputSinceBaseline) {
    return _g.IOS_DOMAIN.kernel.extractNativeCleanupOutputSinceBaseline(currentOutput, baselineOutput);
  }
  // FIX: Llamar global directamente si existe
  if (typeof extractNativeCleanupOutputSinceBaseline === "function") {
    return (extractNativeCleanupOutputSinceBaseline as any)(currentOutput, baselineOutput);
  }
  if (currentOutput.length <= baselineOutput.length) return "";
  return currentOutput.slice(baselineOutput.length);
};
