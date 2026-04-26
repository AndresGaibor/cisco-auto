#!/usr/bin/env bun
import { Command } from 'commander';
import chalk from 'chalk';
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

export function createDevicesListCommand(): Command {
  return new Command('devices-list')
    .description('⚠️  DEPRECADO - Usa `pt device list` para ver dispositivos en PT')
    .addHelpText('before', chalk.yellow('⚠️  Este comando está deprecado.\n  devices-list consultaba la base SQLite local.\n  Usa `pt device list` para ver dispositivos en Packet Tracer.\n\n'))
    .option('--limit <n>', 'Numero maximo de dispositivos', '50')
    .action((options) => {
      console.log(chalk.yellow('⚠️  devices-list está deprecado. Usa `pt device list`.'));
      console.log(chalk.gray('  (La base SQLite local ~/.cisco-auto/memory.db ya no se usa para listar dispositivos en PT)\n'));
      const db = getMemoryDb();
      const limit = parseInt(options.limit, 10);
      const devices = db.query(`
        SELECT * FROM devices
        ORDER BY last_connected DESC
        LIMIT ?
      `).all(limit) as Array<{
        id: string;
        hostname: string;
        ip_address: string | null;
        device_type: string | null;
        os_version: string | null;
        last_connected: number | null;
        created_at: number;
        updated_at: number;
      }>;

      if (devices.length === 0) {
        console.log(chalk.yellow('No hay dispositivos guardados en la base local.'));
        db.close();
        return;
      }

      console.log(chalk.bold('\n📋 Dispositivos guardados (base local ~/.cisco-auto/memory.db)\n'));
      console.log(chalk.cyan('─'.repeat(80)));
      console.log(
        chalk.yellow('Hostname'.padEnd(20)) +
        chalk.yellow('IP'.padEnd(18)) +
        chalk.yellow('Tipo'.padEnd(15)) +
        chalk.yellow('Ultima conexion')
      );
      console.log(chalk.cyan('─'.repeat(80)));

      for (const d of devices) {
        const lastConn = d.last_connected
          ? new Date(d.last_connected * 1000).toLocaleString()
          : 'Nunca';
        console.log(
          (d.hostname || 'N/A').padEnd(20) +
          (d.ip_address || 'N/A').padEnd(18) +
          (d.device_type || 'N/A').padEnd(15) +
          lastConn
        );
      }
      console.log(chalk.cyan('─'.repeat(80)));
      console.log(chalk.gray(`\nTotal: ${devices.length} dispositivos (base local)\n`));
      console.log(chalk.gray('  Para ver dispositivos en PT usa: pt device list'));
      db.close();
    });
}
