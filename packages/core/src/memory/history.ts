// Gestión de historial de comandos
// Persistencia de comandos ejecutados en SQLite

import { Database } from 'bun:sqlite';

/**
 * Clase para manejar el historial de comandos
 */
export class HistoryMemory {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  /**
   * Registra un comando en el historial
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
  getSessionCommands(sessionId: string): any[] {
    return this.db
      .query('SELECT * FROM command_history WHERE session_id = ? ORDER BY id ASC')
      .all(sessionId);
  }

  /**
   * Obtiene el historial de comandos por dispositivo
   */
  getDeviceCommands(deviceId: string): any[] {
    return this.db
      .query('SELECT * FROM command_history WHERE device_id = ? ORDER BY timestamp DESC')
      .all(deviceId);
  }

  /**
   * Obtiene comandos fallidos
   */
  getFailedCommands(): any[] {
    return this.db
      .query("SELECT * FROM command_history WHERE status = 'failed' ORDER BY timestamp DESC")
      .all();
  }

  /**
   * Limpia historial antiguo
   */
  clearBefore(timestamp: number): void {
    this.db.run('DELETE FROM command_history WHERE timestamp < ?', [timestamp]);
  }
}