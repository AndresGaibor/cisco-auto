// packages/pt-runtime/src/pt/kernel/execution-engine-semantic.ts
// Helpers puros para detección de errores semánticos IOS y construcción de resultados
import { normalizeEol } from "./execution-engine-output-detectors";
import { extractLatestCommandBlock } from "./execution-engine-delta";

export function detectIosSemanticErrorFromOutput(output: unknown): { code: string; message: string } | null {
  const text = String(output ?? "");

  if (!text.trim()) return null;

  if (/%\s*Invalid input detected/i.test(text)) {
    return { code: "IOS_INVALID_INPUT", message: text.trim() };
  }
  if (/%\s*Incomplete command/i.test(text)) {
    return { code: "IOS_INCOMPLETE_COMMAND", message: text.trim() };
  }
  if (/%\s*Ambiguous command/i.test(text)) {
    return { code: "IOS_AMBIGUOUS_COMMAND", message: text.trim() };
  }
  if (/%\s*Unknown command/i.test(text)) {
    return { code: "IOS_UNKNOWN_COMMAND", message: text.trim() };
  }

  return null;
}

export function appendStepOutput(current: string, next: unknown): string {
  const value = String(next ?? "");

  if (!value.trim()) return current;
  if (!current.trim()) return value;

  return current.replace(/\s+$/g, "") + "\n" + value.replace(/^\s+/g, "");
}

export function buildSemanticErrorResult(
  semanticError: { code: string; message: string },
  prompt: unknown,
  mode: unknown,
  cleanupOutput?: string,
): any {
  const baseMessage = semanticError.message.replace(/\s+$/g, "");
  const message = cleanupOutput
    ? baseMessage + "\n\n[cleanup]\n" + cleanupOutput.replace(/^\s+/g, "")
    : baseMessage;

  return {
    ok: false,
    output: message,
    rawOutput: message,
    raw: message,
    status: 1,
    error: message,
    code: semanticError.code,
    prompt: String(prompt || ""),
    mode: String(mode || ""),
  };
}

export function extractNativeCleanupOutputSinceBaseline(fullOutput: string, baselineOutput: string): string {
  const normalizedFull = normalizeEol(fullOutput);
  const normalizedBaseline = normalizeEol(baselineOutput);

  if (!normalizedFull.trim()) return "";

  if (normalizedBaseline && normalizedFull.startsWith(normalizedBaseline)) {
    const delta = normalizedFull.slice(normalizedBaseline.length).trim();
    if (delta) return delta;
  }

  const block = extractLatestCommandBlock(normalizedFull, "end").trim();
  if (block && block !== normalizedFull.trim()) return block;

  return "";
}
