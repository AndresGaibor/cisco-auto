#!/usr/bin/env bun
/**
 * Utilidades de rutas para el directorio pt-dev.
 * Proporciona funciones para resolver rutas dentro del directorio de desarrollo.
 */

import { homedir } from 'node:os';
import { join } from 'node:path';

/**
 * Obtiene el directorio raíz de pt-dev.
 * Soporta override via variable de entorno PT_DEV_DIR.
 * @returns Ruta al directorio pt-dev
 */
export function getDefaultDevDir(): string {
  const home = homedir();
  const isWindows = process.platform === 'win32';
  
  if (isWindows) {
    return process.env.PT_DEV_DIR ?? join(process.env.USERPROFILE ?? home, 'pt-dev');
  }
  
  return process.env.PT_DEV_DIR ?? join(home, 'pt-dev');
}

/**
 * Resuelve una ruta dentro del directorio pt-dev.
 * @param parts - Partes de la ruta a concatenar
 * @returns Ruta resuelta dentro de pt-dev
 */
export function resolvePtDevPath(...parts: string[]): string {
  return join(getDefaultDevDir(), ...parts);
}

/**
 * Obtiene el directorio de logs.
 * @returns Ruta al directorio de logs
 */
export function getLogsDir(): string {
  return resolvePtDevPath('logs');
}

/**
 * Obtiene el directorio de logs de sesión.
 * @returns Ruta al directorio de logs de sesión
 */
export function getSessionLogsDir(): string {
  return join(getLogsDir(), 'sessions');
}

/**
 * Obtiene el directorio de logs de comandos.
 * @returns Ruta al directorio de logs de comandos
 */
export function getCommandLogsDir(): string {
  return join(getLogsDir(), 'commands');
}

/**
 * Obtiene el directorio de bundles.
 * @returns Ruta al directorio de bundles
 */
export function getBundlesDir(): string {
  return join(getLogsDir(), 'bundles');
}

/**
 * Obtiene el directorio de historial.
 * @returns Ruta al directorio de historial
 */
export function getHistoryDir(): string {
  return join(getDefaultDevDir(), 'history');
}

/**
 * Obtiene la ruta del índice de historial.
 * @returns Ruta al archivo de índice de historial
 */
export function getHistoryIndexPath(): string {
  return join(getHistoryDir(), 'index.json');
}

export function getHistorySessionsDir(): string {
  return join(getHistoryDir(), 'sessions');
}

/**
 * Obtiene la ruta del archivo de historial de una sesión.
 * @param sessionId - ID de la sesión
 * @returns Ruta al archivo de historial de sesión
 */
export function getHistorySessionPath(sessionId: string): string {
  return join(getHistoryDir(), 'sessions', `${sessionId}.json`);
}

/**
 * Obtiene la ruta del log de sesión.
 * @param sessionId - ID de la sesión
 * @returns Ruta al archivo de log de sesión
 */
export function getSessionLogPath(sessionId: string): string {
  return join(getSessionLogsDir(), `${sessionId}.ndjson`);
}

/**
 * Obtiene la ruta del log de comando.
 * @param commandId - ID del comando
 * @returns Ruta al archivo de log de comando
 */
export function getCommandLogPath(commandId: string): string {
  return join(getCommandLogsDir(), `${commandId}.json`);
}

/**
 * Obtiene la ruta del bundle de sesión.
 * @param sessionId - ID de la sesión
 * @returns Ruta al archivo de bundle
 */
export function getBundlePath(sessionId: string): string {
  return join(getBundlesDir(), `${sessionId}.bundle.json`);
}

/**
 * Obtiene el directorio de resultados.
 * @returns Ruta al directorio de resultados
 */
export function getResultsDir(): string {
  return resolvePtDevPath('results');
}

/**
 * Obtiene el directorio de comandos en vuelo.
 * @returns Ruta al directorio de comandos en vuelo
 */
export function getInFlightDir(): string {
  return resolvePtDevPath('in-flight');
}

/**
 * Obtiene el directorio de comandos.
 * @returns Ruta al directorio de comandos
 */
export function getCommandsDir(): string {
  return resolvePtDevPath('commands');
}

/**
 * Obtiene la ruta de eventos actual.
 * @returns Ruta al archivo de eventos
 */
export function getEventsPath(): string {
  return join(getLogsDir(), 'events.current.ndjson');
}
