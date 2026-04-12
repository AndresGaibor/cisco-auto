#!/usr/bin/env bun
import { Command } from 'commander';
import chalk from 'chalk';
import { randomUUID } from 'node:crypto';
import { Database } from 'bun:sqlite';

function initializeSchema(db: Database): void {
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

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_devices_hostname ON devices(hostname);
    CREATE INDEX IF NOT EXISTS idx_devices_ip ON devices(ip_address);
    CREATE INDEX IF NOT EXISTS idx_devices_last_connected ON devices(last_connected);
  `);

  db.exec(`
    CREATE TRIGGER IF NOT EXISTS update_devices_timestamp 
    AFTER UPDATE ON devices
    BEGIN
      UPDATE devices SET updated_at = strftime('%s', 'now') WHERE id = NEW.id;
    END;
  `);
}

function getMemoryDb(): Database {
  const home = process.env.HOME || process.env.USERPROFILE || '.';
  const dbPath = `${home}/.cisco-auto/memory.db`;
  const dir = dbPath.substring(0, dbPath.lastIndexOf('/'));
  try { require('node:fs').mkdirSync(dir, { recursive: true }); } catch { }
  const db = new Database(dbPath);
  initializeSchema(db);
  return db;
}

export function createDevicesAddCommand(): Command {
  return new Command('add')
    .description('Agregar dispositivo a la memoria')
    .argument('<hostname>', 'Nombre del dispositivo')
    .option('--ip <ip>', 'Direccion IP')
    .option('--model <model>', 'Modelo del dispositivo')
    .option('--type <type>', 'Tipo: router, switch, pc', 'router')
    .action((hostname, options) => {
      const db = getMemoryDb();
      const id = randomUUID().slice(0, 8);
      const now = Math.floor(Date.now() / 1000);
      
      db.run(`
        INSERT INTO devices (id, hostname, ip_address, device_type, os_version, last_connected, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          hostname = excluded.hostname,
          ip_address = excluded.ip_address,
          device_type = excluded.device_type,
          os_version = excluded.os_version,
          last_connected = excluded.last_connected,
          updated_at = excluded.updated_at
      `, [id, hostname, options.ip || null, options.type || null, options.model || null, now, now]);
      
      console.log(chalk.green(`\n✓ Dispositivo "${chalk.cyan(hostname)}" registrado\n`));
      db.close();
    });
}
