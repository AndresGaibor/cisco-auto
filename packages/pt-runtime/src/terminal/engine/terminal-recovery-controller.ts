// ============================================================================
// Terminal Recovery Controller - Control de recuperación ante fallos
// ============================================================================
// Detecta condiciones de error y ejecuta recuperación sincronica.
// Extraído de command-executor.ts para separar la lógica de recuperación.

import { recoverTerminalSync, type RecoveryResult } from "../terminal-recovery";
import { TerminalErrors } from "../terminal-errors";

/**
 * Interfaz del controlador de recuperación.
 */
export interface TerminalRecoveryController {
  detectDnsHangup(output: string): boolean;
  recover(terminal: any, sessionKind: "ios" | "host"): RecoveryResult;
  shouldRetry(attempt: number, maxRetries?: number): boolean;
}

/**
 * Detecta si el output contiene un DNS hangup (comando bloqueado en DNS lookup).
 * Extraído de command-executor.ts line 119-121.
 */
export function detectDnsHangup(chunk: string): boolean {
  return /Translating\s+["']?.+["']?\.\.\./i.test(chunk);
}

/**
 * Recupera el terminal síncronamente usando Ctrl+C y Enter.
 */
export function recover(terminal: any, sessionKind: "ios" | "host"): RecoveryResult {
  return recoverTerminalSync(terminal, sessionKind);
}

/**
 * Determina si se debe reintentar basado en el número de intento.
 */
export function shouldRetry(attempt: number, maxRetries: number = 3): boolean {
  return attempt < maxRetries;
}

/**
 * Crea un controlador de recuperación configurado.
 */
export function createRecoveryController(config: { maxRetries?: number } = {}): TerminalRecoveryController {
  const maxRetries = config.maxRetries ?? 3;

  return {
    detectDnsHangup,
    recover: (terminal, sessionKind) => recover(terminal, sessionKind),
    shouldRetry: (attempt) => shouldRetry(attempt, maxRetries),
  };
}

/**
 * Verifica si un error es recuperable.
 * Extraído de finalizeFailure en command-executor.ts.
 */
export function isRecoverableError(code: string, message?: string): boolean {
  const recoverableCodes = [
    TerminalErrors.COMMAND_START_TIMEOUT,
    TerminalErrors.COMMAND_END_TIMEOUT,
    TerminalErrors.PROMPT_MISMATCH,
    TerminalErrors.MODE_MISMATCH,
  ];

  if (recoverableCodes.includes(code as any)) return true;
  if (message?.includes("No output received")) return true;
  return false;
}