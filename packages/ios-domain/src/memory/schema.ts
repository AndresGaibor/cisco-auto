// Schema de base de datos SQLite para el módulo de memoria
// Define todas las tablas, índices y constraints necesarios

import { Database } from 'bun:sqlite';

/**
 * Inicializa el esquema de la base de datos
 * Crea todas las tablas necesarias con sus índices y constraints
 */
export function initializeSchema(db: Database): void {
  // Tabla de dispositivos
  db.exec(`
    CREATE TABLE IF NOT EXISTS devices (
      id TEXT PRIMARY KEY,
      hostname TEXT NOT NULL,
      ip_address TEXT,
      device_type TEXT,
      os_version TEXT,
      last_connected INTEGER,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER DEFAULT (strftime('%s', 'now'))
    );
  `);

  // Índices para la tabla de dispositivos
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_devices_hostname ON devices(hostname);
    CREATE INDEX IF NOT EXISTS idx_devices_ip ON devices(ip_address);
    CREATE INDEX IF NOT EXISTS idx_devices_last_connected ON devices(last_connected);
  `);

  // Tabla de historial de comandos
  db.exec(`
    CREATE TABLE IF NOT EXISTS command_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id TEXT NOT NULL,
      command TEXT NOT NULL,
      output TEXT,
      status TEXT DEFAULT 'success',
      timestamp INTEGER DEFAULT (strftime('%s', 'now')),
      session_id TEXT,
      FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
    );
  `);

  // Índices para la tabla de historial de comandos
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_command_history_device_id ON command_history(device_id);
    CREATE INDEX IF NOT EXISTS idx_command_history_timestamp ON command_history(timestamp);
    CREATE INDEX IF NOT EXISTS idx_command_history_status ON command_history(status);
    CREATE INDEX IF NOT EXISTS idx_command_history_session ON command_history(session_id);
  `);

  // Tabla de auditoría de comandos y transacciones
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      session_id TEXT NOT NULL,
      device_id TEXT,
      command TEXT NOT NULL,
      status TEXT NOT NULL,
      output TEXT,
      error TEXT,
      duration_ms INTEGER,
      transaction_id TEXT,
      FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE SET NULL
    );
  `);

  // Índices para la tabla de auditoría
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_audit_log_session_id ON audit_log(session_id);
    CREATE INDEX IF NOT EXISTS idx_audit_log_device_id ON audit_log(device_id);
    CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp);
    CREATE INDEX IF NOT EXISTS idx_audit_log_status ON audit_log(status);
    CREATE INDEX IF NOT EXISTS idx_audit_log_transaction_id ON audit_log(transaction_id);
  `);

  // Tabla de topología de red
  db.exec(`
    CREATE TABLE IF NOT EXISTS topology (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id TEXT NOT NULL,
      neighbor_id TEXT NOT NULL,
      interface_local TEXT,
      interface_remote TEXT,
      protocol TEXT,
      discovered_at INTEGER DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
      FOREIGN KEY (neighbor_id) REFERENCES devices(id) ON DELETE CASCADE,
      UNIQUE(device_id, neighbor_id)
    );
  `);

  // Índices para la tabla de topología
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_topology_device_id ON topology(device_id);
    CREATE INDEX IF NOT EXISTS idx_topology_neighbor_id ON topology(neighbor_id);
    CREATE INDEX IF NOT EXISTS idx_topology_discovered_at ON topology(discovered_at);
  `);

  // Tabla de preferencias
  db.exec(`
    CREATE TABLE IF NOT EXISTS preferences (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at INTEGER DEFAULT (strftime('%s', 'now'))
    );
  `);

  // Tabla de sesiones
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      device_id TEXT,
      start_time INTEGER DEFAULT (strftime('%s', 'now')),
      end_time INTEGER,
      status TEXT DEFAULT 'active',
      FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE SET NULL
    );
  `);

  // Índices para la tabla de sesiones
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_sessions_device_id ON sessions(device_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_start_time ON sessions(start_time);
    CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
  `);

  // Actualizar timestamps automáticamente con triggers
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS update_devices_timestamp 
    AFTER UPDATE ON devices
    BEGIN
      UPDATE devices SET updated_at = strftime('%s', 'now') WHERE id = NEW.id;
    END;
  `);

  db.exec(`
    CREATE TRIGGER IF NOT EXISTS update_preferences_timestamp 
    AFTER UPDATE ON preferences
    BEGIN
      UPDATE preferences SET updated_at = strftime('%s', 'now') WHERE key = NEW.key;
    END;
  `);
}