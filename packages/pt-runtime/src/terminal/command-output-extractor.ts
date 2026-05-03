// ============================================================================
// Command Output Extractor - Extrae output del comando actual
// ============================================================================
// Proporciona funciones para extraer solo el output del comando actual,
// diferenciándolo del historial acumulado del terminal.

import { sanitizeTerminalText, diffSnapshotStrict, type TerminalSnapshot } from "./prompt-detector";

export type CommandSessionKind = "ios" | "host";

export interface ExtractOptions {
  command: string;
  sessionKind: CommandSessionKind;
  promptBefore: string;
  promptAfter: string;
  eventOutput?: string;
  snapshotDelta?: string;
  snapshotAfter?: TerminalSnapshot;
  snapshotBefore?: TerminalSnapshot;
  commandEndedSeen?: boolean;
  outputEventsCount?: number;
}

export interface ExtractResult {
  output: string;
  raw: string;
  source: string;
  confidence: "high" | "medium" | "low";
  warnings: string[];
  asyncNoise: string[];
}

const PARTIAL_LONG_OUTPUT_WARNING =
  "Output posiblemente parcial: el comando largo terminó sin eco ni encabezado inicial esperado.";

function normalizeExtractorCommand(command: unknown): string {
  return String(command ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

function isShowInterfacesCommand(command: unknown): boolean {
  return /^show\s+interfaces?\b/.test(normalizeExtractorCommand(command));
}

function firstMeaningfulOutputLine(output: unknown, command?: string): string {
  const lines = normalizeExtractorEol(output)
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => {
      if (!line) return false;
      if (lineLooksLikePrompt(line)) return false;
      if (/^--More--$/i.test(line)) return false;
      if (command && lineLooksLikeCommandEcho(line, command)) return false;
      return true;
    });

  return lines[0] ?? "";
}

function lineLooksLikeInterfaceHeader(line: string): boolean {
  return /^(?:FastEthernet|GigabitEthernet|TenGigabitEthernet|Ethernet|Serial|Vlan|Port-channel|Loopback|Tunnel|Null)\S*\s+is\s+/i.test(
    String(line ?? "").trim(),
  );
}

function detectPartialLongOutputWarning(input: {
  command: string;
  raw: string;
  output: string;
  source: string;
}): string | null {
  if (!isShowInterfacesCommand(input.command)) {
    return null;
  }

  if (!input.output.trim()) {
    return null;
  }

  const firstLine = firstMeaningfulOutputLine(input.output, input.command);

  if (!firstLine) {
    return null;
  }

  if (lineLooksLikeInterfaceHeader(firstLine)) {
    return null;
  }

  return PARTIAL_LONG_OUTPUT_WARNING;
}

/**
 * Extrae output del comando actual usando múltiples fuentes.
 * Combina output de eventos y delta de snapshots.
 * Usa delimitadores de comando para slice preciso y separa syslogs async.
 */
export function extractCommandOutput(input: ExtractOptions): ExtractResult {
  const warnings: string[] = [];
  const asyncNoise: string[] = [];
  const hasCommand = Boolean(input.command?.trim());

  const candidates: Array<{
    raw: string;
    source: string;
    confidence: "high" | "medium" | "low";
  }> = [];

  if (hasCommand && input.eventOutput && input.eventOutput.trim()) {
    const sliced = sliceByCommandBoundaries({
      text: input.eventOutput,
      command: input.command,
      promptBefore: input.promptBefore,
      promptAfter: input.promptAfter,
    });

    if (sliced && sliced.trim()) {
      candidates.push({
        raw: sliced,
        source: "event-sliced",
        confidence: input.commandEndedSeen ? "high" : "medium",
      });
    }
  }

  if (hasCommand && input.snapshotDelta && input.snapshotDelta.trim()) {
    const sliced = sliceByCommandBoundaries({
      text: input.snapshotDelta,
      command: input.command,
      promptBefore: input.promptBefore,
      promptAfter: input.promptAfter,
    });

    if (sliced && sliced.trim()) {
      candidates.push({
        raw: sliced,
        source: "delta-sliced",
        confidence: input.commandEndedSeen ? "high" : "medium",
      });
    }
  }

  if (hasCommand && input.snapshotAfter?.raw && input.snapshotAfter.raw.trim()) {
    const sliced = sliceByCommandBoundaries({
      text: input.snapshotAfter.raw,
      command: input.command,
      promptBefore: input.promptBefore,
      promptAfter: input.promptAfter,
    });

    if (sliced && sliced.trim()) {
      candidates.push({
        raw: sliced,
        source: "snapshot-after-sliced (" + input.snapshotAfter.source + ")",
        confidence: "low",
      });
    }
  }

  if (input.eventOutput && input.eventOutput.trim()) {
    candidates.push({
      raw: input.eventOutput,
      source: "event",
      confidence: input.commandEndedSeen ? "medium" : "low",
    });
  }

  if (input.snapshotDelta && input.snapshotDelta.trim()) {
    candidates.push({
      raw: input.snapshotDelta,
      source: "delta",
      confidence: "medium",
    });
  }

  if (!candidates.length && input.snapshotAfter?.raw) {
    candidates.push({
      raw: sanitizeTerminalText(input.snapshotAfter.raw),
      source: "snapshot-after (" + input.snapshotAfter.source + ")",
      confidence: "low",
    });
  }

  if (!candidates.length) {
    return {
      output: "",
      raw: "",
      source: "none",
      confidence: "low",
      warnings: ["No output available from any source"],
      asyncNoise,
    };
  }

  const chosen = candidates[0]!;
  const { commandOutput, noise } = splitAsyncNoise(chosen.raw);
  asyncNoise.push(...noise);

  if (noise.length > 0) {
    warnings.push(`Syslog lines detected: ${noise.length}`);
  }

  const cleanedOutput = hasCommand
    ? stripCommandEchoAndPrompt(commandOutput, input.command, input.promptBefore, input.promptAfter)
    : commandOutput;

  const finalOutput = finalClean(cleanedOutput, input.snapshotAfter?.raw || "");
  const partialWarning = detectPartialLongOutputWarning({
    command: input.command,
    raw: chosen.raw,
    output: finalOutput,
    source: chosen.source,
  });

  if (partialWarning && !warnings.includes(partialWarning)) {
    warnings.push(partialWarning);
  }

  return {
    output: finalOutput,
    raw: chosen.raw,
    source: chosen.source,
    confidence: chosen.confidence,
    warnings,
    asyncNoise,
  };
}

/**
 * Extrae solo las líneas relevantes alrededor del comando ejecutado.
 * Funciona tanto para IOS como para Host.
 */
export function sliceAroundCommand(
  command: string,
  output: string,
  kind: CommandSessionKind
): string {
  if (!output || !command) return output;

  const lines = output.split("\n");
  const cmdLine = command.trim();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] || "";

    if (kind === "host") {
      if (line.toLowerCase().includes(cmdLine.toLowerCase())) {
        return lines.slice(i + 1).join("\n");
      }
    } else {
      if (line.includes(cmdLine) || line.trim() === cmdLine) {
        return lines.slice(i + 1).join("\n");
      }
    }
  }

  return output;
}

/**
 * Limpia el output final: elimina duplicados, trim, pager residual.
 */
export function finalClean(output: string, fullRaw: string = ""): string {
  if (!output) return "";

  let result = sanitizeTerminalText(output);

  const pagerPatterns = [
    /---\s*More\s*---/gi,
    /--More--/gi,
    /\bMore\b/gi,
    /\[d\b/gi,
    /Press SPACE to continue/gi,
    /--Quit--/gi,
  ];

  for (const pattern of pagerPatterns) {
    result = result.replace(pattern, "");
  }

  result = result.replace(/^\s*\n/, "");
  result = result.replace(/\n\s*$/, "");
  result = result.trim();

  const lines = result.split("\n").filter((line, idx, arr) => {
    if (idx === 0) return true;
    return line !== arr[idx - 1];
  });

  result = lines.join("\n");

  return result;
}

function sliceByCommandBoundaries(args: {
  text: string;
  command: string;
  promptBefore: string;
  promptAfter: string;
}): string | null {
  const text = normalizeExtractorEol(args.text);
  const command = args.command.trim();

  if (!text || !command) return null;

  const lines = text.split("\n");
  let commandLineIndex = -1;

  for (let i = lines.length - 1; i >= 0; i -= 1) {
    if (lineLooksLikeCommandEcho(lines[i] || "", command)) {
      commandLineIndex = i;
      break;
    }
  }

  if (commandLineIndex === -1) {
    const commandIndex = text.lastIndexOf(command);
    if (commandIndex === -1) return null;

    const slicedByIndex = text.slice(commandIndex);
    return slicedByIndex.trim();
  }

  let endIndex = lines.length;

  for (let i = commandLineIndex + 1; i < lines.length; i += 1) {
    const line = lines[i] || "";

    if (i > commandLineIndex + 1 && lineLooksLikePrompt(line)) {
      endIndex = i + 1;
      break;
    }
  }

  return lines.slice(commandLineIndex, endIndex).join("\n").trim();
}

function normalizeExtractorEol(value: unknown): string {
  return String(value ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function escapeExtractorRegExp(value: string): string {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function lineLooksLikePrompt(line: string): boolean {
  const value = String(line ?? "").trim();

  if (!value) return false;

  return (
    /^[A-Za-z0-9._-]+(?:\(config[^)]*\))?[>#]$/.test(value) ||
    /^[A-Z]:\\>$/.test(value)
  );
}

function lineLooksLikeCommandEcho(line: string, command: string): boolean {
  const value = String(line ?? "").trim();
  const cmd = String(command ?? "").trim();

  if (!value || !cmd) return false;

  if (value.toLowerCase() === cmd.toLowerCase()) {
    return true;
  }

  const escaped = escapeExtractorRegExp(cmd);

  const normalPromptEcho = new RegExp(
    "^[A-Za-z0-9._-]+(?:\\(config[^)]*\\))?[>#]\\s*" + escaped + "\\s*$",
    "i",
  );

  if (normalPromptEcho.test(value)) {
    return true;
  }

  // PT a veces deja eco dañado por espacios o pager:
  //   SW-SRV-DIS  show version
  //   SW-SRV-DIST#  show running-config
  const damagedPromptEcho = new RegExp(
    "^[A-Za-z0-9._-]+(?:\\(config[^)]*\\))?[>#]?\\s+" + escaped + "\\s*$",
    "i",
  );

  return damagedPromptEcho.test(value);
}

function splitAsyncNoise(output: string): { commandOutput: string; noise: string[] } {
  const noise: string[] = [];
  const commandLines: string[] = [];

  for (const line of output.split("\n")) {
    if (/^%[A-Z0-9_-]+-\d+-[A-Z0-9_-]+:/.test(line.trim())) {
      noise.push(line);
    } else {
      commandLines.push(line);
    }
  }

  return {
    commandOutput: commandLines.join("\n").trim(),
    noise,
  };
}

function stripCommandEchoAndPrompt(
  output: string,
  command: string,
  promptBefore: string,
  promptAfter: string,
): string {
  const lines = output
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trimEnd());

  const trimmedCommand = command.trim();
  const trimmedPromptBefore = promptBefore.trim();
  const trimmedPromptAfter = promptAfter.trim();

  while (lines.length > 0) {
    const first = lines[0]?.trim() ?? "";
    if (!first) {
      lines.shift();
      continue;
    }

    if (trimmedCommand && lineLooksLikeCommandEcho(first, trimmedCommand)) {
      lines.shift();
      continue;
    }

    if (trimmedCommand && first === trimmedCommand) {
      lines.shift();
      continue;
    }

    if (trimmedPromptBefore && first === trimmedPromptBefore) {
      lines.shift();
      continue;
    }

    if (lineLooksLikePrompt(first) && trimmedCommand && first.toLowerCase().includes(trimmedCommand.toLowerCase())) {
      lines.shift();
      continue;
    }

    break;
  }

  while (lines.length > 0) {
    const last = lines[lines.length - 1]?.trim() ?? "";
    if (!last) {
      lines.pop();
      continue;
    }

    if (trimmedPromptAfter && last === trimmedPromptAfter) {
      lines.pop();
      continue;
    }

    if (trimmedPromptBefore && last === trimmedPromptBefore) {
      lines.pop();
      continue;
    }

    if (lineLooksLikePrompt(last)) {
      lines.pop();
      continue;
    }

    break;
  }

  return lines.join("\n").trim();
}

/**
 * Elige entre output de eventos y delta de snapshot basándose en heurísticas.
 */
export function preferCommandSlice(
  eventOutput: string,
  snapshotDelta: string,
  kind: CommandSessionKind,
  commandEndedSeen: boolean
): { output: string; source: string } {
  const hasEvent = eventOutput && eventOutput.trim().length > 0;
  const hasDelta = snapshotDelta && snapshotDelta.trim().length > 0;

  if (!hasEvent && !hasDelta) {
    return { output: "", source: "none" };
  }

  if (!hasEvent) {
    return { output: snapshotDelta, source: "snapshot" };
  }

  if (!hasDelta) {
    return { output: eventOutput, source: "event" };
  }

  const eventLines = eventOutput.split("\n").filter((l) => l.trim());
  const deltaLines = snapshotDelta.split("\n").filter((l) => l.trim());

  if (kind === "host") {
    if (commandEndedSeen && deltaLines.length >= eventLines.length) {
      return { output: snapshotDelta, source: "snapshot-preferred" };
    }
    if (eventLines.length > 0 && eventLines[0]!.toLowerCase().includes("reply from")) {
      return { output: eventOutput, source: "event-ping-detected" };
    }
  }

  if (commandEndedSeen && deltaLines.length > eventLines.length) {
    return { output: snapshotDelta, source: "snapshot-post-ended" };
  }

  if (eventLines.length > 0 && eventLines[0]!.length > deltaLines[0]!.length) {
    return { output: eventOutput, source: "event-larger" };
  }

  return { output: eventOutput, source: "event-default" };
}
