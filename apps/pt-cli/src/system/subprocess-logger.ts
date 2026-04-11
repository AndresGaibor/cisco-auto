#!/usr/bin/env bun
/**
 * Logger estructurado para eventos de subprocesos
 * Registra información detallada de ejecuciones de comandos para observabilidad
 */

import { appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { getDefaultDevDir } from './paths';
import type { RunSubprocessOptions, RunSubprocessResult } from './run-subprocess';

/**
 * Tipo de evento de log para subprocesos
 */
export interface SubprocessLogEvent {
  timestamp: string;
  cmd: string[];
  cwd?: string;
  timeoutMs: number | null;
  exitCode: number | null;
  signalCode: string | null;
  timedOut: boolean;
  ok: boolean;
  stdoutTruncated: string;
  stderrTruncated: string;
  stdoutLength: number;
  stderrLength: number;
}

/**
 * Longitud máxima para truncar stdout/stderr en logs
 * Evita logs excesivamente grandes mientras mantiene información útil
 */
const MAX_LOG_LENGTH = 500;

/**
 * Obtiene el directorio donde se almacenan los logs de subprocesos
 */
function getSubprocessLogDir(): string {
  return join(getDefaultDevDir(), 'subprocess-logs');
}

/**
 * Obtiene la ruta del archivo de log para la fecha actual
 * Un archivo por día para facilitar rotación y búsqueda
 */
function getSubprocessLogPath(): string {
  const date = new Date();
  const dateString = date.toISOString().split('T')[0]; // YYYY-MM-DD
  return join(getSubprocessLogDir(), `subprocess-${dateString}.ndjson`);
}

/**
 * Trunca una string si excede la longitud máxima, añadiendo indicador de truncamiento
 */
function truncateString(str: string, maxLength: number): string {
  if (str.length <= maxLength) {
    return str;
  }
  return str.slice(0, maxLength) + `... [truncated ${str.length - maxLength} chars]`;
}

/**
 * Registra un evento de ejecución de subproceso en formato NDJSON
 * @param event - Datos del evento a registrar
 */
export function logSubprocessEvent(event: SubprocessLogEvent): void {
  try {
    const logDir = getSubprocessLogDir();
    if (!existsSync(logDir)) {
      mkdirSync(logDir, { recursive: true });
    }

    const logLine = JSON.stringify(event) + '\n';
    appendFileSync(getSubprocessLogPath(), logLine, 'utf-8');
  } catch (error) {
    // Fallback silencioso a console.error si falla el logging a archivo
    // Para no romper la ejecución principal por problemas de logging
    console.error('[subprocess-logger] Failed to write log:', error);
  }
}

/**
 * Crea un evento de log a partir del resultado de runSubprocess
 * @param cmd - Comando ejecutado
 * @param options - Opciones originales pasadas a runSubprocess
 * @param result - Resultado retornado por runSubprocess
 * @returns Evento listo para logging
 */
export function createSubprocessLogEvent(
  cmd: string[],
  options: Pick<RunSubprocessOptions, 'cwd' | 'timeoutMs'>,
  result: RunSubprocessResult
): SubprocessLogEvent {
  return {
    timestamp: new Date().toISOString(),
    cmd,
    cwd: options.cwd,
    timeoutMs: options.timeoutMs ?? null,
    exitCode: result.exitCode,
    signalCode: result.signalCode,
    timedOut: result.timedOut,
    ok: result.ok,
    stdoutTruncated: truncateString(result.stdout, MAX_LOG_LENGTH),
    stderrTruncated: truncateString(result.stderr, MAX_LOG_LENGTH),
    stdoutLength: result.stdout.length,
    stderrLength: result.stderr.length,
  };
}