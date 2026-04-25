// Gestión de preferencias de usuario y configuración
// Implementa operaciones clave-valor para almacenar configuraciones

import { Database } from 'bun:sqlite';

/**
 * Clase para manejar el almacenamiento de preferencias
 */
export class PreferencesStore {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  /**
   * Establece un valor de preferencia
   */
  set(key: string, value: string): void {
    this.db.run(`
      INSERT INTO preferences (key, value, updated_at)
      VALUES (?, ?, strftime('%s', 'now'))
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = excluded.updated_at
    `, [key, value]);
  }

  /**
   * Obtiene el valor de una preferencia
   */
  get(key: string): string | null {
    const row = this.db.query('SELECT value FROM preferences WHERE key = ?').get(key) as { value?: string } | null;
    return row ? (row.value ?? null) : null;
  }

  /**
   * Elimina una preferencia
   */
  delete(key: string): void {
    this.db.run('DELETE FROM preferences WHERE key = ?', [key]);
  }

  /**
   * Obtiene todas las preferencias
   */
  getAll(): Record<string, string> {
    const rows = this.db.query('SELECT key, value FROM preferences').all() as Array<{ key: string; value: string }>;
    return rows.reduce((acc, row) => {
      acc[row.key] = row.value;
      return acc;
    }, {} as Record<string, string>);
  }

  /**
   * Establece el dispositivo predeterminado
   */
  setDefaultDevice(deviceId: string): void {
    this.set('default_device', deviceId);
  }

  /**
   * Obtiene el dispositivo predeterminado
   */
  getDefaultDevice(): string | null {
    return this.get('default_device');
  }

  /**
   * Verifica si existe una preferencia
   */
  has(key: string): boolean {
    const row = this.db.query('SELECT 1 FROM preferences WHERE key = ?').get(key);
    return row !== undefined;
  }

  /**
   * Limpia todas las preferencias
   */
  clear(): void {
    this.db.run('DELETE FROM preferences');
  }
}