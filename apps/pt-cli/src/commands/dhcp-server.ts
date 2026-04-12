#!/usr/bin/env bun
/**
 * Comando dhcp-server - Configuración y inspección de servidores DHCP
 */

import { Command } from 'commander';
import type { PTController } from '@cisco-auto/pt-control';
import chalk from 'chalk';

import type { CliResult } from '../contracts/cli-result.js';
import { createSuccessResult, createErrorResult } from '../contracts/cli-result.js';
import type { CommandMeta } from '../contracts/command-meta.js';
import type { GlobalFlags } from '../flags.js';

import { runCommand } from '../application/run-command.js';
import { printExamples } from '../ux/examples.js';
import { formatNextSteps } from '../ux/next-steps.js';

export const DHCP_SERVER_META: CommandMeta = {
  id: 'dhcp-server',
  summary: 'Configurar o inspeccionar servidores DHCP en dispositivos',
  longDescription: 'Permite configurar pools DHCP, habilitar/deshabilitar el servicio DHCP, agregar rangos de exclusión, e inspeccionar el estado DHCP de un dispositivo.',
  examples: [
    {
      command: 'pt dhcp-server apply R1 --enabled true',
      description: 'Habilitar servicio DHCP en R1'
    },
    {
      command: 'pt dhcp-server apply R1 --pool "LAN,192.168.1.0,255.255.255.0,192.168.1.1"',
      description: 'Crear pool DHCP LAN en R1'
    },
    {
      command: 'pt dhcp-server apply R1 --exclude "192.168.1.1-192.168.1.10"',
      description: 'Excluir rango de direcciones'
    },
    {
      command: 'pt dhcp-server apply R1 --enabled true --pool "LAN,192.168.1.0,255.255.255.0,192.168.1.1" --pool "WIFI,192.168.2.0,255.255.255.0,192.168.2.1"',
      description: 'Configurar múltiples pools DHCP'
    },
    {
      command: 'pt dhcp-server inspect R1',
      description: 'Inspeccionar estado DHCP de R1'
    },
    {
      command: 'pt dhcp-server inspect R1 --json',
      description: 'Inspeccionar estado DHCP en formato JSON'
    },
    {
      command: 'pt dhcp-server inspect R1 --port FastEthernet0/1',
      description: 'Inspeccionar estado DHCP en puerto específico'
    }
  ],
  related: [
    'pt dhcp-server apply',
    'pt dhcp-server inspect',
    'pt config-host',
    'pt show ip-int-brief'
  ],
  nextSteps: [
    'pt dhcp-server inspect <device>',
    'pt show ip-int-brief <device>'
  ],
  tags: ['dhcp', 'server', 'network', 'pool', 'ip'],
  supportsVerify: false,
  supportsJson: true,
  supportsPlan: true,
  supportsExplain: true,
  requiresPT: true
};

export interface DhcpPoolConfig {
  name: string;
  network: string;
  mask: string;
  router: string;
}

export interface DhcpServerApplyResult {
  device: string;
  enabled: boolean;
  port: string;
  pools: DhcpPoolConfig[];
  excludedRanges: string[];
}

export interface DhcpServerInspectResult {
  device: string;
  port: string;
  enabled: boolean;
  pools: Array<{
    name: string;
    network: string;
    mask: string;
    router: string;
    leases?: number;
  }>;
  excludedRanges: string[];
  activeLeases?: number;
}

interface ApplyOptions {
  enabled?: string;
  port?: string;
  pool?: string[];
  exclude?: string[];
  examples?: boolean;
  schema?: boolean;
  explain?: boolean;
  plan?: boolean;
}

interface InspectOptions {
  port?: string;
  json?: boolean;
  examples?: boolean;
  schema?: boolean;
  explain?: boolean;
}

function parsePool(poolStr: string): DhcpPoolConfig {
  const parts = poolStr.split(',');
  if (parts.length !== 4) {
    throw new Error(`Pool inválido: ${poolStr}. Formato esperado: name,network,mask,router`);
  }
  const name = parts[0]!.trim();
  const network = parts[1]!.trim();
  const mask = parts[2]!.trim();
  const router = parts[3]!.trim();
  return { name, network, mask, router };
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
      const globalExamples = process.argv.includes('--examples');
      const globalSchema = process.argv.includes('--schema');
      const globalExplain = process.argv.includes('--explain');

      if (globalExamples) {
        console.log(printExamples(DHCP_SERVER_META));
        return;
      }

      if (globalSchema) {
        console.log(JSON.stringify(DHCP_SERVER_META, null, 2));
        return;
      }

      if (globalExplain) {
        console.log(DHCP_SERVER_META.longDescription ?? DHCP_SERVER_META.summary);
        return;
      }

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
    .action(async (deviceName: string, options: ApplyOptions) => {
      const globalExamples = process.argv.includes('--examples');
      const globalSchema = process.argv.includes('--schema');
      const globalExplain = process.argv.includes('--explain');
      const globalPlan = process.argv.includes('--plan');

      const poolValues = options.pool
        ? Array.isArray(options.pool) ? options.pool : [options.pool]
        : [];
      const excludeValues = options.exclude
        ? Array.isArray(options.exclude) ? options.exclude : [options.exclude]
        : [];

      if (globalExamples) {
        console.log(printExamples(DHCP_SERVER_META));
        return;
      }

      if (globalSchema) {
        console.log(JSON.stringify(DHCP_SERVER_META, null, 2));
        return;
      }

      if (globalExplain) {
        console.log(DHCP_SERVER_META.longDescription ?? DHCP_SERVER_META.summary);
        return;
      }

      if (globalPlan) {
        console.log('Plan de ejecución:');
        console.log(`  1. Seleccionar dispositivo: ${deviceName}`);
        console.log(`  2. Puerto: ${options.port ?? 'FastEthernet0'}`);
        console.log(`  3. Enabled: ${options.enabled ?? 'no especificado'}`);
        if (poolValues.length) {
          console.log(`  4. Pools DHCP:`);
          poolValues.forEach((p, i) => console.log(`     ${i + 1}. ${p}`));
        }
        if (excludeValues.length) {
          console.log(`  5. Rangos excluidos:`);
          excludeValues.forEach((r, i) => console.log(`     ${i + 1}. ${r}`));
        }
        console.log('  6. Ejecutar configuración en Packet Tracer');
        return;
      }

      if (!deviceName) {
        console.error('Error: Debes especificar el dispositivo');
        process.exit(1);
      }

      const enabled = options.enabled !== undefined
        ? options.enabled === 'true'
        : undefined;

      if (options.enabled !== undefined && options.enabled !== 'true' && options.enabled !== 'false') {
        console.error('Error: --enabled debe ser "true" o "false"');
        process.exit(1);
      }

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

      const flags: GlobalFlags = {
        json: false,
        jq: null,
        output: 'text',
        verbose: false,
        quiet: false,
        trace: false,
        tracePayload: false,
        traceResult: false,
        traceDir: null,
        traceBundle: false,
        traceBundlePath: null,
        sessionId: null,
        examples: globalExamples,
        schema: globalSchema,
        explain: globalExplain,
        plan: globalPlan,
        verify: false,
        timeout: null,
        noTimeout: false,
      };

      const result = await runCommand<DhcpServerApplyResult>({
        action: 'dhcp-server.apply',
        meta: DHCP_SERVER_META,
        flags,
        payloadPreview: {
          device: deviceName,
          port: options.port ?? 'FastEthernet0',
          enabled,
          pools,
          excludedRanges,
        },
        execute: async (ctx): Promise<CliResult<DhcpServerApplyResult>> => {
          const { controller } = ctx;

          await controller.start();

          try {
            await controller.configureDhcpServer(deviceName, {
              enabled: enabled ?? true,
              port: options.port ?? 'FastEthernet0',
              pools: pools.map((p) => ({
                name: p.name,
                network: p.network,
                mask: p.mask,
                defaultRouter: p.router,
              })),
              excluded: excludedRanges.map((r) => {
                const [start, end] = r.split('-');
                return { start, end };
              }),
            });

            const resultData: DhcpServerApplyResult = {
              device: deviceName,
              enabled: enabled ?? true,
              port: options.port ?? 'FastEthernet0',
              pools,
              excludedRanges,
            };

            return createSuccessResult('dhcp-server.apply', resultData);
          } finally {
            await controller.stop();
          }
        },
      });

      if (!result.ok) {
        console.error(`\n❌ Error: ${result.error?.message || 'Error desconocido'}`);
        if (result.error?.details) {
          console.error('Detalles:', result.error.details);
        }
        process.exit(1);
      }

      if (result.ok && result.data) {
        const nextSteps = [
          `pt dhcp-server inspect ${deviceName}`,
          `pt show ip-int-brief ${deviceName}`,
        ];
        console.log(formatNextSteps(nextSteps));
      }
    });
}

function createInspectCommand(): Command {
  return new Command('inspect')
    .description('Inspeccionar estado DHCP de un dispositivo')
    .argument('<device>', 'Nombre del dispositivo (ej: R1, Router1)')
    .option('--port <name>', 'Nombre del puerto (default: FastEthernet0)', 'FastEthernet0')
    .option('--json', 'Salida en formato JSON')
    .option('--examples', 'Mostrar ejemplos de uso y salir', false)
    .option('--schema', 'Mostrar schema JSON del resultado y salir', false)
    .option('--explain', 'Explicar qué hace el comando y salir', false)
    .action(async (deviceName: string, options: InspectOptions) => {
      const globalExamples = process.argv.includes('--examples');
      const globalSchema = process.argv.includes('--schema');
      const globalExplain = process.argv.includes('--explain');
      const globalJson = process.argv.includes('--json');

      if (globalExamples) {
        console.log(printExamples(DHCP_SERVER_META));
        return;
      }

      if (globalSchema) {
        console.log(JSON.stringify(DHCP_SERVER_META, null, 2));
        return;
      }

      if (globalExplain) {
        console.log(DHCP_SERVER_META.longDescription ?? DHCP_SERVER_META.summary);
        return;
      }

      if (!deviceName) {
        console.error('Error: Debes especificar el dispositivo');
        process.exit(1);
      }

      const flags: GlobalFlags = {
        json: globalJson,
        jq: null,
        output: 'text',
        verbose: false,
        quiet: false,
        trace: false,
        tracePayload: false,
        traceResult: false,
        traceDir: null,
        traceBundle: false,
        traceBundlePath: null,
        sessionId: null,
        examples: globalExamples,
        schema: globalSchema,
        explain: globalExplain,
        plan: false,
        verify: false,
        timeout: null,
        noTimeout: false,
      };

      const result = await runCommand<DhcpServerInspectResult>({
        action: 'dhcp-server.inspect',
        meta: DHCP_SERVER_META,
        flags,
        payloadPreview: {
          device: deviceName,
          port: options.port ?? 'FastEthernet0',
        },
        execute: async (ctx): Promise<CliResult<DhcpServerInspectResult>> => {
          const { controller } = ctx;

          await controller.start();

          try {
            const inspectResult = await controller.inspectDhcpServer(deviceName);

            const resultData: DhcpServerInspectResult = {
              device: deviceName,
              port: options.port ?? 'FastEthernet0',
              enabled: inspectResult?.enabled ?? true,
              pools: (inspectResult?.pools ?? []).map((p) => ({
                name: p.name,
                network: p.network,
                mask: p.mask ?? p.subnetMask ?? '',
                router: p.defaultRouter ?? '',
              })),
              excludedRanges: inspectResult?.excludedAddresses?.map((e) => `${e.start}-${e.end}`) ?? [],
            };

            return createSuccessResult('dhcp-server.inspect', resultData);
          } finally {
            await controller.stop();
          }
        },
      });

      if (globalJson) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }

      if (!result.ok) {
        console.error(`\n❌ Error: ${result.error?.message || 'Error desconocido'}`);
        if (result.error?.details) {
          console.error('Detalles:', result.error.details);
        }
        process.exit(1);
      }

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
