// Evidence mapper — mapea respuestas a evidencia estructurada
// NO construye payloads ni llama al bridge

import type { TerminalPortResult } from "../../ports/runtime-terminal-port.js";
import type { ParsedCommandResponse } from "./response-parser.js";

export interface EvidenceMappingOptions {
  device: string;
  command: string;
  timestamp?: number;
}

export function createEvidenceMapper() {
  function mapResponseToEvidence(
    result: TerminalPortResult,
    options: EvidenceMappingOptions,
  ): TerminalEvidence {
    const { device, command, timestamp = Date.now() } = options;

    return {
      device,
      command,
      timestamp,
      ok: result.ok,
      output: result.output,
      status: result.status,
      promptBefore: result.promptBefore,
      promptAfter: result.promptAfter,
      modeBefore: result.modeBefore,
      modeAfter: result.modeAfter,
      confidence: result.confidence,
      hasWarnings: result.warnings.length > 0,
      warnings: result.warnings,
      eventCount: result.events.length,
    };
  }

  function mapParsedResponseToEvidence(
    parsed: ParsedCommandResponse,
    options: EvidenceMappingOptions,
  ): SingleCommandEvidence {
    const { device, command, timestamp = Date.now() } = options;

    return {
      device,
      command,
      timestamp,
      raw: parsed.raw,
      status: parsed.status,
      ok: parsed.ok,
      modeAfter: parsed.modeAfter,
      promptAfter: parsed.promptAfter,
      paging: parsed.paging,
      awaitingConfirm: parsed.awaitingConfirm,
      hasWarnings: parsed.warnings.length > 0,
      warnings: parsed.warnings,
      error: parsed.error,
    };
  }

  function computeConfidence(
    result: TerminalPortResult,
    options?: { strict?: boolean },
  ): number {
    if (!result.ok) return 0;
    if (result.warnings.length > 0) {
      return options?.strict ? 0.5 : 0.8;
    }
    return 1;
  }

  return {
    mapResponseToEvidence,
    mapParsedResponseToEvidence,
    computeConfidence,
  };
}

export interface TerminalEvidence {
  device: string;
  command: string;
  timestamp: number;
  ok: boolean;
  output: string;
  status: number;
  promptBefore: string;
  promptAfter: string;
  modeBefore: string;
  modeAfter: string;
  confidence: number;
  hasWarnings: boolean;
  warnings: string[];
  eventCount: number;
}

export interface SingleCommandEvidence {
  device: string;
  command: string;
  timestamp: number;
  raw: string;
  status: number;
  ok: boolean;
  modeAfter: string;
  promptAfter: string;
  paging: boolean;
  awaitingConfirm: boolean;
  hasWarnings: boolean;
  warnings: string[];
  error?: string;
}

export type EvidenceMapper = ReturnType<typeof createEvidenceMapper>;