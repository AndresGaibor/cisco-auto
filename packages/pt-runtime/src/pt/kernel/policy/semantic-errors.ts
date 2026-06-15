import { normalizeIosMode } from "./prompt-detect.js";

export function detectIosSemanticErrorFromOutput(output: unknown): { code: string; message: string } | null {
  const text = String(output ?? "");

  if (!text.trim()) {
    return null;
  }

  if (/%\s*Invalid input detected/i.test(text)) {
    return {
      code: "IOS_INVALID_INPUT",
      message: text.trim(),
    };
  }

  if (/%\s*Incomplete command/i.test(text)) {
    return {
      code: "IOS_INCOMPLETE_COMMAND",
      message: text.trim(),
    };
  }

  if (/%\s*Ambiguous command/i.test(text)) {
    return {
      code: "IOS_AMBIGUOUS_COMMAND",
      message: text.trim(),
    };
  }

  if (/%\s*Unknown command/i.test(text)) {
    return {
      code: "IOS_UNKNOWN_COMMAND",
      message: text.trim(),
    };
  }

  return null;
}

export function isIosConfigPromptText(value: unknown): boolean {
  const text = String(value ?? "").trim();

  return /\(config[^)]*\)#\s*$/.test(text);
}

export function isIosConfigModeText(value: unknown): boolean {
  const text = String(value ?? "").trim().toLowerCase();

  return (
    text === "config" ||
    text === "global-config" ||
    text === "interface-config" ||
    text === "router-config" ||
    text === "line-config" ||
    text.startsWith("config") ||
    text.endsWith("-config")
  );
}

export function nativeSnapshotIsStillInConfigMode(snapshot: { prompt?: unknown; mode?: unknown }): boolean {
  return isIosConfigPromptText(snapshot.prompt) || isIosConfigModeText(snapshot.mode);
}

export function inferModeFromPrompt(prompt: string): string {
  return normalizeIosMode("unknown", prompt);
}
