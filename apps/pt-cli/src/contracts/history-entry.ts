#!/usr/bin/env bun
/**
 * Entrada de historial de comandos.
 * Representa una ejecución completa de un comando.
 */

/**
 * Entrada de historial de una sesión de comandos.
 */
export interface HistoryEntry {
  schemaVersion: '1.0';
  sessionId: string;
  correlationId?: string;
  startedAt: string;
  endedAt?: string;
  timestamp?: string;
  durationMs?: number;
  action: string;
  contextSummary?: Record<string, unknown>;
  status?: 'success' | 'error' | 'failure';
  argv?: string[];
  flags?: Record<string, unknown>;
  ok?: boolean;
  commandIds?: string[];
  command_ids?: string[];
  summary?: string;
  errorCode?: string;
  errorMessage?: string;
  error_message?: string;
  rerunnable?: boolean;
  tags?: string[];
  targetDevice?: string;
  target_device?: string;
  errorMessageApp?: string;
  payloadSummary?: Record<string, unknown>;
  payload_summary?: Record<string, unknown>;
  resultSummary?: Record<string, unknown>;
  result_summary?: Record<string, unknown>;
}

/**
 * Filtros para consultar historial.
 */
export interface HistoryEntryFilters {
  limit?: number;
  failedOnly?: boolean;
  actionPrefix?: string;
}

/**
 * Índice del historial para búsqueda rápida.
 */
export interface HistoryIndex {
  schemaVersion: '1.0';
  lastUpdated: string;
  entries: {
    sessionId: string;
    action: string;
    startedAt: string;
    ok: boolean;
  }[];
}
