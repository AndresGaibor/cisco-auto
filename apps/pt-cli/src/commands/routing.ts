#!/usr/bin/env bun
/**
 * Comando routing - Configurar routing en dispositivos Cisco
 * Thin CLI: solo parsea flags y delega a pt-control/use-cases
 */

import { Command } from 'commander';

import type { CliResult } from '../contracts/cli-result.js';
import { createSuccessResult, createErrorResult } from '../contracts/cli-result.js';
import type { CommandMeta } from '../contracts/command-meta.js';

import { runCommand } from '../application/run-command.js';
import { renderCliResult } from '../ux/renderers.js';
import { printExamples } from '../ux/examples.js';
import { buildFlags, parseGlobalOptions } from '../flags-utils.js';

import {
  executeStaticRoute,
  executeOspfEnable,
  executeOspfAddNetwork,
  executeEigrpEnable,
  executeBgpEnable,
  validarCIDR,
  parseEnteroObligatorio,
  type RoutingResult,
} from '@cisco-auto/pt-control/application/routing';

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

export function createRoutingCommand(): Command {
  const command = new Command('routing')
    .description('Comandos para configurar routing en dispositivos Cisco')
    .option('--examples', 'Mostrar ejemplos de uso', false)
    .option('--explain', 'Explicar qué hace el comando', false)
    .option('--plan', 'Mostrar plan de ejecución sin ejecutar', false);

  // routing static add
  const staticAddCmd = new Command('add')
    .description('Agregar una ruta estática')
    .requiredOption('--device <name>', 'Nombre del dispositivo')
    .requiredOption('--network <cidr>', 'Red destino en formato CIDR')
    .requiredOption('--next-hop <ip>', 'Siguiente salto o null0')
    .option('--examples', 'Mostrar ejemplos', false)
    .option('--explain', 'Explicar', false)
    .option('--plan', 'Mostrar plan', false)
    .action(async (options) => {
      const { examples, explain, plan } = parseGlobalOptions();
      if (examples) { console.log(printExamples(ROUTING_META)); return; }
      if (explain) { console.log(ROUTING_META.longDescription ?? ROUTING_META.summary); return; }
      if (plan) { console.log('Plan: 1. Validar CIDR y next-hop, 2. Generar comandos IOS, 3. Aplicar'); return; }

      const flags = buildFlags({ examples, explain, plan });
      const result = await runCommand({
        action: 'routing.static.add', meta: ROUTING_META, flags,
        payloadPreview: { device: options.device, network: options.network, nextHop: options.nextHop },
        execute: async (ctx) => {
          const routingResult = executeStaticRoute({ deviceName: options.device, network: options.network, nextHop: options.nextHop });
          if (!routingResult.ok) return createErrorResult('routing.static.add', { message: routingResult.error.message });
          await ctx.controller.start();
          try {
            await ctx.controller.configIos(options.device, routingResult.data.commands);
            await ctx.logPhase('verify', { device: options.device });
            return createSuccessResult('routing.static.add', routingResult.data, { advice: [`Usa pt show ip-route ${options.device} para verificar`] });
          } finally { await ctx.controller.stop(); }
        },
      });
      renderResult(result, flags);
    });

  const staticCommand = new Command('static').description('Configurar rutas estáticas').addCommand(staticAddCmd);

  // routing ospf enable
  const ospfEnableCmd = new Command('enable')
    .description('Habilitar OSPF en un dispositivo')
    .requiredOption('--device <name>', 'Nombre del dispositivo')
    .requiredOption('--process-id <id>', 'ID del proceso OSPF')
    .option('--examples', 'Mostrar ejemplos', false)
    .option('--explain', 'Explicar', false)
    .option('--plan', 'Mostrar plan', false)
    .action(async (options) => {
      const { examples, explain, plan } = parseGlobalOptions();
      if (examples) { console.log(printExamples(ROUTING_META)); return; }
      if (explain) { console.log(ROUTING_META.longDescription ?? ROUTING_META.summary); return; }
      if (plan) { console.log('Plan: 1. Habilitar OSPF proceso, 2. Aplicar al dispositivo'); return; }

      const flags = buildFlags({ examples, explain, plan });
      const result = await runCommand({
        action: 'routing.ospf.enable', meta: ROUTING_META, flags,
        payloadPreview: { device: options.device, processId: options.processId },
        execute: async (ctx) => {
          try {
            const processId = parseEnteroObligatorio(options.processId, 'El process-id');
            const routingResult = executeOspfEnable({ deviceName: options.device, processId });
            if (!routingResult.ok) return createErrorResult('routing.ospf.enable', { message: routingResult.error.message });
            await ctx.controller.start();
            try {
              await ctx.controller.configIos(options.device, routingResult.data.commands);
              await ctx.logPhase('verify', { device: options.device });
              return createSuccessResult('routing.ospf.enable', routingResult.data);
            } finally { await ctx.controller.stop(); }
          } catch (error) {
            return createErrorResult('routing.ospf.enable', { message: error instanceof Error ? error.message : String(error) });
          }
        },
      });
      renderResult(result, flags);
    });

  // routing ospf add-network
  const ospfAddNetCmd = new Command('add-network')
    .description('Agregar una red a OSPF')
    .requiredOption('--device <name>', 'Nombre del dispositivo')
    .requiredOption('--network <cidr>', 'Red en formato CIDR')
    .requiredOption('--area <id>', 'Área OSPF')
    .action(async (options) => {
      const { examples, plan } = parseGlobalOptions();
      if (examples) { console.log(printExamples(ROUTING_META)); return; }
      if (plan) { console.log('Plan: 1. Agregar red al área OSPF, 2. Aplicar al dispositivo'); return; }

      const flags = buildFlags({ examples, plan });
      const result = await runCommand({
        action: 'routing.ospf.add-network', meta: ROUTING_META, flags,
        payloadPreview: { device: options.device, network: options.network, area: options.area },
        execute: async (ctx) => {
          try {
            if (!validarCIDR(options.network)) return createErrorResult('routing.ospf.add-network', { message: `La red debe tener formato CIDR válido: ${options.network}` });
            const area = /^\d+$/.test(options.area) ? parseEnteroObligatorio(options.area, 'El área') : options.area;
            const routingResult = executeOspfAddNetwork({ deviceName: options.device, network: options.network, area, processId: 1 });
            if (!routingResult.ok) return createErrorResult('routing.ospf.add-network', { message: routingResult.error.message });
            await ctx.controller.start();
            try {
              await ctx.controller.configIos(options.device, routingResult.data.commands);
              return createSuccessResult('routing.ospf.add-network', { device: options.device, network: options.network, area: String(area) });
            } finally { await ctx.controller.stop(); }
          } catch (error) {
            return createErrorResult('routing.ospf.add-network', { message: error instanceof Error ? error.message : String(error) });
          }
        },
      });
      renderResult(result, flags);
    });

  const ospfCommand = new Command('ospf').description('Configurar OSPF').addCommand(ospfEnableCmd).addCommand(ospfAddNetCmd);

  // routing eigrp enable
  const eigrpEnableCmd = new Command('enable')
    .description('Habilitar EIGRP en un dispositivo')
    .requiredOption('--device <name>', 'Nombre del dispositivo')
    .requiredOption('--as <number>', 'Número de sistema autónomo')
    .option('--examples', 'Mostrar ejemplos', false)
    .option('--explain', 'Explicar', false)
    .option('--plan', 'Mostrar plan', false)
    .action(async (options) => {
      const { examples, explain, plan } = parseGlobalOptions();
      if (examples) { console.log(printExamples(ROUTING_META)); return; }

      const flags = buildFlags({ examples, explain, plan });
      const result = await runCommand({
        action: 'routing.eigrp.enable', meta: ROUTING_META, flags,
        payloadPreview: { device: options.device, as: options.as },
        execute: async (ctx) => {
          try {
            const autonomousSystem = parseEnteroObligatorio(options.as, 'El AS');
            const routingResult = executeEigrpEnable({ deviceName: options.device, asn: autonomousSystem });
            if (!routingResult.ok) return createErrorResult('routing.eigrp.enable', { message: routingResult.error.message });
            await ctx.controller.start();
            try {
              await ctx.controller.configIos(options.device, routingResult.data.commands);
              return createSuccessResult('routing.eigrp.enable', routingResult.data);
            } finally { await ctx.controller.stop(); }
          } catch (error) {
            return createErrorResult('routing.eigrp.enable', { message: error instanceof Error ? error.message : String(error) });
          }
        },
      });
      renderResult(result, flags);
    });

  const eigrpCommand = new Command('eigrp').description('Configurar EIGRP').addCommand(eigrpEnableCmd);

  // routing bgp enable
  const bgpEnableCmd = new Command('enable')
    .description('Habilitar BGP en un dispositivo')
    .requiredOption('--device <name>', 'Nombre del dispositivo')
    .requiredOption('--as <number>', 'Número de sistema autónomo')
    .option('--examples', 'Mostrar ejemplos', false)
    .option('--explain', 'Explicar', false)
    .option('--plan', 'Mostrar plan', false)
    .action(async (options) => {
      const { examples, explain, plan } = parseGlobalOptions();
      if (examples) { console.log(printExamples(ROUTING_META)); return; }

      const flags = buildFlags({ examples, explain, plan });
      const result = await runCommand({
        action: 'routing.bgp.enable', meta: ROUTING_META, flags,
        payloadPreview: { device: options.device, as: options.as },
        execute: async (ctx) => {
          try {
            const autonomousSystem = parseEnteroObligatorio(options.as, 'El AS');
            const routingResult = executeBgpEnable({ deviceName: options.device, asn: autonomousSystem });
            if (!routingResult.ok) return createErrorResult('routing.bgp.enable', { message: routingResult.error.message });
            await ctx.controller.start();
            try {
              await ctx.controller.configIos(options.device, routingResult.data.commands);
              return createSuccessResult('routing.bgp.enable', routingResult.data);
            } finally { await ctx.controller.stop(); }
          } catch (error) {
            return createErrorResult('routing.bgp.enable', { message: error instanceof Error ? error.message : String(error) });
          }
        },
      });
      renderResult(result, flags);
    });

  const bgpCommand = new Command('bgp').description('Configurar BGP').addCommand(bgpEnableCmd);

  command.addCommand(staticCommand);
  command.addCommand(ospfCommand);
  command.addCommand(eigrpCommand);
  command.addCommand(bgpCommand);

  return command;
}

function renderResult(result: CliResult, flags: { output: string; quiet: boolean }): void {
  const output = renderCliResult(result, flags.output);
  if (!flags.quiet || !result.ok) console.log(output);
  if (!result.ok) process.exit(1);
}