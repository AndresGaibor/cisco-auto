// Gestión de memoria para dispositivos de red
// Implementa operaciones CRUD para dispositivos usando SQLite

import { Database } from 'bun:sqlite';

/**
 * Clase para manejar la memoria de dispositivos
 */
export class DeviceMemory {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  /**
   * Registra o actualiza un dispositivo en la base de datos
   */
  registerDevice(
    id: string,
    hostname: string,
    ipAddress?: string,
    deviceType?: string,
    osVersion?: string
  ): void {
    const now = Math.floor(Date.now() / 1000);
    
    this.db.run(`
      INSERT INTO devices (id, hostname, ip_address, device_type, os_version, last_connected, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        hostname = excluded.hostname,
        ip_address = excluded.ip_address,
        device_type = excluded.device_type,
        os_version = excluded.os_version,
        last_connected = excluded.last_connected,
        updated_at = excluded.updated_at
    `, [id, hostname, ipAddress || null, deviceType || null, osVersion || null, now, now]);
  }

  /**
   * Obtiene un dispositivo por su ID
   */
  getDevice(id: string): any {
    return this.db.query('SELECT * FROM devices WHERE id = ?').get(id);
  }

  /**
   * Obtiene los dispositivos más recientemente conectados
   */
  getRecentDevices(limit: number = 10): any[] {
    return this.db.query(`
      SELECT * FROM devices 
      ORDER BY last_connected DESC 
      LIMIT ?
    `).all(limit);
  }

  /**
   * Actualiza el timestamp de última conexión de un dispositivo
   */
  updateLastConnected(id: string): void {
    const now = Math.floor(Date.now() / 1000);
    this.db.run(
      'UPDATE devices SET last_connected = ?, updated_at = ? WHERE id = ?',
      [now, now, id]
    );
  }

  /**
   * Elimina un dispositivo de la base de datos
   */
  deleteDevice(id: string): void {
    this.db.run('DELETE FROM devices WHERE id = ?', [id]);
  }

  /**
   * Obtiene todos los dispositivos
   */
  getAllDevices(): any[] {
    return this.db.query('SELECT * FROM devices ORDER BY hostname').all();
  }
}