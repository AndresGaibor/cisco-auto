#!/usr/bin/env bun
/**
 * Comando show-route: muestra la tabla de enrutamiento parseada de un dispositivo.
 * Usa el parser de Wave 3 para devolver rutas estructuradas con tipo, next-hop e interfaz.
 */

import { Command } from 'commander';
import chalk from 'chalk';

import { runCommand } from '../application/run-command.js';
import { createSuccessResult, createErrorResult } from '../contracts/cli-result.js';
import type { CommandMeta, CommandExample } from '../contracts/command-meta.js';
import type { GlobalFlags } from '../flags.js';
import { formatOutput, applyJqFilter } from '../flags.js';

const SHOW_ROUTE_EXAMPLES: CommandExample[] = [
  { command: 'pt show-route R1', description: 'Mostrar tabla de enrutamiento de R1' },
  { command: 'pt show-route Router1 --json', description: 'Salida en formato JSON' },
  { command: 'pt show-route R1 --jq ".routes[?(@.type==\'C\')]"', description: 'Filtrar solo rutas conectadas' },
];

const SHOW_ROUTE_META: CommandMeta = {
  id: 'show-route',
  summary: 'Mostrar tabla de enrutamiento parseada (show ip route)',
  longDescription:
    'Ejecuta "show ip route" y devuelve la tabla de enrutamiento parseada: gateway de último recurso, rutas con tipo (C, S, O, D, B), distancia administrativa, métrica, next-hop e interfaz.',
  examples: SHOW_ROUTE_EXAMPLES,
  related: ['show', 'config-ios', 'routing'],
  supportsVerify: false,
  supportsJson: true,
  supportsExplain: true,
};

const TYPE_LABELS: Record<string, string> = {
  C: 'Conectada',
  L: 'Local',
  S: 'Estática',
  R: 'RIP',
  O: 'OSPF',
  D: 'EIGRP',
  B: 'BGP',
  '*': 'Candidata a default',
};

function formatRouteTable(data: any): string {
  const lines: string[] = [];

  if (data.gatewayOfLastResort) {
    lines.push(chalk.bold(`Gateway of last resort: ${data.gatewayOfLastResort}`));
    lines.push('');
  }

  if (!data.routes || data.routes.length === 0) {
    lines.push(chalk.yellow('No hay rutas en la tabla de enrutamiento.'));
    return lines.join('\n');
  }

  lines.push(chalk.bold('Código  Red                  Distancia  Métrica  Next-Hop          Interfaz'));
  lines.push(chalk.dim('─'.repeat(85)));

  for (const route of data.routes) {
    const code = `${route.type} (${TYPE_LABELS[route.type] || 'Desconocida'})`;
    const network = route.network.padEnd(20);
    const dist = route.administrativeDistance ? String(route.administrativeDistance).padEnd(10) : '-'.padEnd(10);
    const metric = route.metric ? String(route.metric).padEnd(8) : '-'.padEnd(8);
    const nextHop = (route.nextHop || '-').padEnd(17);
    const iface = route.interface || '-';

    lines.push(`${code.padEnd(20)} ${network} ${dist} ${metric} ${nextHop} ${iface}`);
  }

  lines.push('');
  lines.push(chalk.dim(`Total: ${data.routes.length} rutas`));
  return lines.join('\n');
}

export function createShowRouteCommand(): Command {
  const showRouteCmd = new Command('show-route')
    .description('Mostrar tabla de enrutamiento parseada')
    .argument('[device]', 'Nombre del dispositivo')
    .option('--examples', 'Mostrar ejemplos de uso')
    .option('--schema', 'Mostrar schema del resultado')
    .option('--explain', 'Explicar qué hace el comando')
    .option('-j, --json', 'Salida en formato JSON')
    .option('--jq <filter>', 'Filtrar salida JSON')
    .option('-o, --output <format>', 'Formato de salida (json|yaml|table|text)', 'text')
    .action(async (device: string, options: Record<string, unknown>) => {
      if (options.examples) {
        console.log('Ejemplos de uso:');
        SHOW_ROUTE_EXAMPLES.forEach((ex) => {
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
                gatewayOfLastResort: { type: 'string' },
                routes: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      type: { type: 'string', enum: ['C', 'L', 'S', 'R', 'O', 'D', 'B'] },
                      network: { type: 'string' },
                      administrativeDistance: { type: 'number' },
                      metric: { type: 'number' },
                      nextHop: { type: 'string' },
                      interface: { type: 'string' },
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
        console.log(`${SHOW_ROUTE_META.summary}`);
        console.log(`\n${SHOW_ROUTE_META.longDescription}`);
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
        action: 'show:route',
        meta: SHOW_ROUTE_META,
        flags,
        payloadPreview: { device },
        execute: async (ctx) => {
          if (!device) {
            return createErrorResult('show:route', {
              message: 'Se requiere un dispositivo. Usa: pt show-route <device>',
            });
          }

          await ctx.controller.start();

          try {
            const data = await ctx.controller.showIpRoute(device);

            if (flags.jq && data) {
              const filtered = applyJqFilter(data, flags.jq);
              return createSuccessResult('show:route', filtered, {
                entityType: 'show',
                examples: SHOW_ROUTE_EXAMPLES.map((ex) => ex.command),
              });
            }

            const routeCount = data.routes?.length || 0;
            const types = new Set(data.routes?.map((r: any) => r.type) || []);
            const advice = [`Rutas encontradas: ${routeCount}`, `Tipos: ${[...types].join(', ') || 'ninguno'}`];
            if (data.gatewayOfLastResort) {
              advice.push(`Gateway por defecto: ${data.gatewayOfLastResort}`);
            }

            return createSuccessResult('show:route', data, {
              entityType: 'show',
              advice,
              examples: SHOW_ROUTE_EXAMPLES.map((ex) => ex.command),
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
          console.log(formatRouteTable(result.data));
        } else {
          console.log(formatOutput(result.data, flags.output));
        }
      } else {
        console.error(`${chalk.red('✗')} Error: ${result.error?.message}`);
        process.exit(1);
      }
    });

  showRouteCmd.addHelpText(
    'after',
    `
Ejemplos:
  pt show-route R1
  pt show-route R1 --json
  pt show-route R1 --output table

Flags de información:
  --examples    Mostrar ejemplos de uso
  --schema      Mostrar schema del resultado
  --explain     Explicar el comando
  --json        Salida en JSON
  --jq <expr>   Filtrar resultado con expresión jq
`
  );

  return showRouteCmd;
}
