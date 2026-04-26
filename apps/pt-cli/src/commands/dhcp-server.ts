#!/usr/bin/env bun
/**
 * Comando dhcp-server - Configuración y inspección de servidores DHCP
 * Thin CLI que delega lógica a pt-control/application/dhcp-server
 */

import { Command } from 'commander';
import chalk from 'chalk';

import type { CliResult } from '../contracts/cli-result.js';
import { createSuccessResult, createErrorResult } from '../contracts/cli-result.js';
import type { CommandMeta } from '../contracts/command-meta.js';

import { runCommand } from '../application/run-command.js';
import { printExamples } from '../ux/examples.js';
import { buildFlags, parseGlobalOptions } from '../flags-utils.js';
import { formatNextSteps } from '../ux/next-steps.js';

import {
  applyDhcpServerConfig,
  inspectDhcpServer,
  parsePool,
  type DhcpPoolConfig,
  type DhcpServerApplyResult,
  type DhcpServerInspectResult,
} from '@cisco-auto/pt-control/application/dhcp-server';

export const DHCP_SERVER_META: CommandMeta = {
  id: 'dhcp-server',
  summary: 'Configurar o inspeccionar servidores DHCP en dispositivos',
  longDescription: 'Permite configurar pools DHCP, habilitar/deshabilitar el servicio DHCP, agregar rangos de exclusión, e inspeccionar el estado DHCP de un dispositivo.',
  examples: [
    { command: 'pt dhcp-server apply R1 --enabled true', description: 'Habilitar servicio DHCP en R1' },
    { command: 'pt dhcp-server apply R1 --pool "LAN,192.168.1.0,255.255.255.0,192.168.1.1"', description: 'Crear pool DHCP LAN en R1' },
    { command: 'pt dhcp-server apply R1 --exclude "192.168.1.1-192.168.1.10"', description: 'Excluir rango de direcciones' },
    { command: 'pt dhcp-server apply R1 --enabled true --pool "LAN,192.168.1.0,255.255.255.0,192.168.1.1" --pool "WIFI,192.168.2.0,255.255.255.0,192.168.2.1"', description: 'Configurar múltiples pools DHCP' },
    { command: 'pt dhcp-server inspect R1', description: 'Inspeccionar estado DHCP de R1' },
    { command: 'pt dhcp-server inspect R1 --json', description: 'Inspeccionar estado DHCP en formato JSON' },
    { command: 'pt dhcp-server inspect R1 --port FastEthernet0/1', description: 'Inspeccionar estado DHCP en puerto específico' },
  ],
  related: ['pt dhcp-server apply', 'pt dhcp-server inspect', 'pt config-host', 'pt show ip-int-brief'],
  nextSteps: ['pt dhcp-server inspect <device>', 'pt show ip-int-brief <device>'],
  tags: ['dhcp', 'server', 'network', 'pool', 'ip'],
  supportsVerify: false,
  supportsJson: true,
  supportsPlan: true,
  supportsExplain: true,
  requiresPT: true,
};

function renderResult(result: CliResult, flags: { output: string; quiet: boolean }): void {
  if (!flags.quiet || !result.ok) {
    const output = result.ok
      ? JSON.stringify(result.data, null, 2)
      : `Error: ${result.error?.message}`;
    console.log(output);
  }
  if (!result.ok) process.exit(1);
}

export function createDhcpServerCommand(): Command {
  const cmd = new Command('dhcp-server')
    .description('Configurar o inspeccionar servidores DHCP')
    .addCommand(createApplyCommand())
    .addCommand(createInspectCommand())
    .option('--examples', 'Mostrar ejemplos de uso y salir', false)
    .option('--schema', 'Mostrar schema JSON del resultado y salir', false)
    .option('--explain', 'Explicar qué hace el comando y salir', false)
    .action((options) => {
      const { examples, schema, explain } = parseGlobalOptions();
      if (examples) { console.log(printExamples(DHCP_SERVER_META)); return; }
      if (schema) { console.log(JSON.stringify(DHCP_SERVER_META, null, 2)); return; }
      if (explain) { console.log(DHCP_SERVER_META.longDescription ?? DHCP_SERVER_META.summary); return; }
      cmd.help();
    });

  return cmd;
}

function createApplyCommand(): Command {
  return new Command('apply')
    .description('Aplicar configuración DHCP a un dispositivo')
    .argument('<device>', 'Nombre del dispositivo (ej: R1, Router1)')
    .option('--enabled <true|false>', 'Habilitar o deshabilitar servicio DHCP')
    .option('--port <name>', 'Nombre del puerto (default: FastEthernet0)', 'FastEthernet0')
    .option('--pool <name,network,mask,router>', 'Agregar pool DHCP (puede especificarse múltiples veces)')
    .option('--exclude <start-end>', 'Rango de direcciones excluido (puede especificarse múltiples veces)')
    .option('--examples', 'Mostrar ejemplos de uso y salir', false)
    .option('--schema', 'Mostrar schema JSON del resultado y salir', false)
    .option('--explain', 'Explicar qué hace el comando y salir', false)
    .option('--plan', 'Mostrar plan de ejecución sin ejecutar', false)
    .action(async (deviceName: string, options) => {
      const { examples, schema, explain, plan } = parseGlobalOptions();
      if (examples) { console.log(printExamples(DHCP_SERVER_META)); return; }
      if (schema) { console.log(JSON.stringify(DHCP_SERVER_META, null, 2)); return; }
      if (explain) { console.log(DHCP_SERVER_META.longDescription ?? DHCP_SERVER_META.summary); return; }
      if (plan) {
        console.log('Plan de ejecución:');
        console.log(`  1. Seleccionar dispositivo: ${deviceName}`);
        console.log(`  2. Puerto: ${options.port ?? 'FastEthernet0'}`);
        console.log(`  3. Enabled: ${options.enabled ?? 'no especificado'}`);
        console.log(`  4. Ejecutar configuración en Packet Tracer`);
        return;
      }

      const enabled = options.enabled !== undefined
        ? options.enabled === 'true'
        : undefined;

      if (options.enabled !== undefined && options.enabled !== 'true' && options.enabled !== 'false') {
        console.error('Error: --enabled debe ser "true" o "false"');
        process.exit(1);
      }

      const poolValues = options.pool
        ? Array.isArray(options.pool) ? options.pool : [options.pool]
        : [];
      const excludeValues = options.exclude
        ? Array.isArray(options.exclude) ? options.exclude : [options.exclude]
        : [];

      const pools: DhcpPoolConfig[] = [];
      for (const poolStr of poolValues) {
        try {
          pools.push(parsePool(poolStr));
        } catch (err) {
          console.error(`Error: ${(err as Error).message}`);
          process.exit(1);
        }
      }

      const excludedRanges: string[] = [...excludeValues];
      const port = options.port ?? 'FastEthernet0';

      const flags = buildFlags({ json: false });
      const result = await runCommand({
        action: 'dhcp-server.apply', meta: DHCP_SERVER_META, flags,
        payloadPreview: { device: deviceName, port, enabled, pools, excludedRanges },
        execute: async (ctx): Promise<CliResult<DhcpServerApplyResult>> => {
          const execution = await applyDhcpServerConfig(
            ctx.controller,
            deviceName,
            enabled ?? true,
            port,
            pools,
            excludedRanges,
          );
          if (!execution.ok) return createErrorResult('dhcp-server.apply', execution.error);
          return createSuccessResult('dhcp-server.apply', execution.data, { advice: execution.advice });
        },
      });
      renderResult(result, flags);
      if (result.ok) {
        const nextSteps = [
          `pt dhcp-server inspect ${deviceName}`,
          `pt show ip-int-brief ${deviceName}`,
        ];
        console.log(formatNextSteps(nextSteps));
      }
    });
}

function createInspectCommand(): Command {
  const globalJson = process.argv.includes('--json');

  return new Command('inspect')
    .description('Inspeccionar estado DHCP de un dispositivo')
    .argument('<device>', 'Nombre del dispositivo (ej: R1, Router1)')
    .option('--port <name>', 'Nombre del puerto (default: FastEthernet0)', 'FastEthernet0')
    .option('--json', 'Salida en formato JSON')
    .option('--examples', 'Mostrar ejemplos de uso y salir', false)
    .option('--schema', 'Mostrar schema JSON del resultado y salir', false)
    .option('--explain', 'Explicar qué hace el comando y salir', false)
    .action(async (deviceName: string, options) => {
      const { examples, schema, explain } = parseGlobalOptions();
      if (examples) { console.log(printExamples(DHCP_SERVER_META)); return; }
      if (schema) { console.log(JSON.stringify(DHCP_SERVER_META, null, 2)); return; }
      if (explain) { console.log(DHCP_SERVER_META.longDescription ?? DHCP_SERVER_META.summary); return; }

      const flags = buildFlags({ json: globalJson });
      const port = options.port ?? 'FastEthernet0';

      const result = await runCommand({
        action: 'dhcp-server.inspect', meta: DHCP_SERVER_META, flags,
        payloadPreview: { device: deviceName, port },
        execute: async (ctx): Promise<CliResult<DhcpServerInspectResult>> => {
          const execution = await inspectDhcpServer(ctx.controller, deviceName, port);
          if (!execution.ok) return createErrorResult('dhcp-server.inspect', execution.error);
          return createSuccessResult('dhcp-server.inspect', execution.data);
        },
      });

      if (globalJson) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }

      renderResult(result, flags);
      if (result.ok && result.data) {
        const data = result.data;
        console.log(`\n📶 DHCP Server - ${data.device}:`);
        console.log('━'.repeat(60));
        console.log(`Puerto: ${data.port}`);
        console.log(`Habilitado: ${data.enabled ? chalk.green('Sí') : chalk.red('No')}`);

        if (data.pools.length > 0) {
          console.log(`\nPools DHCP (${data.pools.length}):`);
          data.pools.forEach((pool, i) => {
            console.log(`  ${i + 1}. ${pool.name}`);
            console.log(`     Red: ${pool.network}/${pool.mask}`);
            console.log(`     Router: ${pool.router}`);
            if (pool.leases !== undefined) {
              console.log(`     Leases activos: ${pool.leases}`);
            }
          });
        }

        if (data.excludedRanges.length > 0) {
          console.log(`\nRangos excluidos:`);
          data.excludedRanges.forEach((range, i) => {
            console.log(`  ${i + 1}. ${range}`);
          });
        }

        const nextSteps = [
          `pt dhcp-server apply ${deviceName}`,
          `pt show ip-int-brief ${deviceName}`,
        ];
        console.log(formatNextSteps(nextSteps));
      }
    });
}