#!/usr/bin/env bun
import { Command } from 'commander';
import chalk from 'chalk';
import { randomUUID } from 'node:crypto';
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

export function createDevicesAddCommand(): Command {
  return new Command('add')
    .description('Agregar dispositivo a la memoria')
    .argument('<hostname>', 'Nombre del dispositivo')
    .option('--ip <ip>', 'Direccion IP')
    .option('--model <model>', 'Modelo del dispositivo')
    .option('--type <type>', 'Tipo: router, switch, pc', 'router')
    .action((hostname, options) => {
      const db = getMemoryDb();
      const memory = new DeviceMemory(db);
      const id = randomUUID().slice(0, 8);
      memory.registerDevice(id, hostname, options.ip, options.type, options.model);
      console.log(chalk.green(`\n✓ Dispositivo "${chalk.cyan(hostname)}" registrado\n`));
      db.close();
    });
}
