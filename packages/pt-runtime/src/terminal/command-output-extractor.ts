// ============================================================================
// Command Output Extractor - Extrae output del comando actual
// ============================================================================
// Proporciona funciones para extraer solo el output del comando actual,
// diferenciándolo del historial acumulado del terminal.

import { sanitizeTerminalText, diffSnapshotStrict, type TerminalSnapshot } from "./prompt-detector";

export type CommandSessionKind = "ios" | "host";

export interface ExtractOptions {
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
}

/**
 * Extrae output del comando actual usando múltiples fuentes.
 * Combina output de eventos y delta de snapshots.
 */
export function extractCommandOutput(input: ExtractOptions): ExtractResult {
  const warnings: string[] = [];
  let output = "";
  let raw = "";
  let source = "";
  let confidence: "high" | "medium" | "low" = "low";

  const hasEventOutput = input.eventOutput && input.eventOutput.trim().length > 0;
  const hasSnapshotDelta = input.snapshotDelta && input.snapshotDelta.trim().length > 0;

  if (hasEventOutput && hasSnapshotDelta) {
    const eventLen = input.eventOutput!.length;
    const snapLen = input.snapshotDelta!.length;

    if (Math.abs(eventLen - snapLen) < 50) {
      output = input.eventOutput!;
      raw = input.eventOutput!;
      source = "event+delta";
      confidence = "high";
    } else if (snapLen > eventLen) {
      output = input.snapshotDelta!;
      raw = input.snapshotDelta!;
      source = "delta-preferred";
      confidence = "medium";
      warnings.push("Snapshot delta longer than event output, using delta");
    } else {
      output = input.eventOutput!;
      raw = input.eventOutput!;
      source = "event-preferred";
      confidence = "medium";
      warnings.push("Event output longer than snapshot delta, using event");
    }
  } else if (hasEventOutput) {
    output = input.eventOutput!;
    raw = input.eventOutput!;
    source = "event";
    confidence = input.commandEndedSeen ? "high" : "medium";
  } else if (hasSnapshotDelta) {
    output = input.snapshotDelta!;
    raw = input.snapshotDelta!;
    source = "delta";
    confidence = input.outputEventsCount && input.outputEventsCount > 0 ? "medium" : "low";
  } else if (input.snapshotAfter) {
    output = sanitizeTerminalText(input.snapshotAfter.raw);
    raw = input.snapshotAfter.raw;
    source = "snapshot-after (" + input.snapshotAfter.source + ")";
    confidence = "low";
  } else {
    output = "";
    raw = "";
    source = "none";
    confidence = "low";
    warnings.push("No output available from any source");
  }

  return {
    output: finalClean(output, input.snapshotAfter?.raw || ""),
    raw,
    source,
    confidence,
    warnings,
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