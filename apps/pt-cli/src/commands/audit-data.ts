import { Database } from 'bun:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

import { initializeSchema } from '@cisco-auto/core/memory/schema';

import { getMemoryDbPath } from '../system/paths.js';

export interface AuditEntryRow {
  id: number;
  timestamp: string;
  session_id: string;
  device_id?: string | null;
  hostname?: string | null;
  command: string;
  status: string;
  output?: string | null;
  error?: string | null;
  duration_ms?: number | null;
  transaction_id?: string | null;
}

export interface AuditEntryFilters {
  limit?: number;
  device?: string;
  since?: string;
  status?: string;
  failedOnly?: boolean;
  query?: string;
}

/**
 * Abre la base SQLite de memoria compartida para auditoría.
 */
export function openAuditDb(): Database {
  return openAuditDbAtPath(getMemoryDbPath());
}

/**
 * Abre la base SQLite de memoria compartida en una ruta específica.
 */
export function openAuditDbAtPath(dbPath: string): Database {
  mkdirSync(dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  initializeSchema(db);
  return db;
}

/**
 * Consulta entradas de audit_log con filtros opcionales.
 */
export function listAuditEntries(filters: AuditEntryFilters = {}, dbPath?: string): AuditEntryRow[] {
  const db = dbPath ? openAuditDbAtPath(dbPath) : openAuditDb();

  try {
    let query = `
      SELECT a.*, d.hostname
      FROM audit_log a
      LEFT JOIN devices d ON a.device_id = d.id
      WHERE 1=1
    `;
    const params: unknown[] = [];

    if (filters.device) {
      query += ' AND (a.device_id = ? OR d.hostname = ?)';
      params.push(filters.device, filters.device);
    }

    if (filters.since) {
      query += ' AND a.timestamp >= ?';
      params.push(filters.since);
    }

    if (filters.status) {
      query += ' AND a.status = ?';
      params.push(filters.status);
    }

    if (filters.failedOnly) {
      query += " AND a.status != 'success'";
    }

    if (filters.query) {
      query += ' AND (a.command LIKE ? OR a.output LIKE ? OR a.error LIKE ?)';
      const likeQuery = `%${filters.query}%`;
      params.push(likeQuery, likeQuery, likeQuery);
    }

    query += ' ORDER BY a.timestamp DESC, a.id DESC';

    if (filters.limit !== undefined) {
      query += ' LIMIT ?';
      params.push(filters.limit);
    }

    return db.query(query).all(...params) as AuditEntryRow[];
  } finally {
    db.close();
  }
}
