// Gestión de auditoría para comandos y transacciones
// Persistencia de trazas de ejecución en SQLite

import { Database } from 'bun:sqlite';

export interface AuditRecord {
  timestamp: string;
  sessionId: string;
  deviceId?: string;
  command: string;
  status: 'success' | 'failed' | 'rolled_back';
  output?: string;
  error?: string;
  durationMs?: number;
  transactionId?: string;
}

/**
 * Clase para manejar la memoria de auditoría
 */
export class AuditMemory {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  /**
   * Guarda una entrada de auditoría
   */
  log(record: AuditRecord): number {
    const result = this.db.run(
      `
        INSERT INTO audit_log (
          timestamp, session_id, device_id, command, status,
          output, error, duration_ms, transaction_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        record.timestamp,
        record.sessionId,
        record.deviceId || null,
        record.command,
        record.status,
        record.output || null,
        record.error || null,
        record.durationMs ?? null,
        record.transactionId || null,
      ],
    );

    return result.lastInsertRowid as number;
  }

  /**
   * Registra múltiples entradas de auditoría
   */
  logMany(records: AuditRecord[]): number[] {
    return records.map((record) => this.log(record));
  }

  /**
   * Obtiene entradas por sesión
   */
  getSessionLogs(sessionId: string): any[] {
    return this.db.query('SELECT * FROM audit_log WHERE session_id = ? ORDER BY timestamp ASC, id ASC').all(sessionId);
  }

  /**
   * Obtiene entradas por dispositivo
   */
  getDeviceLogs(deviceId: string): any[] {
    return this.db.query('SELECT * FROM audit_log WHERE device_id = ? ORDER BY timestamp ASC, id ASC').all(deviceId);
  }

  /**
   * Obtiene entradas fallidas
   */
  getFailedLogs(): any[] {
    return this.db.query("SELECT * FROM audit_log WHERE status = 'failed' ORDER BY timestamp DESC, id DESC").all();
  }

  /**
   * Obtiene entradas de una transacción
   */
  getTransactionLogs(transactionId: string): any[] {
    return this.db.query('SELECT * FROM audit_log WHERE transaction_id = ? ORDER BY timestamp ASC, id ASC').all(transactionId);
  }
}
