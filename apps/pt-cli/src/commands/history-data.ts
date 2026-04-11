import type { AuditEntryRow } from './audit-data.js';
import { listAuditEntries } from './audit-data.js';

/**
 * Busca entradas del historial interno sobre la auditoría persistida.
 */
export function searchHistoryEntries(query: string, device?: string, limit = 50): AuditEntryRow[] {
  return listAuditEntries({ query, device, limit });
}

/**
 * Obtiene entradas fallidas del historial interno sobre la auditoría persistida.
 */
export function searchHistoryEntriesWithDb(query: string, device?: string, limit = 50, dbPath?: string): AuditEntryRow[] {
  return listAuditEntries({ query, device, limit }, dbPath);
}

/**
 * Obtiene entradas fallidas del historial interno sobre la auditoría persistida.
 */
export function listFailedHistoryEntries(device?: string, limit = 50): AuditEntryRow[] {
  return listAuditEntries({ device, limit, failedOnly: true });
}

/**
 * Obtiene entradas fallidas del historial interno usando una DB específica.
 */
export function listFailedHistoryEntriesWithDb(device?: string, limit = 50, dbPath?: string): AuditEntryRow[] {
  return listAuditEntries({ device, limit, failedOnly: true }, dbPath);
}
