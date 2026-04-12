#!/usr/bin/env bun
/**
 * Comando vlan - Gestión de VLANs en Packet Tracer
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
import { fetchDeviceList, getIOSCapableDevices } from '../utils/device-utils.js';
import { parseStrictVlanId } from '../utils/cli-parser.js';
import { CapabilitySet, resolveCapabilitySet } from '@cisco-auto/ios-domain/capabilities';
import { planConfigureTrunkPort, planConfigureVlan } from '@cisco-auto/ios-domain/operations';
import { VlanId, parseInterfaceName } from '@cisco-auto/ios-domain/value-objects';

const VLAN_LIST_SEPARATOR = ',';

const VLAN_EXAMPLES = [
  { command: 'pt vlan create --name SERVIDORES --id 100', description: 'Crear VLAN 100 llamada SERVIDORES' },
  { command: 'pt vlan apply --device Switch1 --vlans 10,20,30', description: 'Aplicar VLANs a un switch' },
  { command: 'pt vlan trunk --device Switch1 --interface Gi0/1 --allowed 10,20', description: 'Configurar trunk con VLANs permitidas' },
];

const VLAN_META: CommandMeta = {
  id: 'vlan',
  summary: 'Gestionar VLANs en Packet Tracer',
  longDescription: 'Comandos para crear, aplicar y configurar VLANs en switches Cisco.',
  examples: VLAN_EXAMPLES,
  related: ['config-ios', 'show', 'etherchannel'],
  supportsVerify: true,
  supportsJson: true,
  supportsPlan: true,
  supportsExplain: true,
};

type VlanTarget = { name: string; model: string };
type VlanController = {
  start: () => Promise<void>;
  stop: () => Promise<void>;
  configIosWithResult: (device: string, commands: string[], options: { save: boolean }) => Promise<unknown>;
};

function toVlanId(value: number | VlanId): VlanId {
  return value instanceof VlanId ? value : VlanId.from(value);
}

function planToCommands(plan: { steps: Array<{ command: string }> }): string[] {
  return plan.steps.map((step, index) => (index === 0 ? step.command : ` ${step.command}`));
}

export function parseVlanIds(raw: string): VlanId[] {
  try {
    const ids = raw
      .split(VLAN_LIST_SEPARATOR)
      .map((token) => token.trim())
      .filter(Boolean)
      .map((token) => parseStrictVlanId(token));

    if (ids.length === 0) {
      throw new Error('La lista de VLANs debe contener IDs válidos entre 1 y 4094');
    }

    return ids;
  } catch {
    throw new Error('La lista de VLANs debe contener IDs válidos entre 1 y 4094');
  }
}

export function buildVlanCreateCommands(name: string, id: number, description?: string): string[] {
  const commands = ['! Configuración de VLANs'];
  commands.push(`vlan ${id}`);
  commands.push(` name ${name}`);
  if (description) {
    commands.push(` description ${description}`);
  }
  commands.push(' exit');
  return commands;
}

export function buildVlanApplyCommands(vlanIds: Array<number | VlanId>, caps: CapabilitySet = CapabilitySet.l2Switch('2960')): string[] {
  const commands = ['! Configuración de VLANs'];
  for (const id of vlanIds) {
    const vlanId = toVlanId(id);
    const plan = planConfigureVlan(caps, { vlan: vlanId, name: `VLAN${vlanId.value}` });

    if (!plan) {
      throw new Error('El dispositivo no soporta configuración de VLANs');
    }

    commands.push(...planToCommands(plan));
  }
  return commands;
}

interface VlanApplyResult {
  device: string;
  vlanIds: number[];
  commandsGenerated: number;
}

interface VlanCreateResult {
  vlanId: number;
  name: string;
  description?: string;
  commands: string[];
}

interface VlanTrunkResult {
  device: string;
  interface: string;
  allowedVlans: number[];
  commands: string[];
}

export function buildVlanTrunkCommands(iface: string, allowedVlans: number[]): string[] {
  return buildVlanTrunkCommandsWithCapability(iface, allowedVlans, CapabilitySet.l2Switch('2960'));
}

function buildVlanTrunkCommandsWithCapability(iface: string, allowedVlans: Array<number | VlanId>, caps: CapabilitySet): string[] {
  const vlans = allowedVlans.map((value) => toVlanId(value));
  const port = parseInterfaceName(iface);
  const plan = planConfigureTrunkPort(caps, { port, vlans });

  if (!plan) {
    throw new Error('El dispositivo no soporta configuración trunk');
  }

  return ['! Configuración de interfaces', ...planToCommands(plan)];
}

export async function executeVlanApply(
  controller: VlanController,
  target: VlanTarget,
  vlanIds: Array<number | VlanId>
): Promise<CliResult<{ device: string; vlanIds: number[]; commands: string[] }>> {
  const caps = resolveCapabilitySet(target.model);
  const commands = buildVlanApplyCommands(vlanIds, caps).slice(1);

  try {
    await controller.configIosWithResult(target.name, commands, { save: true });

    return createSuccessResult('vlan.apply', {
      device: target.name,
      vlanIds: vlanIds.map((value) => toVlanId(value).value),
      commands,
    });
  } catch (error) {
    return createErrorResult('vlan.apply', {
      message: error instanceof Error ? error.message : String(error),
    }) as CliResult<{ device: string; vlanIds: number[]; commands: string[] }>;
  }
}

export async function executeVlanTrunk(
  controller: VlanController,
  target: VlanTarget,
  iface: string,
  allowedVlans: Array<number | VlanId>
): Promise<CliResult<{ device: string; interface: string; allowedVlans: number[]; commands: string[] }>> {
  const caps = resolveCapabilitySet(target.model);
  const commands = buildVlanTrunkCommandsWithCapability(iface, allowedVlans, caps).slice(1);

  try {
    await controller.configIosWithResult(target.name, commands, { save: true });

    return createSuccessResult('vlan.trunk', {
      device: target.name,
      interface: iface,
      allowedVlans: allowedVlans.map((value) => toVlanId(value).value),
      commands,
    });
  } catch (error) {
    return createErrorResult('vlan.trunk', {
      message: error instanceof Error ? error.message : String(error),
    }) as CliResult<{ device: string; interface: string; allowedVlans: number[]; commands: string[] }>;
  }
}

export function createLabVlanCommand(): Command {
  const command = new Command('vlan')
    .description('Comandos para gestionar VLANs');

  command
    .command('create')
    .description('Generar comandos IOS para crear una VLAN')
    .requiredOption('--name <name>', 'Nombre de la VLAN')
    .requiredOption('--id <id>', 'ID de la VLAN (1-4094)')
    .option('--description <text>', 'Descripción opcional de la VLAN')
    .action(async (options) => {
      const globalExamples = process.argv.includes('--examples');
      const globalSchema = process.argv.includes('--schema');
      const globalExplain = process.argv.includes('--explain');
      const globalPlan = process.argv.includes('--plan');

      if (globalExamples) {
        console.log(printExamples(VLAN_META));
        return;
      }

      if (globalSchema) {
        console.log(JSON.stringify(VLAN_META, null, 2));
        return;
      }

      if (globalExplain) {
        console.log(VLAN_META.longDescription ?? VLAN_META.summary);
        return;
      }

      if (globalPlan) {
        console.log('Plan de ejecución:');
        console.log(`  1. Crear VLAN ${options.id} con nombre "${options.name}"`);
        console.log('  2. Generar comandos IOS');
        return;
      }

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
      };

      const result = await runCommand({
        action: 'vlan.create',
        meta: VLAN_META,
        flags,
        payloadPreview: { name: options.name, id: options.id },
        execute: async (): Promise<CliResult<VlanCreateResult>> => {
          try {
            const id = Number(options.id);
            if (Number.isNaN(id) || id < 1 || id > 4094) {
              return createErrorResult('vlan.create', { message: 'El ID de VLAN debe ser un número entre 1 y 4094' }) as CliResult<VlanCreateResult>;
            }

            const commands = buildVlanCreateCommands(options.name, id, options.description);

            return createSuccessResult('vlan.create', {
              vlanId: id,
              name: options.name,
              description: options.description,
              commands,
            }, {
              advice: ['Usa pt config-ios <device> para aplicar estos comandos'],
            });
          } catch (error) {
            return createErrorResult('vlan.create', {
              message: error instanceof Error ? error.message : String(error),
            }) as CliResult<VlanCreateResult>;
          }
        },
      });

      const output = renderCliResult(result, flags.output);
      if (!flags.quiet || !result.ok) {
        console.log(output);
      }

      if (result.ok) {
        console.log(chalk.blue('\n➡️  Comandos VLAN generados:'));
        const cmds = result.data?.commands as string[] | undefined;
        cmds?.forEach((cmd) => console.log(cmd));
      }

      if (!result.ok) process.exit(1);
    });

  command
    .command('apply')
    .description('Aplicar VLANs a un switch')
    .requiredOption('--device <name>', 'Nombre del dispositivo destino')
    .requiredOption('--vlans <list>', 'Lista de IDs de VLAN separadas por comas')
    .action(async (options) => {
      const globalExamples = process.argv.includes('--examples');
      const globalExplain = process.argv.includes('--explain');
      const globalPlan = process.argv.includes('--plan');

      if (globalExamples) {
        console.log(printExamples(VLAN_META));
        return;
      }

      if (globalExplain) {
        console.log(VLAN_META.longDescription ?? VLAN_META.summary);
        return;
      }

      if (globalPlan) {
        console.log('Plan de ejecución:');
        console.log(`  1. Validar lista de VLANs: ${options.vlans}`);
        console.log(`  2. Generar comandos IOS para crear VLANs`);
        console.log(`  3. Aplicar al dispositivo ${options.device}`);
        return;
      }

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
        schema: false,
        explain: globalExplain,
        plan: globalPlan,
        verify: true,
      };

      const result = await runCommand({
        action: 'vlan.apply',
        meta: VLAN_META,
        flags,
        payloadPreview: { device: options.device, vlans: options.vlans },
        execute: async (ctx): Promise<CliResult> => {
          try {
            await ctx.controller.start();

            try {
            const vlanIds = parseVlanIds(options.vlans);
            const devices = await fetchDeviceList(ctx.controller);
            const iosDevices = getIOSCapableDevices(devices);
            const selected = iosDevices.find((d) => d.name === options.device);

            if (!selected) {
              return createErrorResult('vlan.apply', { message: `Dispositivo "${options.device}" no encontrado` }) as CliResult<VlanApplyResult>;
            }

            const result = await executeVlanApply(ctx.controller, { name: selected.name, model: selected.model }, vlanIds);

            if (result.ok) {
              return createSuccessResult('vlan.apply', {
                device: selected.name,
                vlanIds: vlanIds.map((vlanId) => vlanId.value),
                commandsGenerated: result.data?.commands.length ?? 0,
              }, {
                advice: [`Usa pt show vlan ${options.device} para verificar`],
              });
            }

            return result as CliResult<VlanApplyResult>;
            } finally {
              await ctx.controller.stop();
            }
          } catch (error) {
            return createErrorResult('vlan.apply', {
              message: error instanceof Error ? error.message : String(error),
            });
          }
        },
      });

      const output = renderCliResult(result, flags.output);
      if (!flags.quiet || !result.ok) {
        console.log(output);
      }

      if (!result.ok) process.exit(1);
    });

  command
    .command('trunk')
    .description('Configurar un enlace trunk en un switch')
    .requiredOption('--device <name>', 'Dispositivo objetivo')
    .requiredOption('--interface <iface>', 'Interfaz que será trunk')
    .requiredOption('--allowed <list>', 'Lista de VLANs permitidas')
    .action(async (options) => {
      const globalExamples = process.argv.includes('--examples');
      const globalExplain = process.argv.includes('--explain');
      const globalPlan = process.argv.includes('--plan');

      if (globalExamples) {
        console.log(printExamples(VLAN_META));
        return;
      }

      if (globalExplain) {
        console.log(VLAN_META.longDescription ?? VLAN_META.summary);
        return;
      }

      if (globalPlan) {
        console.log('Plan de ejecución:');
        console.log(`  1. Configurar interfaz ${options.interface} como trunk`);
        console.log(`  2. Permitir VLANs: ${options.allowed}`);
        console.log('  3. Generar comandos IOS');
        return;
      }

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
        schema: false,
        explain: globalExplain,
        plan: globalPlan,
        verify: false,
      };

      const result = await runCommand({
        action: 'vlan.trunk',
        meta: VLAN_META,
        flags,
        payloadPreview: { device: options.device, interface: options.interface, allowed: options.allowed },
        execute: async (ctx): Promise<CliResult<VlanTrunkResult>> => {
          try {
            await ctx.controller.start();

            try {
            const vlanIds = parseVlanIds(options.allowed);
            const devices = await fetchDeviceList(ctx.controller);
            const iosDevices = getIOSCapableDevices(devices);
            const selected = iosDevices.find((d) => d.name === options.device);

            if (!selected) {
              return createErrorResult('vlan.trunk', { message: `Dispositivo "${options.device}" no encontrado` }) as CliResult<VlanTrunkResult>;
            }

            const result = await executeVlanTrunk(ctx.controller, { name: selected.name, model: selected.model }, options.interface, vlanIds);

            if (result.ok) {
              return createSuccessResult('vlan.trunk', {
                device: selected.name,
                interface: options.interface,
                allowedVlans: vlanIds.map((vlanId) => vlanId.value),
                commands: result.data?.commands ?? [],
              }, {
                advice: [`Usa pt config-ios ${options.device} para aplicar`],
              });
            }

            return result as CliResult<VlanTrunkResult>;
            } finally {
              await ctx.controller.stop();
            }
          } catch (error) {
            return createErrorResult('vlan.trunk', {
              message: error instanceof Error ? error.message : String(error),
            }) as CliResult<VlanTrunkResult>;
          }
        },
      });

      const output = renderCliResult(result, flags.output);
      if (!flags.quiet || !result.ok) {
        console.log(output);
      }

      if (result.ok) {
        console.log(chalk.blue('\n➡️  Comandos para configurar trunk:'));
        const cmds = result.data?.commands as string[] | undefined;
        cmds?.forEach((cmd) => console.log(cmd));
      }

      if (!result.ok) process.exit(1);
    });

  return command;
}
