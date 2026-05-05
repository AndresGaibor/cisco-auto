import { detectIosSemanticFailure, firstString } from "./command-result-mapper.js";

function isIosConfigModeText(value: unknown): boolean {
  const text = String(value ?? "").trim().toLowerCase();

  return (
    text.startsWith("global-config") ||
    text.startsWith("interface-config") ||
    text.startsWith("router-config") ||
    text.startsWith("line-config") ||
    text.startsWith("config") ||
    /\(config[^)]*\)#\s*$/.test(text)
  );
}

function getLastNonEmptyLine(value: unknown): string {
  const lines = String(value ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.at(-1) ?? "";
}

function isIosPrivilegedPromptText(value: unknown): boolean {
  const text = String(value ?? "").trim();

  return /^[A-Za-z0-9._-]+#\s*$/.test(text) && !/\(config[^)]*\)#\s*$/.test(text);
}

function inferRuntimeFinalPromptFromOutput(runtimeResult: unknown): string {
  const result = runtimeResult as {
    rawOutput?: unknown;
    output?: unknown;
    raw?: unknown;
    result?: { raw?: unknown; output?: unknown };
  } | null | undefined;

  return getLastNonEmptyLine(
    firstString(
      result?.rawOutput,
      result?.output,
      result?.raw,
      result?.result?.raw,
      result?.result?.output,
    ),
  );
}

export function getRuntimeFailureText(runtimeResult: unknown): string {
  const result = runtimeResult as {
    parsed?: { result?: { output?: unknown; rawOutput?: unknown; raw?: unknown } };
    rawOutput?: unknown;
    output?: unknown;
    error?: { message?: unknown } | unknown;
  } | null | undefined;

  return firstString(
    result?.parsed?.result?.output,
    result?.parsed?.result?.rawOutput,
    result?.parsed?.result?.raw,
    result?.rawOutput,
    result?.output,
    (result?.error as { message?: unknown } | undefined)?.message,
    result?.error,
  );
}

function getRuntimeModeAfter(runtimeResult: unknown): string {
  const result = runtimeResult as {
    modeAfter?: unknown;
    session?: { modeAfter?: unknown; mode?: unknown };
    parsed?: { session?: { modeAfter?: unknown; mode?: unknown } };
  } | null | undefined;

  return String(
    result?.modeAfter ??
      result?.session?.modeAfter ??
      result?.session?.mode ??
      result?.parsed?.session?.modeAfter ??
      result?.parsed?.session?.mode ??
      "",
  );
}

function getRuntimePromptAfter(runtimeResult: unknown): string {
  const result = runtimeResult as {
    promptAfter?: unknown;
    session?: { promptAfter?: unknown; prompt?: unknown };
    parsed?: { session?: { promptAfter?: unknown; prompt?: unknown } };
  } | null | undefined;

  return String(
    result?.promptAfter ??
      result?.session?.promptAfter ??
      result?.session?.prompt ??
      result?.parsed?.session?.promptAfter ??
      result?.parsed?.session?.prompt ??
      "",
  );
}

export function detectAutoConfigFinalModeFailure(
  plan: unknown,
  runtimeResult: unknown,
): { code: string; message: string } | null {
  const metadata = (plan as { metadata?: { autoConfig?: unknown } } | null | undefined)?.metadata;

  if (metadata?.autoConfig !== true) {
    return null;
  }

  const modeAfter = getRuntimeModeAfter(runtimeResult);
  const promptAfter = getRuntimePromptAfter(runtimeResult);
  const rawOutput = firstString(
    (runtimeResult as { rawOutput?: unknown; output?: unknown } | null | undefined)?.rawOutput,
    (runtimeResult as { rawOutput?: unknown; output?: unknown } | null | undefined)?.output,
  );
  const finalPromptFromOutput = inferRuntimeFinalPromptFromOutput(runtimeResult);

  if (isIosPrivilegedPromptText(finalPromptFromOutput)) {
    return null;
  }

  if (isIosConfigModeText(modeAfter) || isIosConfigModeText(promptAfter)) {
    return {
      code: "IOS_AUTOCONFIG_DID_NOT_EXIT_CONFIG_MODE",
      message:
        `Auto-config terminó en modo configuración. modeAfter=${JSON.stringify(modeAfter)} ` +
        `promptAfter=${JSON.stringify(promptAfter)} ` +
        `finalPromptFromOutput=${JSON.stringify(finalPromptFromOutput)}\n` +
        rawOutput,
    };
  }

  return null;
}

export function detectIosSemanticFailureFromRuntimeResult(
  runtimeResult: unknown,
): { code: string; message: string } | null {
  const result = runtimeResult as { rawOutput?: unknown; output?: unknown; raw?: unknown } | null | undefined;

  return detectIosSemanticFailure(firstString(result?.rawOutput, result?.output, result?.raw));
}
