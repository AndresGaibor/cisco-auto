// ============================================================================
// Terminal Output Pipeline - Pipeline de procesamiento de output
// ============================================================================
// Construye el output final del comando combinando eventos y snapshots.
// Extraído de command-executor.ts (función finalize) para separar la
// lógica de construcción de output.

import type { CommandSessionKind } from "../command-output-extractor";
import { extractCommandOutput } from "../command-output-extractor";
import type { TerminalSnapshot } from "../prompt-detector";

export interface OutputPipelineInput {
  command: string;
  sessionKind: "ios" | "host" | "unknown";
  promptBefore: string;
  promptAfter: string;
  eventOutput: string;
  snapshotDelta: string;
  snapshotAfter: TerminalSnapshot;
  commandEndedSeen: boolean;
  outputEventsCount: number;
}

export interface OutputPipelineResult {
  output: string;
  raw: string;
  source: string;
  confidence: "high" | "medium" | "low";
  warnings: string[];
  asyncNoise: string[];
}

/**
 * Construye el output final combinando múltiples fuentes de datos.
 * Extraído de la lógica de finalize en command-executor.ts.
 */
export function buildFinalOutput(input: {
  command: string;
  sessionKind: "ios" | "host" | "unknown";
  promptBefore: string;
  promptAfter: string;
  eventOutput: string;
  snapshotDelta: string;
  commandEndedSeen: boolean;
  outputEventsCount: number;
  snapshotAfter?: TerminalSnapshot;
}): {
  output: string;
  raw: string;
  warnings: string[];
  asyncNoise: string[];
  confidence: "high" | "medium" | "low" | "failure";
} {
  const kind: CommandSessionKind = input.sessionKind === "unknown" ? "ios" : input.sessionKind as CommandSessionKind;

  const extractResult = extractCommandOutput({
    command: input.command,
    sessionKind: kind,
    promptBefore: input.promptBefore,
    promptAfter: input.promptAfter,
    eventOutput: input.eventOutput,
    snapshotDelta: input.snapshotDelta,
    snapshotAfter: input.snapshotAfter,
    commandEndedSeen: input.commandEndedSeen,
    outputEventsCount: input.outputEventsCount,
  });

  return {
    output: extractResult.output,
    raw: extractResult.raw,
    warnings: extractResult.warnings,
    asyncNoise: extractResult.asyncNoise,
    confidence: extractResult.confidence,
  };
}

/**
 * Normaliza el session kind para extracción de output.
 */
export function normalizeSessionKind(kind: string): CommandSessionKind {
  if (kind === "ios" || kind === "host") return kind;
  return "ios";
}