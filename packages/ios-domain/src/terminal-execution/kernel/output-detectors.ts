// packages/pt-runtime/src/pt/kernel/execution-engine-output-detectors.ts
// Helpers puros para detección de output completo, pager y eco de comando
// No tienen estado ni referencias al closure de createExecutionEngine
import type { DeferredStep } from "../types-stub.js";

export function normalizeEol(value: unknown): string {
  return String(value ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

export function isIosPrompt(value: unknown): boolean {
  const line = String(value ?? "").trim();
  return /^[A-Za-z0-9._-]+(?:\(config[^)]*\))?[>#]$/.test(line);
}

export function isHostPrompt(value: unknown): boolean {
  const line = String(value ?? "").trim().replace(/\x1b\[[0-9;]*[a-zA-Z]|\x1b[()][a-zA-Z]/g, "");
  return /[A-Z]:\\>$/i.test(line) || /\b(?:pc|server|laptop|host|client|terminal)[A-Za-z0-9._-]*>$/i.test(line);
}

export function lastNonEmptyLine(value: unknown): string {
  const lines = normalizeEol(value)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  return lines.length > 0 ? lines[lines.length - 1] : "";
}

export function isPagerOnlyLine(line: string): boolean {
  return /^--More--$/i.test(String(line ?? "").trim());
}

export function lineContainsCommandEcho(line: string, command: string): boolean {
  const rawLine = String(line ?? "").trim();
  const rawCommand = String(command ?? "").trim();
  if (!rawLine || !rawCommand) return false;
  const lowerLine = rawLine.toLowerCase();
  const lowerCommand = rawCommand.toLowerCase();
  if (lowerLine === lowerCommand) return true;
  const promptEchoPattern = new RegExp(
    "^[A-Za-z0-9._-]+(?:\\(config[^)]*\\))?[>#]\\s*" +
      String(rawCommand ?? "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&") +
      "\\s*$",
    "i",
  );
  return promptEchoPattern.test(rawLine);
}

export function outputLooksComplete(output: string, command: string): boolean {
  const text = normalizeEol(output);
  const cmd = String(command ?? "").trim();
  if (!text.trim()) return false;
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  const hasPromptAtEnd = isIosPrompt(lastNonEmptyLine(text));
  if (!hasPromptAtEnd) return false;
  const hasCommandEcho = cmd.length === 0 || lines.some((line) => lineContainsCommandEcho(line, cmd));
  const hasMeaningfulBody = lines.some((line) => {
    if (!line) return false;
    if (lineContainsCommandEcho(line, cmd)) return false;
    if (isIosPrompt(line)) return false;
    if (isPagerOnlyLine(line)) return false;
    return true;
  });
  return hasCommandEcho && hasMeaningfulBody;
}

export function nativeModeSatisfiesEnsureStep(
  step: DeferredStep,
  mode: string,
  prompt: string,
): boolean {
  const expected = String(
    (step as any).expectMode ?? (step as any).value ?? "",
  ).trim();
  if (!expected) return false;
  if (expected === "privileged-exec") return mode === "privileged-exec" || String(prompt || "").trim().endsWith("#");
  if (expected === "user-exec") return mode === "user-exec" || String(prompt || "").trim().endsWith(">");
  if (expected === "global-config" || expected === "config") {
    return (mode === "global-config" || mode === "config" || mode.startsWith("config-")) ||
      String(prompt || "").includes("(config");
  }
  return mode === expected;
}

export function isConfigPromptText(value: string): boolean {
  return /\(config[^)]*\)#\s*$/.test(String(value ?? "").trim());
}

export function stripCommandEchoFromLine(line: string, command: string): string {
  const rawLine = String(line ?? "").trim();
  const rawCommand = String(command ?? "").trim();
  if (!rawLine || !rawCommand) return rawLine;
  if (rawLine.toLowerCase() === rawCommand.toLowerCase()) return "";
  const lowerLine = rawLine.toLowerCase();
  const lowerCommand = rawCommand.toLowerCase();
  if (lowerLine.indexOf(">" + lowerCommand) >= 0) return "";
  if (lowerLine.indexOf("#" + lowerCommand) >= 0) return "";
  return rawLine;
}

export function blockHasCommandEcho(lines: string[], command: string): boolean {
  return lines.some((line) => lineContainsCommandEcho(line, command));
}

export function isEndCommand(command: string): boolean {
  return String(command ?? "").trim().toLowerCase() === "end";
}

export function isPromptOnlyTransitionCommand(command: string): boolean {
  const normalized = String(command ?? "").trim().toLowerCase();
  return (
    normalized === "disable" ||
    normalized === "enable" ||
    normalized === "end" ||
    normalized === "exit"
  );
}

export function nativeConfigCommandEchoAndPromptLooksComplete(
  lines: string[],
  command: string,
  prompt: string,
): boolean {
  const promptLine = lastNonEmptyLine(lines.join("\n"));
  const hasConfigPrompt = isConfigPromptText(prompt) || isConfigPromptText(promptLine);
  if (!hasConfigPrompt) return false;
  const hasCommandEcho = lines.some((line) => lineContainsCommandEcho(line, command));
  return hasCommandEcho;
}

export function nativeEndCommandLooksComplete(lines: string[], command: string, prompt: string): boolean {
  if (!isEndCommand(command)) return false;
  if (!blockHasCommandEcho(lines, command)) return false;
  const promptLine = lastNonEmptyLine(lines.join("\n"));
  const resolvedPrompt = String(prompt || promptLine || "").trim();
  return /^[A-Za-z0-9._-]+#\s*$/.test(resolvedPrompt) && !/\(config[^)]*\)#\s*$/.test(resolvedPrompt);
}

export function nativePromptOnlyTransitionLooksComplete(
  lines: string[],
  command: string,
  prompt: string,
): boolean {
  if (!isPromptOnlyTransitionCommand(command)) return false;
  if (!blockHasCommandEcho(lines, command)) return false;
  const promptLine = lastNonEmptyLine(lines.join("\n"));
  const resolvedPrompt = String(prompt || promptLine || "").trim();
  return isIosPrompt(resolvedPrompt);
}

export function nativeFallbackBlockLooksComplete(
  block: string,
  command: string,
  prompt: string,
): boolean {
  const text = normalizeEol(block);
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) return false;
  const promptOk = isIosPrompt(prompt) || isIosPrompt(lastNonEmptyLine(text));
  if (!promptOk) return false;
  if (outputHasPager(text)) return false;
  const meaningfulLines = lines.filter((line) => {
    const stripped = stripCommandEchoFromLine(line, command);
    if (!stripped) return false;
    if (isIosPrompt(stripped)) return false;
    if (isPagerOnlyLine(stripped)) return false;
    return true;
  });
  if (meaningfulLines.length > 0) return true;
  if (nativeEndCommandLooksComplete(lines, command, prompt)) return true;
  if (nativePromptOnlyTransitionLooksComplete(lines, command, prompt)) return true;
  return nativeConfigCommandEchoAndPromptLooksComplete(lines, command, prompt);
}

export function outputHasPager(output: string): boolean {
  return /--More--|More:|Press any key to continue/i.test(String(output || "").slice(-1000));
}

export function nativeOutputTailHasActivePager(output: string): boolean {
  const tail = normalizeEol(output).slice(-800);
  if (!tail.trim()) return false;
  return /--More--\s*$/i.test(tail) || /\s--More--\s*$/i.test(tail);
}

export function normalizeCommandForFallback(command: unknown): string {
  return String(command ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

export function nativeHostFallbackBlockLooksComplete(
  block: string,
  command: string,
  prompt: string,
): boolean {
  const text = normalizeEol(block);
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) return false;
  const promptLine = lastNonEmptyLine(text);
  if (!isHostPrompt(promptLine)) return false;
  const normalizedCommand = normalizeCommandForFallback(command);
  const meaningfulLines = lines.filter((line) => {
    const normalizedLine = line.trim().toLowerCase();
    if (!normalizedLine) return false;
    if (normalizedLine === normalizedCommand) return false;
    if (isHostPrompt(line)) return false;
    if (/^cisco packet tracer pc command line/i.test(line)) return false;
    return true;
  });
  return meaningfulLines.length > 0;
}