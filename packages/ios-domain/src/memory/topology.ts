// Gestión de topología de red
// Implementa operaciones para almacenar y consultar relaciones entre dispositivos

import { Database } from 'bun:sqlite';

/**
 * Clase para manejar la memoria de topología
 */
export class TopologyMemory {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  /**
   * Registra una relación de vecindad entre dos dispositivos
   */
  recordNeighbor(
    deviceId: string,
    neighborId: string,
    localInterface?: string,
    remoteInterface?: string,
    protocol?: string
  ): void {
    this.db.run(`
      INSERT OR REPLACE INTO topology 
      (device_id, neighbor_id, interface_local, interface_remote, protocol, discovered_at)
      VALUES (?, ?, ?, ?, ?, strftime('%s', 'now'))
    `, [deviceId, neighborId, localInterface || null, remoteInterface || null, protocol || null]);
  }

  /**
   * Obtiene los vecinos de un dispositivo específico
   */
  getDeviceNeighbors(deviceId: string): any[] {
    return this.db.query(`
      SELECT t.*, d.hostname as neighbor_hostname 
      FROM topology t
      JOIN devices d ON t.neighbor_id = d.id
      WHERE t.device_id = ?
      ORDER BY t.discovered_at DESC
    `).all(deviceId);
  }

  /**
   * Obtiene la topología completa de la red
   */
  getTopology(): any[] {
    return this.db.query(`
      SELECT 
        t.id,
        t.device_id,
        d1.hostname as device_hostname,
        t.neighbor_id,
        d2.hostname as neighbor_hostname,
        t.interface_local,
        t.interface_remote,
        t.protocol,
        t.discovered_at
      FROM topology t
      JOIN devices d1 ON t.device_id = d1.id
      JOIN devices d2 ON t.neighbor_id = d2.id
      ORDER BY t.discovered_at DESC
    `).all();
  }

  /**
   * Limpia toda la topología (útil para rediscoveries)
   */
  clearTopology(): void {
    this.db.run('DELETE FROM topology');
  }

  /**
   * Elimina entradas de topología antiguas (más de X días)
   */
  cleanupOldEntries(days: number = 7): void {
    const cutoff = Math.floor(Date.now() / 1000) - (days * 24 * 60 * 60);
    this.db.run('DELETE FROM topology WHERE discovered_at < ?', [cutoff]);
  }

  /**
   * Obtiene estadísticas de topología
   */
  getTopologyStats(): any {
    const totalLinks = this.db.query('SELECT COUNT(*) as count FROM topology').get() as { count: number };
    const devicesWithLinks = this.db.query(`
      SELECT COUNT(DISTINCT device_id) as count FROM topology
    `).get() as { count: number };
    
    return {
      totalLinks: totalLinks.count,
      devicesWithLinks: devicesWithLinks.count,
      avgLinksPerDevice: devicesWithLinks.count > 0 ? totalLinks.count / devicesWithLinks.count : 0
    };
  }
}