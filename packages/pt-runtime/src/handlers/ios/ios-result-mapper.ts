// ============================================================================
// IOS Result Mapper - Maps raw execution results to PtResult format
// ============================================================================

import type { TerminalExecutionResult } from "../../terminal/terminal-execution-result.js";
import type { CommandExecutionResult } from "../../terminal/engine/command-executor.js";
import type { PtResult } from "../../pt-api/pt-results.js";
import { createSuccessResult, createErrorResult } from "../result-factories.js";

/**
 * Maps a TerminalExecutionResult to a PtResult for IOS execution.
 */
export function mapTerminalResultToPtResult(
  terminalResult: TerminalExecutionResult,
  raw?: string,
): PtResult {
  if (terminalResult.ok) {
    return createSuccessResult(terminalResult as unknown as Record<string, unknown>);
  }

  return createErrorResult(
    terminalResult.error?.message ?? "Terminal execution failed",
    terminalResult.error?.code,
    {
      raw: terminalResult.raw,
      status: terminalResult.diagnostics.statusCode,
      parsed: terminalResult as unknown as Record<string, unknown>,
    },
  );
}

/**
 * Maps exec result to terminal result for PC execution.
 */
export function mapExecResultToTerminalResult(
  execResult: CommandExecutionResult,
  deviceName: string,
  command: string,
  semantic: { ok: boolean; code?: string; message?: string; warnings: string[] },
  autoDismissedInitialDialog = false,
): TerminalExecutionResult {
  const execOk = execResult.ok && semantic.ok;

  return {
    ok: execOk,
    device: deviceName,
    command,
    output: execResult.output,
    raw: execResult.rawOutput || execResult.output,
    error: execOk ? undefined : {
      code: (semantic.code ?? execResult.code ?? "TERMINAL_UNKNOWN_STATE") as any,
      message: semantic.message ?? execResult.error ?? `PC execution failed with status ${execResult.status ?? 1}`,
      phase: "execution",
      details: { status: execResult.status ?? 1 },
    },
    diagnostics: {
      status: execOk ? "completed" : "failed",
      statusCode: execResult.status ?? (execOk ? 0 : 1),
      completionReason: semantic.message,
      outputSource: "event",
      confidence: (execResult.confidence ?? "high") as any,
      startedSeen: execResult.startedSeen,
      endedSeen: execResult.endedSeen,
      outputEvents: execResult.outputEvents,
      promptMatched: true,
      modeMatched: true,
      semanticOk: execResult.status === 0,
      durationMs: execResult.durationMs,
    },
    session: {
      kind: "host",
      promptBefore: execResult.promptBefore,
      promptAfter: execResult.promptAfter,
      modeBefore: (execResult.modeBefore ?? "unknown") as any,
      modeAfter: (execResult.modeAfter ?? "unknown") as any,
      paging: false,
      awaitingConfirm: false,
      autoDismissedInitialDialog,
    },
    events: execResult.events ?? [],
    warnings: [...(execResult.warnings ?? []), ...semantic.warnings],
  };
}
