import { normalizeEol, lastNonEmptyLine } from "./output-block.js";
import { isIosPrompt, isConfigPromptText } from "./prompt-detect.js";
import { isPagerOnlyLine, outputHasPager } from "./pager-detect.js";
import { lineContainsCommandEcho, stripCommandEchoFromLine, blockHasCommandEcho } from "./echo-handlers.js";
import { isLongOutputReadOnlyIosCommand, nativeLongOutputHasCommandEvidence } from "./long-output.js";

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

export function nativeEndCommandLooksComplete(lines: string[], command: string, prompt: string): boolean {
  if (!isEndCommand(command)) return false;

  const hasCommandEcho = blockHasCommandEcho(lines, command);
  if (!hasCommandEcho) return false;

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

  const hasCommandEcho = blockHasCommandEcho(lines, command);
  if (!hasCommandEcho) return false;

  const promptLine = lastNonEmptyLine(lines.join("\n"));
  const resolvedPrompt = String(prompt || promptLine || "").trim();

  return isIosPrompt(resolvedPrompt);
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
  if (!hasCommandEcho) return false;

  return true;
}

export function nativeFallbackBlockLooksComplete(block: string, command: string, prompt: string): boolean {
  const text = normalizeEol(block);
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

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

  if (meaningfulLines.length > 0) {
    if (isLongOutputReadOnlyIosCommand(command) && !nativeLongOutputHasCommandEvidence(command, block)) {
      return false;
    }
    return true;
  }

  if (nativeEndCommandLooksComplete(lines, command, prompt)) {
    return true;
  }

  if (nativePromptOnlyTransitionLooksComplete(lines, command, prompt)) {
    return true;
  }

  return nativeConfigCommandEchoAndPromptLooksComplete(lines, command, prompt);
}

export function outputLooksComplete(output: string, command: string): boolean {
  const text = normalizeEol(output);
  const cmd = String(command ?? "").trim();

  if (!text.trim()) return false;

  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const hasPromptAtEnd = isIosPrompt(lastNonEmptyLine(text));

  if (!hasPromptAtEnd) {
    return false;
  }

  const hasCommandEcho =
    cmd.length === 0 || lines.some((line) => lineContainsCommandEcho(line, cmd));

  const hasMeaningfulBody = lines.some((line) => {
    if (!line) return false;
    if (lineContainsCommandEcho(line, cmd)) return false;
    if (isIosPrompt(line)) return false;
    if (isPagerOnlyLine(line)) return false;
    return true;
  });

  return hasCommandEcho && hasMeaningfulBody;
}
