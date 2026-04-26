#!/usr/bin/env bun
/**
 * Comando etherchannel - EtherChannel (Port-Channel) management
 * Thin CLI wrapper que delega a pt-control/application/etherchannel
 */

import { Command } from 'commander';
import chalk from 'chalk';

import type { CliResult } from '../contracts/cli-result.js';
import { createSuccessResult, createErrorResult } from '../contracts/cli-result.js';
import type { CommandMeta } from '../contracts/command-meta.js';

import { runCommand } from '../application/run-command.js';
import { renderCliResult } from '../ux/renderers.ts';
import { printExamples } from '../ux/examples.js';
import { buildFlags, parseGlobalOptions } from '../flags-utils.js';

import {
  createEtherChannel,
  removeEtherChannel,
  listEtherChannel,
  type EtherchannelCreateResult,
  type EtherchannelRemoveResult,
  type EtherchannelListResult,
} from '@cisco-auto/pt-control/application/etherchannel';

const ETHERCHANNEL_EXAMPLES = [
  { command: 'pt etherchannel create --device Switch1 --group-id 1 --interfaces Gi0/1,Gi0/2', description: 'Crear EtherChannel con LACP' },
  { command: 'pt etherchannel create --device Switch1 --group-id 1 --interfaces Gi0/1,Gi0/2 --trunk', description: 'Crear EtherChannel como trunk' },
  { command: 'pt etherchannel list Switch1', description: 'Ver EtherChannels configurados' },
  { command: 'pt etherchannel remove Switch1 --group-id 1', description: 'Remover EtherChannel' },
];

const ETHERCHANNEL_META: CommandMeta = {
  id: 'etherchannel',
  summary: 'Gestionar EtherChannel (Port-Channel) en switches',
  longDescription: 'Comandos para crear, remover y listar bundles EtherChannel en switches Cisco.',
  examples: ETHERCHANNEL_EXAMPLES,
  related: ['vlan', 'config-ios', 'show'],
  supportsVerify: true,
  supportsJson: true,
  supportsPlan: true,
  supportsExplain: true,
};

function renderResult(result: CliResult, flags: { quiet: boolean; output: "text" | "json" | "table" | "raw" }): void {
  const output = renderCliResult(result, flags.output);
  if (!flags.quiet || !result.ok) console.log(output);
  if (!result.ok) process.exit(1);
}

export function createEtherchannelCommand(): Command {
  const cmd = new Command('etherchannel')
    .description('EtherChannel (Port-Channel) management')
    .option('--examples', 'Mostrar ejemplos de uso', false)
    .option('--explain', 'Explicar qué hace el comando', false)
    .option('--plan', 'Mostrar plan de ejecución sin ejecutar', false);

  // etherchannel create
  const createCmd = new Command('create')
    .description('Crear un bundle EtherChannel')
    .argument('[device]', 'Nombre del dispositivo')
    .option('-i, --interactive', 'Seleccionar el switch de forma interactiva', false)
    .option('--group-id <id>', 'Channel group ID (1-64)', '1')
    .option('--interfaces <interfaces>', 'Member interfaces, comma-separated')
    .option('--mode <mode>', 'Negotiation mode', 'active')
    .option('--protocol <protocol>', 'Protocol (lacp|pagp|static)', 'lacp')
    .option('--trunk', 'Set as trunk port', true)
    .option('--allowed-vlans <vlans>', 'Allowed VLANs')
    .option('--native-vlan <id>', 'Native VLAN ID')
    .option('--description <text>', 'Port-channel description')
    .option('--examples', 'Mostrar ejemplos', false)
    .option('--explain', 'Explicar', false)
    .option('--plan', 'Mostrar plan', false)
    .action(async (deviceName, options) => {
      const { examples, explain, plan } = parseGlobalOptions();
      if (examples) { console.log(printExamples(ETHERCHANNEL_META)); return; }
      if (explain) { console.log(ETHERCHANNEL_META.longDescription ?? ETHERCHANNEL_META.summary); return; }
      if (plan) { console.log(`Plan: 1. Crear EtherChannel group ${options.groupId}, 2. Asignar ${options.interfaces}`); return; }

      const flags = buildFlags({ examples, explain, plan, verify: true });
      const result = await runCommand({
        action: 'etherchannel.create', meta: ETHERCHANNEL_META, flags,
        payloadPreview: { device: deviceName ?? options.device, groupId: options.groupId, interfaces: options.interfaces },
        execute: async (ctx): Promise<CliResult<EtherchannelCreateResult>> => {
          const device = deviceName ?? options.device;
          if (!device) return createErrorResult('etherchannel.create', { message: 'Debe especificar un dispositivo' });
          if (!options.interfaces) return createErrorResult('etherchannel.create', { message: 'Debe especificar interfaces' });

          const execution = await createEtherChannel(ctx.controller, {
            deviceName: device,
            groupId: Number(options.groupId) || 1,
            interfaces: options.interfaces.split(',').map((i: string) => i.trim()),
            mode: (options.mode === 'active' ? 'active' : options.mode === 'passive' ? 'passive' : 'active') as "active" | "passive" | "on" | "desirable" | "auto",
            trunkMode: options.trunk ? "trunk" : "access",
            allowedVlans: options.allowedVlans,
            nativeVlan: options.nativeVlan ? Number(options.nativeVlan) : undefined,
            description: options.description,
          });

          if (!execution.ok) return createErrorResult('etherchannel.create', execution.error);
          return createSuccessResult('etherchannel.create', execution.data, { advice: execution.advice });
        },
      });
      renderResult(result, flags);
      if (result.ok) console.log(chalk.blue('\n➡️  Comandos generados:'));
    });

  // etherchannel remove
  const removeCmd = new Command('remove')
    .description('Remover un bundle EtherChannel')
    .argument('[device]', 'Nombre del dispositivo')
    .option('--group-id <id>', 'Channel group ID')
    .option('--examples', 'Mostrar ejemplos', false)
    .option('--explain', 'Explicar', false)
    .option('--plan', 'Mostrar plan', false)
    .action(async (deviceName, options) => {
      const { examples, explain, plan } = parseGlobalOptions();
      if (examples) { console.log(printExamples(ETHERCHANNEL_META)); return; }
      if (explain) { console.log(ETHERCHANNEL_META.longDescription ?? ETHERCHANNEL_META.summary); return; }
      if (plan) { console.log(`Plan: 1. Remover EtherChannel group ${options.groupId}`); return; }

      const flags = buildFlags({ examples, explain, plan, verify: true });
      const result = await runCommand({
        action: 'etherchannel.remove', meta: ETHERCHANNEL_META, flags,
        payloadPreview: { device: deviceName ?? options.device, groupId: options.groupId },
        execute: async (ctx): Promise<CliResult<EtherchannelRemoveResult>> => {
          const device = deviceName ?? options.device;
          if (!device || !options.groupId) return createErrorResult('etherchannel.remove', { message: 'Faltan parámetros' });

          const execution = await removeEtherChannel(ctx.controller, { deviceName: device, groupId: Number(options.groupId) });
          if (!execution.ok) return createErrorResult('etherchannel.remove', execution.error);
          return createSuccessResult('etherchannel.remove', execution.data);
        },
      });
      renderResult(result, flags);
    });

  // etherchannel list
  const listCmd = new Command('list')
    .description('Listar EtherChannel bundles')
    .argument('[device]', 'Nombre del dispositivo')
    .option('--examples', 'Mostrar ejemplos', false)
    .option('--explain', 'Explicar', false)
    .option('--plan', 'Mostrar plan', false)
    .action(async (deviceName, options) => {
      const { examples, explain, plan } = parseGlobalOptions();
      if (examples) { console.log(printExamples(ETHERCHANNEL_META)); return; }
      if (plan) { console.log(`Plan: 1. Listar EtherChannels de ${deviceName ?? options.device}`); return; }

      const flags = buildFlags({ examples, explain, plan, verify: false });
      const result = await runCommand({
        action: 'etherchannel.list', meta: ETHERCHANNEL_META, flags,
        payloadPreview: { device: deviceName ?? options.device },
        execute: async (ctx): Promise<CliResult<EtherchannelListResult>> => {
          const device = deviceName ?? options.device;
          if (!device) return createErrorResult('etherchannel.list', { message: 'Debe especificar un dispositivo' });

          const execution = await listEtherChannel(ctx.controller, { deviceName: device });
          if (!execution.ok) return createErrorResult('etherchannel.list', execution.error);
          return createSuccessResult('etherchannel.list', execution.data);
        },
      });
      renderResult(result, flags);
    });

  cmd.addCommand(createCmd);
  cmd.addCommand(removeCmd);
  cmd.addCommand(listCmd);

  return cmd;
}
