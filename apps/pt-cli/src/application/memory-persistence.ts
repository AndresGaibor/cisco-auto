import { getMemory } from '@cisco-auto/core/memory';
import type { HistoryEntry } from '../contracts/history-entry.js';
import { getMemoryDbPath } from '../system/paths.js';

/**
 * Mapea una entrada de historial del CLI a un registro de auditoría.
 */
export function mapHistoryEntryToAuditRecord(historyEntry: HistoryEntry) {
  return {
    timestamp: historyEntry.endedAt ?? historyEntry.timestamp ?? new Date().toISOString(),
    sessionId: historyEntry.sessionId,
    deviceId: historyEntry.targetDevice,
    command: historyEntry.action,
    status: historyEntry.ok ? 'success' : 'failed',
    output: historyEntry.summary ?? (historyEntry.resultSummary ? JSON.stringify(historyEntry.resultSummary) : undefined),
    error: historyEntry.errorMessage ?? historyEntry.error_message,
    durationMs: historyEntry.durationMs,
    transactionId: historyEntry.correlationId,
  };
}

/**
 * Persiste la ejecución del comando CLI en SQLite.
 */
export function persistHistoryEntryToMemory(historyEntry: HistoryEntry, dbPath = getMemoryDbPath()): number {
  const memory = getMemory(dbPath);
  return memory.audit.log(mapHistoryEntryToAuditRecord(historyEntry));
}
