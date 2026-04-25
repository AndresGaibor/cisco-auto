// Gestión de historial de comandos
// Persistencia de comandos ejecutados en SQLite

import { Database } from 'bun:sqlite';

/**
 * Row representation de la tabla command_history en SQLite.
 */
export interface CommandHistoryRow {
  id: number;
  device_id: string;
  command: string;
  output: string;
  status: string;
  session_id: string | null;
  timestamp: number;
}

/**
 * Clase para manejar el historial de comandos ejecutados.
 * Persiste comandos, outputs y statuses en SQLite para auditoría y debugging.
 */
export class HistoryMemory {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  /**
   * Registra un comando en el historial.
   * @param deviceId - ID del dispositivo que ejecutó el comando
   * @param command - Comando IOS ejecutado
   * @param output - Output crudo del comando
   * @param status - Estado: "success", "failed", "rolled_back"
   * @param sessionId - ID de sesión (opcional)
   * @returns ID de la fila insertada
   */
  logCommand(
    deviceId: string,
    command: string,
    output: string,
    status: string,
    sessionId?: string,
  ): number {
    const result = this.db.run(
      `INSERT INTO command_history (device_id, command, output, status, session_id) VALUES (?, ?, ?, ?, ?)`,
      [deviceId, command, output || '', status, sessionId || null],
    );
    return result.lastInsertRowid as number;
  }

  /**
   * Obtiene el historial de comandos por sesión
   */
  getSessionCommands(sessionId: string): CommandHistoryRow[] {
    return this.db
      .query('SELECT * FROM command_history WHERE session_id = ? ORDER BY id ASC')
      .all(sessionId) as CommandHistoryRow[];
  }

  /**
   * Obtiene el historial de comandos por dispositivo
   */
  getDeviceCommands(deviceId: string): CommandHistoryRow[] {
    return this.db
      .query('SELECT * FROM command_history WHERE device_id = ? ORDER BY timestamp DESC')
      .all(deviceId) as CommandHistoryRow[];
  }

  /**
   * Obtiene comandos fallidos
   */
  getFailedCommands(): CommandHistoryRow[] {
    return this.db
      .query("SELECT * FROM command_history WHERE status = 'failed' ORDER BY timestamp DESC")
      .all() as CommandHistoryRow[];
  }

  /**
   * Limpia historial antiguo
   */
  clearBefore(timestamp: number): void {
    this.db.run('DELETE FROM command_history WHERE timestamp < ?', [timestamp]);
  }
}