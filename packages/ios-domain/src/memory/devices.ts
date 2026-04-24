// Gestión de memoria para dispositivos de red
// Implementa operaciones CRUD para dispositivos usando SQLite

import { Database } from 'bun:sqlite';

/**
 * Row representation de la tabla devices en SQLite.
 */
export interface DeviceRow {
  id: string;
  hostname: string;
  ip_address: string | null;
  device_type: string | null;
  os_version: string | null;
  last_connected: number;
  updated_at: number;
}

/**
 * Clase para manejar la memoria de dispositivos de red.
 * Proporciona operaciones CRUD con SQLite embebido.
 */
export class DeviceMemory {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  /**
   * Registra o actualiza un dispositivo en la base de datos.
   * Usa INSERT OR REPLACE para hacer upsert atómico.
   * @param id - Identificador único del dispositivo
   * @param hostname - Nombre de host del dispositivo
   * @param ipAddress - Dirección IP (opcional)
   * @param deviceType - Tipo de dispositivo (opcional)
   * @param osVersion - Versión de IOS/OS (opcional)
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
   * Obtiene un dispositivo por su ID.
   * @param id - Identificador del dispositivo
   * @returns DeviceRow o null si no existe
   */
  getDevice(id: string): DeviceRow | null {
    return this.db.query('SELECT * FROM devices WHERE id = ?').get(id) as DeviceRow | null;
  }

  /**
   * Obtiene los dispositivos más recientemente conectados.
   * Ordena por last_connected DESC para ver cuáles están activos.
   * @param limit - Límite de resultados (default: 10)
   * @returns Array de DeviceRow ordenados por última conexión
   */
  getRecentDevices(limit: number = 10): DeviceRow[] {
    return this.db.query(`
      SELECT * FROM devices 
      ORDER BY last_connected DESC 
      LIMIT ?
    `).all(limit) as DeviceRow[];
  }

  /**
   * Actualiza el timestamp de última conexión de un dispositivo.
   * Se llama cada vez que el dispositivo responde comandos exitosamente.
   * @param id - Identificador del dispositivo
   */
  updateLastConnected(id: string): void {
    const now = Math.floor(Date.now() / 1000);
    this.db.run(
      'UPDATE devices SET last_connected = ?, updated_at = ? WHERE id = ?',
      [now, now, id]
    );
  }

  /**
   * Elimina un dispositivo de la base de datos.
   * No elimina comandos relacionados en command_history (ON DELETE CASCADE en schema).
   * @param id - Identificador del dispositivo
   */
  deleteDevice(id: string): void {
    this.db.run('DELETE FROM devices WHERE id = ?', [id]);
  }

  /**
   * Obtiene todos los dispositivos registrados.
   * Ordena por hostname ASC para listado alfabético.
   * @returns Array de todos los DeviceRow
   */
  getAllDevices(): DeviceRow[] {
    return this.db.query('SELECT * FROM devices ORDER BY hostname').all() as DeviceRow[];
  }
}