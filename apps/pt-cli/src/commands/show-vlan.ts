#!/usr/bin/env bun
/**
 * Comando show-vlan: muestra las VLANs parseadas de un switch.
 * Usa el parser de Wave 3 para devolver VLANs con IDs, nombres, estados y puertos.
 */

import { Command } from 'commander';
import chalk from 'chalk';

import { runCommand } from '../application/run-command.js';
import { createSuccessResult, createErrorResult } from '../contracts/cli-result.js';
import type { CommandMeta, CommandExample } from '../contracts/command-meta.js';
import type { GlobalFlags } from '../flags.js';
import { formatOutput, applyJqFilter } from '../flags.js';

const SHOW_VLAN_EXAMPLES: CommandExample[] = [
  { command: 'pt show-vlan Switch1', description: 'Mostrar VLANs del switch' },
  { command: 'pt show-vlan S1 --json', description: 'Salida en formato JSON' },
  { command: 'pt show-vlan Switch1 --jq ".vlans[?(@.status==\'active\')]"', description: 'Filtrar VLANs activas' },
];

const SHOW_VLAN_META: CommandMeta = {
  id: 'show-vlan',
  summary: 'Mostrar VLANs parseadas de un switch (show vlan)',
  longDescription:
    'Ejecuta "show vlan" y devuelve las VLANs parseadas: ID, nombre, estado (active/suspended) y puertos asignados.',
  examples: SHOW_VLAN_EXAMPLES,
  related: ['show', 'vlan', 'config-ios'],
  supportsVerify: false,
  supportsJson: true,
  supportsExplain: true,
};

function formatVlanTable(data: any): string {
  const lines: string[] = [];

  if (!data.vlans || data.vlans.length === 0) {
    lines.push(chalk.yellow('No hay VLANs configuradas.'));
    return lines.join('\n');
  }

  lines.push(chalk.bold('VLAN  Nombre              Estado      Puertos'));
  lines.push(chalk.dim('─'.repeat(70)));

  for (const vlan of data.vlans) {
    const id = String(vlan.id).padEnd(5);
    const name = (vlan.name || '').padEnd(19);
    const status = (vlan.status || '').padEnd(11);
    const ports = vlan.ports?.length > 0 ? vlan.ports.join(', ') : '(sin puertos)';

    const statusColor = vlan.status === 'active' ? chalk.green : chalk.yellow;
    lines.push(`${id} ${name} ${statusColor(status)} ${ports}`);
  }

  lines.push('');
  lines.push(chalk.dim(`Total: ${data.vlans.length} VLANs`));
  return lines.join('\n');
}

export function createShowVlanCommand(): Command {
  const showVlanCmd = new Command('show-vlan')
    .description('Mostrar VLANs parseadas de un switch')
    .argument('[device]', 'Nombre del dispositivo switch')
    .option('--examples', 'Mostrar ejemplos de uso')
    .option('--schema', 'Mostrar schema del resultado')
    .option('--explain', 'Explicar qué hace el comando')
    .option('-j, --json', 'Salida en formato JSON')
    .option('--jq <filter>', 'Filtrar salida JSON')
    .option('-o, --output <format>', 'Formato de salida (json|yaml|table|text)', 'text')
    .action(async (device: string, options: Record<string, unknown>) => {
      if (options.examples) {
        console.log('Ejemplos de uso:');
        SHOW_VLAN_EXAMPLES.forEach((ex) => {
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
                vlans: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'number' },
                      name: { type: 'string' },
                      status: { type: 'string', enum: ['active', 'suspended', 'act/unsup'] },
                      ports: { type: 'array', items: { type: 'string' } },
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
        console.log(`${SHOW_VLAN_META.summary}`);
        console.log(`\n${SHOW_VLAN_META.longDescription}`);
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
        action: 'show:vlan',
        meta: SHOW_VLAN_META,
        flags,
        payloadPreview: { device },
        execute: async (ctx) => {
          if (!device) {
            return createErrorResult('show:vlan', {
              message: 'Se requiere un dispositivo. Usa: pt show-vlan <device>',
            });
          }

          await ctx.controller.start();

          try {
            const data = await ctx.controller.showVlan(device);

            if (flags.jq && data) {
              const filtered = applyJqFilter(data, flags.jq);
              return createSuccessResult('show:vlan', filtered, {
                entityType: 'show',
                examples: SHOW_VLAN_EXAMPLES.map((ex) => ex.command),
              });
            }

            const vlanCount = data.vlans?.length || 0;
            const activeVlans = data.vlans?.filter((v: any) => v.status === 'active').length || 0;
            const advice = [`VLANs encontradas: ${vlanCount}`, `Activas: ${activeVlans}`];

            return createSuccessResult('show:vlan', data, {
              entityType: 'show',
              advice,
              examples: SHOW_VLAN_EXAMPLES.map((ex) => ex.command),
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
          console.log(formatVlanTable(result.data));
        } else {
          console.log(formatOutput(result.data, flags.output));
        }
      } else {
        console.error(`${chalk.red('✗')} Error: ${result.error?.message}`);
        process.exit(1);
      }
    });

  showVlanCmd.addHelpText(
    'after',
    `
Ejemplos:
  pt show-vlan Switch1
  pt show-vlan S1 --json
  pt show-vlan Switch1 --output table

Flags de información:
  --examples    Mostrar ejemplos de uso
  --schema      Mostrar schema del resultado
  --explain     Explicar el comando
  --json        Salida en JSON
  --jq <expr>   Filtrar resultado con expresión jq
`
  );

  return showVlanCmd;
}
