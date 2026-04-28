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

/**
 * Extrae output del comando actual usando múltiples fuentes.
 * Combina output de eventos y delta de snapshots.
 * Usa delimitadores de comando para slice preciso y separa syslogs async.
 */
export function extractCommandOutput(input: ExtractOptions): ExtractResult {
  const warnings: string[] = [];
  const asyncNoise: string[] = [];
  let output = "";
  let raw = "";
  let source = "";
  let confidence: "high" | "medium" | "low" = "low";

  const hasEventOutput = input.eventOutput && input.eventOutput.trim().length > 0;
  const hasSnapshotDelta = input.snapshotDelta && input.snapshotDelta.trim().length > 0;
  const hasCommand = Boolean(input.command?.trim());

if (hasCommand && hasEventOutput) {
    const sliced = sliceByCommandBoundaries({
      text: input.eventOutput!,
      command: input.command,
      promptBefore: input.promptBefore,
      promptAfter: input.promptAfter,
    });

    if (sliced) {
      output = sliced;
      raw = sliced;
      source = "event-sliced";
      confidence = input.commandEndedSeen ? "high" : "medium";
    }
  }

  if (!raw && hasEventOutput) {
    output = input.eventOutput!;
    raw = input.eventOutput!;
    source = "event";
    confidence = input.commandEndedSeen ? "high" : "medium";
  } else if (!raw && hasSnapshotDelta) {
    output = input.snapshotDelta!;
    raw = input.snapshotDelta!;
    source = "delta";
    confidence = "medium";
  } else if (!raw && input.snapshotAfter) {
    output = sanitizeTerminalText(input.snapshotAfter.raw);
    raw = input.snapshotAfter.raw;
    source = "snapshot-after (" + input.snapshotAfter.source + ")";
    confidence = "low";
  } else if (!raw) {
    output = "";
    raw = "";
    source = "none";
    confidence = "low";
    warnings.push("No output available from any source");
  }

  const { commandOutput, noise } = splitAsyncNoise(output);
  asyncNoise.push(...noise);

  if (noise.length > 0) {
    warnings.push(`Syslog lines detected: ${noise.length}`);
  }

  const cleanedOutput = hasCommand
    ? stripCommandEchoAndPrompt(commandOutput, input.command, input.promptBefore, input.promptAfter)
    : commandOutput;

  return {
    output: finalClean(cleanedOutput, input.snapshotAfter?.raw || ""),
    raw,
    source,
    confidence,
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

  let result = output;

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
  const text = args.text.replace(/\r/g, "");
  const command = args.command.trim();

  if (!text || !command) return null;

  const commandIndex = text.lastIndexOf(command);
  if (commandIndex === -1) return null;

  let sliced = text.slice(commandIndex);

  const promptAfter = args.promptAfter.trim();
  if (promptAfter) {
    const lastPromptIndex = sliced.lastIndexOf(promptAfter);
    if (lastPromptIndex !== -1) {
      sliced = sliced.slice(0, lastPromptIndex + promptAfter.length);
    }
  }

  return sliced.trim();
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

    if (trimmedCommand && first === trimmedCommand) {
      lines.shift();
      continue;
    }

    if (trimmedPromptBefore && first === trimmedPromptBefore) {
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
