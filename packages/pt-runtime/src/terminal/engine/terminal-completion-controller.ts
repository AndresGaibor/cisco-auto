// ============================================================================
// Terminal Completion Controller - Control de completado de comandos
// ============================================================================
// Gestiona la lógica de decisión para cuándo un comando ha terminado.
// Extraído de command-executor.ts para separar la heurística de finalización.

import { checkCommandCompletion, type CompletionContext } from "../stability-heuristic";
import type { TerminalMode } from "../session-state";

export const COMMAND_END_GRACE_MS = 900;
export const COMMAND_END_MAX_WAIT_MS = 1000;
export const HOST_COMMAND_END_GRACE_MS = 1500;

export interface CompletionState {
  startedSeen: boolean;
  commandEndedSeen: boolean;
  commandEndSeenAt: number | null;
  lastOutputAt: number;
  promptStableSince: number | null;
  previousPrompt: string;
}

/**
 * Decide si el comando debe finalizarse basado en el estado actual.
 * Implementa la heurística de quiet-window para determinar estabilidad.
 * Extraído de scheduleFinalizeAfterCommandEnd en command-executor.ts.
 */
export function shouldFinalizeCommand(input: {
  state: CompletionState;
  currentPrompt: string;
  currentMode: TerminalMode;
  expectedMode?: TerminalMode;
  sessionKind: string;
  pagerActive: boolean;
  confirmPromptActive: boolean;
}): { finished: boolean; reason?: string } {
  const { state, currentPrompt, currentMode, expectedMode, sessionKind, pagerActive, confirmPromptActive } = input;

  if (pagerActive) return { finished: false };
  if (confirmPromptActive) return { finished: false };

  if (state.commandEndedSeen && state.commandEndSeenAt) {
    const waitedAfterEnd = Date.now() - state.commandEndSeenAt;
    if (waitedAfterEnd >= COMMAND_END_MAX_WAIT_MS) {
      return { finished: true, reason: "command-ended-max-wait" };
    }
  }

  const ctx: CompletionContext = {
    currentPrompt,
    previousPrompt: state.previousPrompt,
    commandEndedSeen: state.commandEndedSeen,
    lastOutputAt: state.lastOutputAt,
    now: Date.now(),
    promptStableSince: state.promptStableSince,
    sessionKind: sessionKind as "ios" | "host" | "unknown",
    pagerActive,
    confirmPromptActive,
    expectedMode,
    currentMode,
  };

  return checkCommandCompletion(ctx);
}

/**
 * Wrapper para verificar si un comando ha terminado usando la heurística legacy.
 */
export function checkCommandFinished(
  currentPrompt: string,
  previousPrompt: string,
  commandEndedSeen: boolean,
  lastOutputAt: number,
  now: number,
  promptStableSince: number | null,
  sessionKind: "ios" | "host" | "unknown",
  pagerActive: boolean,
  confirmPromptActive: boolean,
  expectedMode: TerminalMode | undefined,
  currentMode: TerminalMode,
): { finished: boolean; reason?: string } {
  return shouldFinalizeCommand({
    state: {
      startedSeen: false,
      commandEndedSeen,
      commandEndSeenAt: null,
      lastOutputAt,
      promptStableSince,
      previousPrompt,
    },
    currentPrompt,
    currentMode,
    expectedMode,
    sessionKind,
    pagerActive,
    confirmPromptActive,
  });
}