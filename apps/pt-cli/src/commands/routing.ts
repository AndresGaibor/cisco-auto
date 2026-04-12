#!/usr/bin/env bun
/**
 * Comando routing - Configurar routing en dispositivos Cisco
 * Migrado al patrón runCommand con CliResult
 */

import { Command } from 'commander';
import chalk from 'chalk';

import type { CliResult } from '../contracts/cli-result.js';
import { createSuccessResult, createErrorResult } from '../contracts/cli-result.js';
import type { CommandMeta } from '../contracts/command-meta.js';
import type { GlobalFlags } from '../flags.js';

import { runCommand } from '../application/run-command.js';
import { renderCliResult } from '../ux/renderers.js';
import { printExamples } from '../ux/examples.js';
import { generateRoutingCommands, type RoutingConfigInput } from '@cisco-auto/kernel/plugins/routing';

const IPV4_REGEX = /^(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
const CIDR_REGEX = /^(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}\/(?:[0-9]|[12]\d|3[0-2])$/;

const ROUTING_EXAMPLES = [
  { command: 'pt routing static add --device R1 --network 192.168.10.0/24 --next-hop 10.0.0.1', description: 'Agregar ruta estática' },
  { command: 'pt routing ospf enable --device R1 --process-id 1', description: 'Habilitar OSPF' },
  { command: 'pt routing eigrp enable --device R1 --as 100', description: 'Habilitar EIGRP' },
  { command: 'pt routing bgp enable --device R1 --as 65001', description: 'Habilitar BGP' },
];

const ROUTING_META: CommandMeta = {
  id: 'routing',
  summary: 'Configurar routing en dispositivos Cisco',
  longDescription: 'Comandos para configurar diferentes protocolos de routing: estático, OSPF, EIGRP, BGP.',
  examples: ROUTING_EXAMPLES,
  related: ['config-ios', 'show', 'vlan'],
  supportsVerify: true,
  supportsJson: true,
  supportsPlan: true,
  supportsExplain: true,
};

function validarIPv4(valor: string): boolean {
  return IPV4_REGEX.test(valor);
}

function validarCIDR(valor: string): boolean {
  return CIDR_REGEX.test(valor);
}

function parseEnteroObligatorio(valor: string, etiqueta: string): number {
  if (!/^\d+$/.test(valor.trim())) {
    throw new Error(`${etiqueta} debe ser un número entero válido`);
  }
  const numero = Number.parseInt(valor, 10);
  if (!Number.isInteger(numero) || numero <= 0) {
    throw new Error(`${etiqueta} debe ser un número entero válido`);
  }
  return numero;
}

function cidrToSubnetMask(cidr: string): string {
  if (cidr.includes('/')) {
    const bits = Number(cidr.split('/')[1]);
    if (Number.isNaN(bits) || bits < 0 || bits > 32) return '255.255.255.0';
    const mask = bits === 0 ? 0 : (~((1 << (32 - bits)) - 1) >>> 0);
    return `${(mask >>> 24) & 255}.${(mask >>> 16) & 255}.${(mask >>> 8) & 255}.${mask & 255}`;
  }
  return '255.255.255.0';
}

export function buildStaticRouteCommands(deviceName: string, network: string, nextHop: string): string[] {
  const mask = cidrToSubnetMask(network);
  const networkAddr = network.includes('/') ? (network.split('/')[0] ?? network) : network;
  const config: RoutingConfigInput = {
    deviceName,
    staticRoutes: [
      {
        network: networkAddr,
        mask,
        nextHop: nextHop === 'null0' ? 'null0' : nextHop,
      },
    ],
  };
  return generateRoutingCommands(config);
}

export function buildOspfEnableCommands(deviceName: string, processId: number): string[] {
  return [`router ospf ${processId}`, ' exit'];
}

export function buildOspfAddNetworkCommands(deviceName: string, processId: number, network: string, area: number | string): string[] {
  const [net, wildcard] = network.includes('/') ? parseCidrToNetworkWildcard(network) : [network, '0.0.0.255'];
  const config: RoutingConfigInput = {
    deviceName,
    ospf: {
      processId,
      areas: [{ areaId: area, networks: [{ network: net, wildcard }] }],
    },
  };
  return generateRoutingCommands(config);
}

function parseCidrToNetworkWildcard(cidr: string): [string, string] {
  const parts = cidr.split('/');
  const cidrBits = Number(parts[1]) || 24;
  const wildcardBits = 32 - cidrBits;
  const wildcardNum = (1 << wildcardBits) - 1;
  const octets = [0, 0, 0, 0];
  for (let i = 0; i < 4; i++) {
    const shift = 8 * (3 - i);
    octets[i] = (wildcardNum >>> shift) & 255;
  }
  return [parts[0] ?? cidr, octets.join('.')];
}

export function buildEigrpEnableCommands(deviceName: string, asn: number): string[] {
  return [`router eigrp ${asn}`, ' no auto-summary', ' exit'];
}

export function buildBgpEnableCommands(deviceName: string, asn: number): string[] {
  return [`router bgp ${asn}`, ' bgp log-neighbor-changes', ' exit'];
}

export function createRoutingCommand(): Command {
  const command = new Command('routing')
    .description('Comandos para configurar routing en dispositivos Cisco')
    .option('--examples', 'Mostrar ejemplos de uso', false)
    .option('--explain', 'Explicar qué hace el comando', false)
    .option('--plan', 'Mostrar plan de ejecución sin ejecutar', false);

  const staticCommand = new Command('static')
    .description('Configurar rutas estáticas')
    .option('--examples', 'Mostrar ejemplos', false)
    .option('--explain', 'Explicar', false)
    .option('--plan', 'Mostrar plan', false);

  staticCommand
    .command('add')
    .description('Agregar una ruta estática')
    .requiredOption('--device <name>', 'Nombre del dispositivo')
    .requiredOption('--network <cidr>', 'Red destino en formato CIDR')
    .requiredOption('--next-hop <ip>', 'Siguiente salto o null0')
    .option('--examples', 'Mostrar ejemplos', false)
    .option('--explain', 'Explicar', false)
    .option('--plan', 'Mostrar plan', false)
    .action(async (options) => {
      const globalExamples = process.argv.includes('--examples');
      const globalExplain = process.argv.includes('--explain');
      const globalPlan = process.argv.includes('--plan');

      if (globalExamples) {
        console.log(printExamples(ROUTING_META));
        return;
      }

      if (globalExplain) {
        console.log(ROUTING_META.longDescription ?? ROUTING_META.summary);
        return;
      }

      if (globalPlan) {
        console.log('Plan de ejecución:');
        console.log(`  1. Validar CIDR: ${options.network}`);
        console.log(`  2. Validar next-hop: ${options.nextHop}`);
        console.log(`  3. Generar comandos IOS`);
        console.log(`  4. Aplicar al dispositivo ${options.device}`);
        return;
      }

      const flags: GlobalFlags = {
        json: false, jq: null, output: 'text', verbose: false, quiet: false,
        trace: false, tracePayload: false, traceResult: false, traceDir: null,
        traceBundle: false, traceBundlePath: null, sessionId: null,
        examples: globalExamples, schema: false, explain: globalExplain, plan: globalPlan, verify: true,
        timeout: null, noTimeout: false,
      };

      const result = await runCommand({
        action: 'routing.static.add',
        meta: ROUTING_META,
        flags,
        payloadPreview: { device: options.device, network: options.network, nextHop: options.nextHop },
        execute: async (ctx): Promise<CliResult> => {
          try {
            if (!validarCIDR(options.network)) {
              return createErrorResult('routing.static.add', { message: `La red debe tener formato CIDR válido: ${options.network}` });
            }
            if (options.nextHop !== 'null0' && !validarIPv4(options.nextHop)) {
              return createErrorResult('routing.static.add', { message: `El next-hop debe ser una IPv4 válida o null0: ${options.nextHop}` });
            }

            const comandos = buildStaticRouteCommands(options.device, options.network, options.nextHop);

            await ctx.controller.start();
            try {
              await ctx.controller.configIos(options.device, comandos);
              await ctx.logPhase('verify', { device: options.device });
              return createSuccessResult('routing.static.add', {
                device: options.device,
                network: options.network,
                nextHop: options.nextHop,
                commands: comandos,
              }, { advice: [`Usa pt show ip-route ${options.device} para verificar`] });
            } finally {
              await ctx.controller.stop();
            }
          } catch (error) {
            return createErrorResult('routing.static.add', { message: error instanceof Error ? error.message : String(error) });
          }
        },
      });

      const output = renderCliResult(result, flags.output);
      if (!flags.quiet || !result.ok) console.log(output);
      if (!result.ok) process.exit(1);
    });

  const ospfCommand = new Command('ospf')
    .description('Configurar OSPF')
    .option('--examples', 'Mostrar ejemplos', false)
    .option('--explain', 'Explicar', false);

  ospfCommand
    .command('enable')
    .description('Habilitar OSPF en un dispositivo')
    .requiredOption('--device <name>', 'Nombre del dispositivo')
    .requiredOption('--process-id <id>', 'ID del proceso OSPF')
    .option('--examples', 'Mostrar ejemplos', false)
    .option('--explain', 'Explicar', false)
    .option('--plan', 'Mostrar plan', false)
    .action(async (options) => {
      const globalExamples = process.argv.includes('--examples');
      const globalExplain = process.argv.includes('--explain');
      const globalPlan = process.argv.includes('--plan');

      if (globalExamples) {
        console.log(printExamples(ROUTING_META));
        return;
      }

      if (globalExplain) {
        console.log(ROUTING_META.longDescription ?? ROUTING_META.summary);
        return;
      }

      if (globalPlan) {
        console.log('Plan de ejecución:');
        console.log(`  1. Habilitar OSPF proceso ${options.processId}`);
        console.log(`  2. Aplicar al dispositivo ${options.device}`);
        return;
      }

      const flags: GlobalFlags = {
        json: false, jq: null, output: 'text', verbose: false, quiet: false,
        trace: false, tracePayload: false, traceResult: false, traceDir: null,
        traceBundle: false, traceBundlePath: null, sessionId: null,
        examples: globalExamples, schema: false, explain: globalExplain, plan: globalPlan, verify: true,
        timeout: null, noTimeout: false,
      };

      const result = await runCommand({
        action: 'routing.ospf.enable',
        meta: ROUTING_META,
        flags,
        payloadPreview: { device: options.device, processId: options.processId },
        execute: async (ctx): Promise<CliResult> => {
          try {
            const processId = parseEnteroObligatorio(options.processId, 'El process-id');
            const comandos = buildOspfEnableCommands(options.device, processId);

            await ctx.controller.start();
            try {
              await ctx.controller.configIos(options.device, comandos);
              await ctx.logPhase('verify', { device: options.device });
              return createSuccessResult('routing.ospf.enable', {
                device: options.device,
                processId,
                commands: comandos,
              });
            } finally {
              await ctx.controller.stop();
            }
          } catch (error) {
            return createErrorResult('routing.ospf.enable', { message: error instanceof Error ? error.message : String(error) });
          }
        },
      });

      const output = renderCliResult(result, flags.output);
      if (!flags.quiet || !result.ok) console.log(output);
      if (!result.ok) process.exit(1);
    });

  ospfCommand
    .command('add-network')
    .description('Agregar una red a OSPF')
    .requiredOption('--device <name>', 'Nombre del dispositivo')
    .requiredOption('--network <cidr>', 'Red en formato CIDR')
    .requiredOption('--area <id>', 'Área OSPF')
    .action(async (options) => {
      const globalExamples = process.argv.includes('--examples');
      const globalPlan = process.argv.includes('--plan');

      if (globalExamples) {
        console.log(printExamples(ROUTING_META));
        return;
      }

      if (globalPlan) {
        console.log('Plan de ejecución:');
        console.log(`  1. Agregar red ${options.network} al área ${options.area}`);
        console.log(`  2. Aplicar al dispositivo ${options.device}`);
        return;
      }

      const flags: GlobalFlags = {
        json: false, jq: null, output: 'text', verbose: false, quiet: false,
        trace: false, tracePayload: false, traceResult: false, traceDir: null,
        traceBundle: false, traceBundlePath: null, sessionId: null,
        examples: globalExamples, schema: false, explain: false, plan: globalPlan, verify: true,
        timeout: null, noTimeout: false,
      };

      const result = await runCommand({
        action: 'routing.ospf.add-network',
        meta: ROUTING_META,
        flags,
        payloadPreview: { device: options.device, network: options.network, area: options.area },
        execute: async (ctx): Promise<CliResult> => {
          try {
            if (!validarCIDR(options.network)) {
              return createErrorResult('routing.ospf.add-network', { message: `La red debe tener formato CIDR válido: ${options.network}` });
            }
            const area = /^\d+$/.test(options.area) ? parseEnteroObligatorio(options.area, 'El área') : options.area;
            const processId = 1;
            const comandos = buildOspfAddNetworkCommands(options.device, processId, options.network, area);

            await ctx.controller.start();
            try {
              await ctx.controller.configIos(options.device, comandos);
              return createSuccessResult('routing.ospf.add-network', { device: options.device, network: options.network, area: String(area) });
            } finally {
              await ctx.controller.stop();
            }
          } catch (error) {
            return createErrorResult('routing.ospf.add-network', { message: error instanceof Error ? error.message : String(error) });
          }
        },
      });

      const output = renderCliResult(result, flags.output);
      if (!flags.quiet || !result.ok) console.log(output);
      if (!result.ok) process.exit(1);
    });

  const eigrpCommand = new Command('eigrp')
    .description('Configurar EIGRP')
    .option('--examples', 'Mostrar ejemplos', false);

  eigrpCommand
    .command('enable')
    .description('Habilitar EIGRP en un dispositivo')
    .requiredOption('--device <name>', 'Nombre del dispositivo')
    .requiredOption('--as <number>', 'Número de sistema autónomo')
    .option('--examples', 'Mostrar ejemplos', false)
    .option('--explain', 'Explicar', false)
    .option('--plan', 'Mostrar plan', false)
    .action(async (options) => {
      const globalExamples = process.argv.includes('--examples');
      const globalExplain = process.argv.includes('--explain');
      const globalPlan = process.argv.includes('--plan');

      if (globalExamples) {
        console.log(printExamples(ROUTING_META));
        return;
      }

      const flags: GlobalFlags = {
        json: false, jq: null, output: 'text', verbose: false, quiet: false,
        trace: false, tracePayload: false, traceResult: false, traceDir: null,
        traceBundle: false, traceBundlePath: null, sessionId: null,
        examples: globalExamples, schema: false, explain: globalExplain, plan: globalPlan, verify: true,
        timeout: null, noTimeout: false,
      };

      const result = await runCommand({
        action: 'routing.eigrp.enable',
        meta: ROUTING_META,
        flags,
        payloadPreview: { device: options.device, as: options.as },
        execute: async (ctx): Promise<CliResult> => {
          try {
            const autonomousSystem = parseEnteroObligatorio(options.as, 'El AS');
            const comandos = buildEigrpEnableCommands(options.device, autonomousSystem);

            await ctx.controller.start();
            try {
              await ctx.controller.configIos(options.device, comandos);
              return createSuccessResult('routing.eigrp.enable', { device: options.device, as: autonomousSystem, commands: comandos });
            } finally {
              await ctx.controller.stop();
            }
          } catch (error) {
            return createErrorResult('routing.eigrp.enable', { message: error instanceof Error ? error.message : String(error) });
          }
        },
      });

      const output = renderCliResult(result, flags.output);
      if (!flags.quiet || !result.ok) console.log(output);
      if (!result.ok) process.exit(1);
    });

  const bgpCommand = new Command('bgp')
    .description('Configurar BGP')
    .option('--examples', 'Mostrar ejemplos', false);

  bgpCommand
    .command('enable')
    .description('Habilitar BGP en un dispositivo')
    .requiredOption('--device <name>', 'Nombre del dispositivo')
    .requiredOption('--as <number>', 'Número de sistema autónomo')
    .option('--examples', 'Mostrar ejemplos', false)
    .option('--explain', 'Explicar', false)
    .option('--plan', 'Mostrar plan', false)
    .action(async (options) => {
      const globalExamples = process.argv.includes('--examples');
      const globalExplain = process.argv.includes('--explain');
      const globalPlan = process.argv.includes('--plan');

      if (globalExamples) {
        console.log(printExamples(ROUTING_META));
        return;
      }

      const flags: GlobalFlags = {
        json: false, jq: null, output: 'text', verbose: false, quiet: false,
        trace: false, tracePayload: false, traceResult: false, traceDir: null,
        traceBundle: false, traceBundlePath: null, sessionId: null,
        examples: globalExamples, schema: false, explain: globalExplain, plan: globalPlan, verify: true,
        timeout: null, noTimeout: false,
      };

      const result = await runCommand({
        action: 'routing.bgp.enable',
        meta: ROUTING_META,
        flags,
        payloadPreview: { device: options.device, as: options.as },
        execute: async (ctx): Promise<CliResult> => {
          try {
            const autonomousSystem = parseEnteroObligatorio(options.as, 'El AS');
            const comandos = buildBgpEnableCommands(options.device, autonomousSystem);

            await ctx.controller.start();
            try {
              await ctx.controller.configIos(options.device, comandos);
              return createSuccessResult('routing.bgp.enable', { device: options.device, as: autonomousSystem, commands: comandos });
            } finally {
              await ctx.controller.stop();
            }
          } catch (error) {
            return createErrorResult('routing.bgp.enable', { message: error instanceof Error ? error.message : String(error) });
          }
        },
      });

      const output = renderCliResult(result, flags.output);
      if (!flags.quiet || !result.ok) console.log(output);
      if (!result.ok) process.exit(1);
    });

  command.addCommand(staticCommand);
  command.addCommand(ospfCommand);
  command.addCommand(eigrpCommand);
  command.addCommand(bgpCommand);

  return command;
}
