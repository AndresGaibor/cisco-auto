#!/usr/bin/env bun
/**
 * Comando services - DHCP, NTP, Syslog
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
import { ServicesGenerator } from '@cisco-auto/core';

const SERVICES_EXAMPLES = [
  { command: 'pt services dhcp create --device R1 --pool MI_POOL --network 192.168.1.0/24', description: 'Crear pool DHCP' },
  { command: 'pt services ntp add-server --device R1 --server  pool.ntp.org', description: 'Configurar NTP' },
  { command: 'pt services syslog add-server --device R1 --server  192.168.1.100', description: 'Configurar Syslog' },
];

const SERVICES_META: CommandMeta = {
  id: 'services',
  summary: 'Configurar servicios de red (DHCP, NTP, Syslog)',
  longDescription: 'Comandos para configurar servicios básicos en routers Cisco: DHCP, NTP y Syslog.',
  examples: SERVICES_EXAMPLES,
  related: ['config-ios', 'routing', 'show'],
  supportsVerify: true,
  supportsJson: true,
  supportsPlan: true,
  supportsExplain: true,
};

function cidrToMask(cidr: number): string {
  const mask = (0xffffffff << (32 - cidr)) >>> 0;
  return [(mask >>> 24) & 0xff, (mask >>> 16) & 0xff, (mask >>> 8) & 0xff, mask & 0xff].join('.');
}

function parseNetwork(input: string): { network: string; subnetMask: string } {
  if (!input) return { network: '0.0.0.0', subnetMask: '255.255.255.0' };
  const parts = input.split('/');
  if (parts.length === 2) {
    const cidr = Number(parts[1]);
    const mask = Number.isFinite(cidr) ? cidrToMask(cidr) : '255.255.255.0';
    return { network: parts[0]!, subnetMask: mask };
  }
  return { network: input, subnetMask: '255.255.255.0' };
}

function buildDhcpCommands(poolName: string, networkCidr: string): string[] {
  const { network, subnetMask } = parseNetwork(networkCidr);
  const spec = { poolName, network, subnetMask } as any;
  const validation = (ServicesGenerator as any).validateDHCP(spec);
  if (!validation.valid) {
    throw new Error(`Invalid DHCP spec: ${validation.errors.join('; ')}`);
  }
  return ServicesGenerator.generateDHCP([spec]);
}

function buildNtpCommands(server: string): string[] {
  const spec = { servers: [{ ip: server }] } as any;
  const validation = (ServicesGenerator as any).validateNTP(spec);
  if (!validation.valid) {
    throw new Error(`Invalid NTP spec: ${validation.errors.join('; ')}`);
  }
  return ServicesGenerator.generateNTP(spec);
}

function buildSyslogCommands(server: string): string[] {
  const spec = { servers: [{ ip: server }] } as any;
  return ServicesGenerator.generateSyslog(spec);
}

export function createLabServicesCommand(): Command {
  const cmd = new Command('services')
    .description('Comandos para configurar servicios de red (DHCP/NTP/Syslog)')
    .option('--examples', 'Mostrar ejemplos de uso', false)
    .option('--explain', 'Explicar qué hace el comando', false)
    .option('--plan', 'Mostrar plan de ejecución sin ejecutar', false);

  const dhcpCmd = new Command('dhcp')
    .description('Operaciones sobre DHCP')
    .option('--examples', 'Mostrar ejemplos', false)
    .option('--explain', 'Explicar', false)
    .option('--plan', 'Mostrar plan', false);

  dhcpCmd
    .command('create')
    .description('Crear pool DHCP en un dispositivo')
    .requiredOption('--device <name>', 'Nombre del dispositivo objetivo')
    .requiredOption('--pool <name>', 'Nombre del pool DHCP')
    .requiredOption('--network <cidr>', 'Red en formato CIDR')
    .option('--examples', 'Mostrar ejemplos', false)
    .option('--explain', 'Explicar', false)
    .option('--plan', 'Mostrar plan', false)
    .action(async (options) => {
      const globalExamples = process.argv.includes('--examples');
      const globalExplain = process.argv.includes('--explain');
      const globalPlan = process.argv.includes('--plan');

      if (globalExamples) {
        console.log(printExamples(SERVICES_META));
        return;
      }

      if (globalExplain) {
        console.log(SERVICES_META.longDescription ?? SERVICES_META.summary);
        return;
      }

      if (globalPlan) {
        console.log('Plan de ejecución:');
        console.log(`  1. Crear pool DHCP: ${options.pool}`);
        console.log(`  2. Red: ${options.network}`);
        console.log(`  3. Aplicar al dispositivo ${options.device}`);
        return;
      }

      const flags: GlobalFlags = {
        json: false, jq: null, output: 'text', verbose: false, quiet: false,
        trace: false, tracePayload: false, traceResult: false, traceDir: null,
        traceBundle: false, traceBundlePath: null, sessionId: null,
        examples: globalExamples, schema: false, explain: globalExplain, plan: globalPlan, verify: true,
      };

      const result = await runCommand({
        action: 'services.dhcp.create',
        meta: SERVICES_META,
        flags,
        payloadPreview: { device: options.device, pool: options.pool, network: options.network },
        execute: async (ctx): Promise<CliResult> => {
          try {
            const commands = buildDhcpCommands(options.pool, options.network);

            await ctx.controller.start();
            try {
              await ctx.controller.configIos(options.device, commands);
              await ctx.logPhase('verify', { device: options.device });
              return createSuccessResult('services.dhcp.create', {
                device: options.device,
                pool: options.pool,
                network: options.network,
                commandsGenerated: commands.length,
              });
            } finally {
              await ctx.controller.stop();
            }
          } catch (error) {
            return createErrorResult('services.dhcp.create', { message: error instanceof Error ? error.message : String(error) });
          }
        },
      });

      const output = renderCliResult(result, flags.output);
      if (!flags.quiet || !result.ok) console.log(output);
      if (!result.ok) process.exit(1);
    });

  const ntpCmd = new Command('ntp')
    .description('Operaciones sobre NTP')
    .option('--examples', 'Mostrar ejemplos', false);

  ntpCmd
    .command('add-server')
    .description('Añadir servidor NTP a un dispositivo')
    .requiredOption('--device <name>', 'Nombre del dispositivo objetivo')
    .requiredOption('--server <ip>', 'IP o hostname del servidor NTP')
    .option('--examples', 'Mostrar ejemplos', false)
    .option('--explain', 'Explicar', false)
    .option('--plan', 'Mostrar plan', false)
    .action(async (options) => {
      const globalExamples = process.argv.includes('--examples');
      const globalExplain = process.argv.includes('--explain');
      const globalPlan = process.argv.includes('--plan');

      if (globalExamples) {
        console.log(printExamples(SERVICES_META));
        return;
      }

      if (globalPlan) {
        console.log('Plan de ejecución:');
        console.log(`  1. Configurar servidor NTP: ${options.server}`);
        console.log(`  2. Aplicar al dispositivo ${options.device}`);
        return;
      }

      const flags: GlobalFlags = {
        json: false, jq: null, output: 'text', verbose: false, quiet: false,
        trace: false, tracePayload: false, traceResult: false, traceDir: null,
        traceBundle: false, traceBundlePath: null, sessionId: null,
        examples: globalExamples, schema: false, explain: globalExplain, plan: globalPlan, verify: true,
      };

      const result = await runCommand({
        action: 'services.ntp.add-server',
        meta: SERVICES_META,
        flags,
        payloadPreview: { device: options.device, server: options.server },
        execute: async (ctx): Promise<CliResult> => {
          try {
            const commands = buildNtpCommands(options.server);

            await ctx.controller.start();
            try {
              await ctx.controller.configIos(options.device, commands);
              await ctx.logPhase('verify', { device: options.device });
              return createSuccessResult('services.ntp.add-server', {
                device: options.device,
                server: options.server,
                commandsGenerated: commands.length,
              });
            } finally {
              await ctx.controller.stop();
            }
          } catch (error) {
            return createErrorResult('services.ntp.add-server', { message: error instanceof Error ? error.message : String(error) });
          }
        },
      });

      const output = renderCliResult(result, flags.output);
      if (!flags.quiet || !result.ok) console.log(output);
      if (!result.ok) process.exit(1);
    });

  const syslogCmd = new Command('syslog')
    .description('Operaciones sobre Syslog')
    .option('--examples', 'Mostrar ejemplos', false);

  syslogCmd
    .command('add-server')
    .description('Añadir servidor Syslog a un dispositivo')
    .requiredOption('--device <name>', 'Nombre del dispositivo objetivo')
    .requiredOption('--server <ip>', 'IP del servidor Syslog')
    .option('--examples', 'Mostrar ejemplos', false)
    .option('--explain', 'Explicar', false)
    .option('--plan', 'Mostrar plan', false)
    .action(async (options) => {
      const globalExamples = process.argv.includes('--examples');
      const globalExplain = process.argv.includes('--explain');
      const globalPlan = process.argv.includes('--plan');

      if (globalExamples) {
        console.log(printExamples(SERVICES_META));
        return;
      }

      if (globalPlan) {
        console.log('Plan de ejecución:');
        console.log(`  1. Configurar servidor Syslog: ${options.server}`);
        console.log(`  2. Aplicar al dispositivo ${options.device}`);
        return;
      }

      const flags: GlobalFlags = {
        json: false, jq: null, output: 'text', verbose: false, quiet: false,
        trace: false, tracePayload: false, traceResult: false, traceDir: null,
        traceBundle: false, traceBundlePath: null, sessionId: null,
        examples: globalExamples, schema: false, explain: globalExplain, plan: globalPlan, verify: true,
      };

      const result = await runCommand({
        action: 'services.syslog.add-server',
        meta: SERVICES_META,
        flags,
        payloadPreview: { device: options.device, server: options.server },
        execute: async (ctx): Promise<CliResult> => {
          try {
            const commands = buildSyslogCommands(options.server);

            await ctx.controller.start();
            try {
              await ctx.controller.configIos(options.device, commands);
              await ctx.logPhase('verify', { device: options.device });
              return createSuccessResult('services.syslog.add-server', {
                device: options.device,
                server: options.server,
                commandsGenerated: commands.length,
              });
            } finally {
              await ctx.controller.stop();
            }
          } catch (error) {
            return createErrorResult('services.syslog.add-server', { message: error instanceof Error ? error.message : String(error) });
          }
        },
      });

      const output = renderCliResult(result, flags.output);
      if (!flags.quiet || !result.ok) console.log(output);
      if (!result.ok) process.exit(1);
    });

  cmd.addCommand(dhcpCmd);
  cmd.addCommand(ntpCmd);
  cmd.addCommand(syslogCmd);

  return cmd;
}
