// ============================================================================
// Terminal Error Resolver - Resolución de errores del terminal
// ============================================================================
// Determina el status final y errores basándose en el output y estado.
// Extraído de command-executor.ts para separar la lógica de error handling.

import { TerminalErrors, type TerminalErrorCode } from "../terminal-errors";
import type { TerminalMode } from "../session-state";

/**
 * Resultado de la resolución de errores.
 */
export interface ErrorResolution {
  ok: boolean;
  status: number;
  code?: TerminalErrorCode;
  message?: string;
  warnings: string[];
}

/**
 * Resuelve el estado de error final basándose en múltiples factores.
 * Extraído de la lógica de finalize en command-executor.ts.
 */
export function resolveTerminalError(input: {
  output: string;
  sessionKind: string;
  cmdOk: boolean;
  status: number | null;
  promptMatched: boolean;
  modeMatched: boolean;
  expectedPrompt?: string;
  expectedMode?: TerminalMode;
  startedSeen: boolean;
  endedSeen: boolean;
  outputEvents: number;
  wizardDismissed?: boolean;
  hostBusy?: boolean;
  allowEmptyOutput?: boolean;
  finalOutput: string;
}): ErrorResolution {
  const warnings: string[] = [];

  let { cmdOk, status, promptMatched, modeMatched } = input;
  let finalError: string | undefined;
  let finalCode: TerminalErrorCode | undefined;

  if (cmdOk && !modeMatched) {
    finalError = `Expected mode "${input.expectedMode}" not reached; got "${input.expectedMode}" at prompt "${input.expectedPrompt}".`;
    finalCode = TerminalErrors.PROMPT_MISMATCH;
  }

  if (cmdOk && !promptMatched) {
    finalError = `Expected prompt "${input.expectedPrompt}" not reached; got "${input.expectedPrompt}".`;
    finalCode = TerminalErrors.PROMPT_MISMATCH;
  }

  if (!cmdOk && status === null) {
    status = guessFailureStatus(input.output);
  }

  if (!promptMatched) {
    warnings.push(`Expected prompt "${input.expectedPrompt}" not reached.`);
  }
  if (!modeMatched) {
    warnings.push(`Expected mode "${input.expectedMode}" not reached.`);
  }
  if (input.wizardDismissed) {
    warnings.push("Initial configuration dialog was auto-dismissed");
  }
  if (input.hostBusy) {
    warnings.push("Host command produced long-running output");
  }

  const isOnlyPromptResult = isOnlyPrompt(input.finalOutput, input.expectedPrompt ?? "");
  const emptyWithoutEnded = !input.finalOutput.trim() && !input.endedSeen;
  if (!input.allowEmptyOutput && (isOnlyPromptResult || emptyWithoutEnded)) {
    cmdOk = false;
    if (!warnings.includes("No output received")) {
      warnings.push("No output received");
    }
  }

  return {
    ok: cmdOk,
    status: status ?? 1,
    code: finalCode,
    message: finalError,
    warnings,
  };
}

/**
 * Detecta si el output contiene errores IOS conocidos.
 * Extraído de command-executor.ts line 131-144.
 */
export function guessFailureStatus(output: string): number {
  const text = String(output ?? "");
  if (
    text.includes("% Invalid") ||
    text.includes("% Incomplete") ||
    text.includes("% Ambiguous") ||
    text.includes("% Unknown") ||
    text.includes("%Error") ||
    text.toLowerCase().includes("invalid command")
  ) {
    return 1;
  }
  return 0;
}

/**
 * Verifica si el output es solo un prompt (sin contenido real).
 */
export function isOnlyPrompt(output: string, prompt: string): boolean {
  if (!output || !prompt) return false;
  const normalizedOutput = output.trim();
  const normalizedPrompt = prompt.trim();
  return (
    normalizedOutput === normalizedPrompt ||
    normalizedOutput === normalizedPrompt.replace(/#|>/, "").trim()
  );
}

/**
 * Normaliza el status del comando a un valor válido.
 */
export function normalizeStatus(status: number | null): number {
  if (status === null) return 1;
  if (status < 0 || status > 255) return 1;
  return status;
}