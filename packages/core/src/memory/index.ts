// Facade del almacén de memoria
// Proporciona una instancia singleton de MemoryStore que encapsula todos los módulos de memoria

import { Database } from 'bun:sqlite';
import { initializeSchema } from './schema';
import { DeviceMemory } from './devices';
import { TopologyMemory } from './topology';
import { PreferencesStore } from './preferences';
import { AuditMemory } from './audit';
import { HistoryMemory } from './history';

/**
 * Clase principal que encapsula todos los módulos de memoria
 */
export class MemoryStore {
  private db: Database;
  public devices: DeviceMemory;
  public topology: TopologyMemory;
  public preferences: PreferencesStore;
  public audit: AuditMemory;
  public history: HistoryMemory;

  private constructor(dbPath: string = ':memory:') {
    this.db = new Database(dbPath);
    initializeSchema(this.db);

    // Inicializar todos los módulos
    this.devices = new DeviceMemory(this.db);
    this.topology = new TopologyMemory(this.db);
    this.preferences = new PreferencesStore(this.db);
    this.audit = new AuditMemory(this.db);
    this.history = new HistoryMemory(this.db);
  }

  /**
   * Obtiene la instancia singleton de MemoryStore
   */
  static getInstance(dbPath: string = ':memory:'): MemoryStore {
    if (!MemoryStore.instance) {
      MemoryStore.instance = new MemoryStore(dbPath);
    }
    return MemoryStore.instance;
  }

  /**
   * Cierra la conexión a la base de datos
   */
  close(): void {
    this.db.close();
    MemoryStore.instance = null; // Reset singleton para permitir reconexión
  }

  /**
   * Ejecuta una consulta SQL personalizada
   */
  query(sql: string, params: any[] = []): any[] {
    return this.db.query(sql).all(...params);
  }

  /**
   * Ejecuta una operación SQL personalizada
   */
  exec(sql: string, params: any[] = []): void {
    this.db.run(sql, params);
  }

  // Propiedad estática para el singleton
  private static instance: MemoryStore | null = null;
}

/**
 * Función de conveniencia para obtener la instancia singleton
 */
export function getMemory(dbPath: string = ':memory:'): MemoryStore {
  return MemoryStore.getInstance(dbPath);
}
