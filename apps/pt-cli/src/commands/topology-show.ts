#!/usr/bin/env bun
import { Command } from 'commander';
import chalk from 'chalk';
import { Database } from 'bun:sqlite';
import { initializeLocalSchema } from '../utils/local-schema';

function getMemoryDb(): Database {
  const home = process.env.HOME || process.env.USERPROFILE || '.';
  const dbPath = `${home}/.cisco-auto/memory.db`;
  const dir = dbPath.substring(0, dbPath.lastIndexOf('/'));
  try { require('node:fs').mkdirSync(dir, { recursive: true }); } catch { }
  const db = new Database(dbPath);
  initializeLocalSchema(db);
  return db;
}

export function createTopologyShowCommand(): Command {
  return new Command('topology-show')
    .description('Mostrar topologia descubierta')
    .option('--device <device>', 'Filtrar por dispositivo')
    .action((options) => {
      const db = getMemoryDb();
      let query = `
        SELECT t.*, d1.hostname as device_name, d2.hostname as neighbor_name
        FROM topology t
        LEFT JOIN devices d1 ON t.device_id = d1.id
        LEFT JOIN devices d2 ON t.neighbor_id = d2.id
      `;
      const params: unknown[] = [];

      if (options.device) {
        query += ' WHERE d1.hostname = ? OR d2.hostname = ?';
        params.push(options.device, options.device);
      }

      query += ' ORDER BY t.discovered_at DESC';
      const edges = db.all(query, params);

      if (edges.length === 0) {
        console.log(chalk.yellow('No hay topologia descubierta.'));
        console.log(chalk.gray('Use show cdp neighbors --save-topology para descubrir.'));
        db.close();
        return;
      }

      console.log(chalk.bold('\n🌐 Topologia descubierta\n'));
      console.log(chalk.cyan('─'.repeat(80)));
      console.log(
        chalk.yellow('Dispositivo'.padEnd(20)) +
        chalk.yellow('Interfaz'.padEnd(20)) +
        chalk.yellow('Vecino'.padEnd(20)) +
        chalk.yellow('Interfaz Remota')
      );
      console.log(chalk.cyan('─'.repeat(80)));

      for (const edge of edges) {
        console.log(
          (edge.device_name || edge.device_id).padEnd(20) +
          (edge.interface_local || 'N/A').padEnd(20) +
          (edge.neighbor_name || edge.neighbor_id).padEnd(20) +
          (edge.interface_remote || 'N/A')
        );
      }
      console.log(chalk.cyan('─'.repeat(80)));
      console.log(chalk.gray(`\nConexiones: ${edges.length}\n`));
      db.close();
    });
}
