#!/usr/bin/env bun
/**
 * Comando show para consultar información de dispositivos.
 * Migrado al patrón runCommand con CliResult.
 */

import { Command } from 'commander';
import chalk from 'chalk';

import { runCommand } from '../application/run-command.js';
import { createSuccessResult, createErrorResult } from '../contracts/cli-result.js';
import type { CommandMeta, CommandExample } from '../contracts/command-meta.js';
import type { GlobalFlags } from '../flags.js';
import { formatOutput, applyJqFilter } from '../flags.js';

const SHOW_EXAMPLES: CommandExample[] = [
  { command: 'pt show ip-int-brief R1', description: 'Mostrar IPs de interfaces de R1' },
  { command: 'pt show vlan Switch1', description: 'Mostrar VLANs del switch' },
  { command: 'pt show ip-route Router1', description: 'Mostrar tabla de rutas' },
  { command: 'pt show run-config R1', description: 'Mostrar configuración corriendo' },
  { command: 'pt show ip-int-brief R1 --json', description: 'Salida en formato JSON' },
  { command: 'pt show vlan Switch1 --output table', description: 'Salida en formato tabla' },
];

const SHOW_META: CommandMeta = {
  id: 'show',
  summary: 'Ejecutar comandos show para consultar información de dispositivos',
  longDescription:
    'Comandos de solo lectura para obtener información de la topología de Packet Tracer. Incluye IP de interfaces, VLANs, rutas y configuración.',
  examples: SHOW_EXAMPLES,
  related: ['config-ios', 'device get'],
  supportsVerify: false,
  supportsJson: true,
  supportsExplain: true,
};

const SHOW_SUBCOMMANDS = [
  { name: 'ip-int-brief', description: 'Mostrar IPs de interfaces', action: 'show:ip-int-brief' },
  { name: 'vlan', description: 'Mostrar VLANs', action: 'show:vlan' },
  { name: 'ip-route', description: 'Mostrar tabla de rutas', action: 'show:ip-route' },
  { name: 'run-config', description: 'Mostrar configuración corriendo', action: 'show:run-config' },
];

export function createShowCommand(): Command {
  const showCmd = new Command('show').description(
    'Ejecutar comandos show para consultar información de dispositivos'
  );

  for (const sub of SHOW_SUBCOMMANDS) {
    const subCmd = showCmd
      .command(sub.name)
      .description(sub.description)
      .argument('[device]', 'Nombre del dispositivo')
      .option('--examples', 'Mostrar ejemplos de uso')
      .option('--schema', 'Mostrar schema del resultado')
      .option('--explain', 'Explicar qué hace el comando')
      .option('-j, --json', 'Salida en formato JSON')
      .option('--jq <filter>', 'Filtrar salida JSON')
      .option('-o, --output <format>', 'Formato de salida (json|yaml|table|text)', 'text')
      .action(async (device: string | undefined, options: Record<string, unknown>) => {
        if (options.examples) {
          console.log('Ejemplos de uso:');
          SHOW_EXAMPLES.filter((ex) => ex.command.includes(sub.name)).forEach((ex) => {
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
                  data: { type: 'array' },
                },
              },
              null,
              2
            )
          );
          return;
        }

        if (options.explain) {
          console.log(`${SHOW_META.summary}`);
          console.log(`\n${SHOW_META.longDescription}`);
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
        };

        const result = await runCommand({
          action: sub.action,
          meta: SHOW_META,
          flags,
          payloadPreview: { device, subcommand: sub.name },
          execute: async (ctx) => {
            await ctx.controller.start();

            try {
              let data: unknown;

              switch (sub.name) {
                case 'ip-int-brief':
                  data = await ctx.controller.showIpInterfaceBrief(device || '');
                  break;
                case 'vlan':
                  data = await ctx.controller.showVlan(device || '');
                  break;
                case 'ip-route':
                  data = await ctx.controller.showIpRoute(device || '');
                  break;
                case 'run-config':
                  data = await ctx.controller.showRunningConfig(device || '');
                  break;
                default:
                  return createErrorResult(sub.action, {
                    message: `Subcomando desconocido: ${sub.name}`,
                  });
              }

              if (flags.jq && data) {
                data = applyJqFilter(data, flags.jq);
              }

              return createSuccessResult(sub.action, data, {
                entityType: 'show',
                examples: SHOW_EXAMPLES.filter((ex) => ex.command.includes(sub.name)).map(
                  (ex) => ex.command
                ),
              });
            } finally {
              await ctx.controller.stop();
            }
          },
        });

        if (result.ok) {
          if (flags.json) {
            console.log(JSON.stringify(result.data, null, 2));
          } else {
            console.log(formatOutput(result.data, flags.output));
          }
        } else {
          console.error(`${chalk.red('✗')} Error: ${result.error?.message}`);
          process.exit(1);
        }
      });

    subCmd.addHelpText(
      'after',
      `
Ejemplos:
  pt show ip-int-brief R1
  pt show vlan Switch1
  pt show ip-route Router1
  pt show run-config R1

Flags de información:
  --examples    Mostrar ejemplos de uso
  --schema      Mostrar schema del resultado
  --explain     Explicar el comando
  --json        Salida en JSON
  --jq <expr>   Filtrar resultado con expresión jq
`
    );
  }

  return showCmd;
}