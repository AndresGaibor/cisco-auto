#!/usr/bin/env bun
import { Command } from 'commander';
import chalk from 'chalk';
import { Database } from 'bun:sqlite';
import { initializeSchema } from '@cisco-auto/core/memory/schema';
import { DeviceMemory } from '@cisco-auto/core/memory/devices';

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
  return new Command('list')
    .description('Listar dispositivos guardados')
    .option('--limit <n>', 'Numero maximo de dispositivos', '50')
    .action((options) => {
      const db = getMemoryDb();
      const memory = new DeviceMemory(db);
      const limit = parseInt(options.limit, 10);
      const devices = memory.getRecentDevices(limit);

      if (devices.length === 0) {
        console.log(chalk.yellow('No hay dispositivos guardados.'));
        console.log(chalk.gray('Use pt devices add <hostname> --ip <ip> para agregar uno.'));
        return;
      }

      console.log(chalk.bold('\n📋 Dispositivos guardados\n'));
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
      console.log(chalk.gray(`\nTotal: ${devices.length} dispositivos\n`));
      db.close();
    });
}
