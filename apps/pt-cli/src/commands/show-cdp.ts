#!/usr/bin/env bun
/**
 * Comando show-cdp: muestra vecinos CDP parseados y opcionalmente guarda topología en SQLite.
 * Usa el parser de Wave 3 para devolver vecinos CDP con device ID, interfaces, holdtime y plataforma.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { Database } from 'bun:sqlite';
import { homedir } from 'node:os';
import { join } from 'node:path';

import { runCommand } from '../application/run-command.js';
import { createSuccessResult, createErrorResult } from '../contracts/cli-result.js';
import type { CommandMeta, CommandExample } from '../contracts/command-meta.js';
import type { GlobalFlags } from '../flags.js';
import { formatOutput, applyJqFilter } from '../flags.js';

const SHOW_CDP_EXAMPLES: CommandExample[] = [
  { command: 'pt show-cdp R1', description: 'Mostrar vecinos CDP de R1' },
  { command: 'pt show-cdp Router1 --save-topology', description: 'Guardar vecinos CDP en SQLite como topología' },
  { command: 'pt show-cdp R1 --json', description: 'Salida en formato JSON' },
];

const SHOW_CDP_META: CommandMeta = {
  id: 'show-cdp',
  summary: 'Mostrar vecinos CDP parseados y guardar topología',
  longDescription:
    'Ejecuta "show cdp neighbors" y devuelve los vecinos parseados: device ID, interfaz local, holdtime, capacidad, plataforma y puerto remoto. Con --save-topology guarda la información en SQLite.',
  examples: SHOW_CDP_EXAMPLES,
  related: ['show', 'topology', 'device'],
  supportsVerify: false,
  supportsJson: true,
  supportsExplain: true,
};

function formatCdpTable(data: any): string {
  const lines: string[] = [];

  if (!data.neighbors || data.neighbors.length === 0) {
    lines.push(chalk.yellow('No hay vecinos CDP detectados.'));
    return lines.join('\n');
  }

  lines.push(chalk.bold('Device ID         Interfaz Local  Holdtime  Plataforma     Puerto Remoto'));
  lines.push(chalk.dim('─'.repeat(80)));

  for (const neighbor of data.neighbors) {
    const deviceId = (neighbor.deviceId || '').padEnd(17);
    const localInt = (neighbor.localInterface || '').padEnd(15);
    const holdtime = String(neighbor.holdtime || 0).padEnd(9);
    const platform = (neighbor.platform || '').padEnd(14);
    const portId = neighbor.portId || '';

    lines.push(`${deviceId} ${localInt} ${holdtime} ${platform} ${portId}`);
  }

  lines.push('');
  lines.push(chalk.dim(`Total: ${data.neighbors.length} vecinos CDP`));
  return lines.join('\n');
}

function saveCdpTopology(device: string, data: any): { path: string; rowsInserted: number } {
  const dbPath = join(homedir(), '.cisco-auto', 'topology.db');

  const dir = join(homedir(), '.cisco-auto');
  try {
    Bun.write(join(dir, '.gitkeep'), '');
  } catch {
    // directorio ya existe o no se puede crear
  }

  const db = new Database(dbPath);
  db.run(`
    CREATE TABLE IF NOT EXISTS cdp_neighbors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_device TEXT NOT NULL,
      device_id TEXT NOT NULL,
      local_interface TEXT,
      holdtime INTEGER,
      capability TEXT,
      platform TEXT,
      port_id TEXT,
      discovered_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`DELETE FROM cdp_neighbors WHERE source_device = ?`, [device]);

  let inserted = 0;
  const stmt = db.prepare(`
    INSERT INTO cdp_neighbors (source_device, device_id, local_interface, holdtime, capability, platform, port_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  for (const neighbor of data.neighbors || []) {
    stmt.run(
      device,
      neighbor.deviceId,
      neighbor.localInterface,
      neighbor.holdtime,
      neighbor.capability,
      neighbor.platform,
      neighbor.portId
    );
    inserted++;
  }

  db.close();

  return { path: dbPath, rowsInserted: inserted };
}

export function createShowCdpCommand(): Command {
  const showCdpCmd = new Command('show-cdp')
    .description('Mostrar vecinos CDP parseados')
    .argument('[device]', 'Nombre del dispositivo')
    .option('--save-topology', 'Guardar vecinos CDP en SQLite como topología')
    .option('--examples', 'Mostrar ejemplos de uso')
    .option('--schema', 'Mostrar schema del resultado')
    .option('--explain', 'Explicar qué hace el comando')
    .option('-j, --json', 'Salida en formato JSON')
    .option('--jq <filter>', 'Filtrar salida JSON')
    .option('-o, --output <format>', 'Formato de salida (json|yaml|table|text)', 'text')
    .action(async (device: string, options: Record<string, unknown>) => {
      if (options.examples) {
        console.log('Ejemplos de uso:');
        SHOW_CDP_EXAMPLES.forEach((ex) => {
          console.log(`  ${ex.command}`);
          console.log(`    → ${ex.description}`);
        });
        return;
      }

      if (options.schema) {
        console.log('Schema del resultado:');
        console.log(
          JSON.stringify(
            {
              type: 'object',
              properties: {
                neighbors: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      deviceId: { type: 'string' },
                      localInterface: { type: 'string' },
                      holdtime: { type: 'number' },
                      capability: { type: 'string' },
                      platform: { type: 'string' },
                      portId: { type: 'string' },
                    },
                  },
                },
              },
            },
            null,
            2
          )
        );
        return;
      }

      if (options.explain) {
        console.log(`${SHOW_CDP_META.summary}`);
        console.log(`\n${SHOW_CDP_META.longDescription}`);
        return;
      }

      const flags: GlobalFlags = {
        json: Boolean(options.json),
        jq: options.jq as string | null,
        output: (options.output as GlobalFlags['output']) || 'text',
        verbose: false,
        quiet: false,
        trace: false,
        tracePayload: false,
        traceResult: false,
        traceDir: null,
        traceBundle: false,
        traceBundlePath: null,
        sessionId: null,
        examples: false,
        schema: false,
        explain: false,
        plan: false,
        verify: false,
        timeout: null,
        noTimeout: false,
      };

      const result = await runCommand({
        action: 'show:cdp',
        meta: SHOW_CDP_META,
        flags,
        payloadPreview: { device, saveTopology: Boolean(options.saveTopology) },
        execute: async (ctx) => {
          if (!device) {
            return createErrorResult('show:cdp', {
              message: 'Se requiere un dispositivo. Usa: pt show-cdp <device>',
            });
          }

          await ctx.controller.start();

          try {
            const data = await ctx.controller.showCdpNeighbors(device);

            if (flags.jq && data) {
              const filtered = applyJqFilter(data, flags.jq);
              return createSuccessResult('show:cdp', filtered, {
                entityType: 'show',
                examples: SHOW_CDP_EXAMPLES.map((ex) => ex.command),
              });
            }

            const advice: string[] = [];
            const neighborCount = data.neighbors?.length || 0;
            advice.push(`Vecinos CDP: ${neighborCount}`);

            if (options.saveTopology && neighborCount > 0) {
              const saved = saveCdpTopology(device, data);
              advice.push(`Topología guardada en: ${saved.path}`);
              advice.push(`Registros insertados: ${saved.rowsInserted}`);
            }

            return createSuccessResult('show:cdp', data, {
              entityType: 'show',
              advice,
              examples: SHOW_CDP_EXAMPLES.map((ex) => ex.command),
            });
          } finally {
            await ctx.controller.stop();
          }
        },
      });

      if (result.ok) {
        if (flags.json) {
          console.log(JSON.stringify(result.data, null, 2));
        } else if (flags.output === 'table' || flags.output === 'text') {
          console.log(formatCdpTable(result.data));
        } else {
          console.log(formatOutput(result.data, flags.output));
        }
      } else {
        console.error(`${chalk.red('✗')} Error: ${result.error?.message}`);
        process.exit(1);
      }
    });

  showCdpCmd.addHelpText(
    'after',
    `
Ejemplos:
  pt show-cdp R1
  pt show-cdp R1 --save-topology
  pt show-cdp Router1 --json

Flags de información:
  --examples        Mostrar ejemplos de uso
  --schema          Mostrar schema del resultado
  --explain         Explicar el comando
  --save-topology   Guardar topología en SQLite (~/.cisco-auto/topology.db)
  --json            Salida en JSON
  --jq <expr>       Filtrar resultado con expresión jq
`
  );

  return showCdpCmd;
}
