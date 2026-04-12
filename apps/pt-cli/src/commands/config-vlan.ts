#!/usr/bin/env bun
import { Command } from 'commander';
import chalk from 'chalk';
import { runCommand } from '../application/run-command';
import type { CliResult } from '../contracts/cli-result';
import { createSuccessResult, createErrorResult } from '../contracts/cli-result';
import type { CommandMeta } from '../contracts/command-meta';
import type { GlobalFlags } from '../flags';
import { fetchDeviceList, getIOSCapableDevices } from '../utils/device-utils';
import { parseVlans } from '../utils/cli-parser';
import { parseConfigFile, requireDevice } from '../utils/config-parser';
import { CapabilitySet } from '@cisco-auto/ios-domain/capabilities';
import { planConfigureVlan } from '@cisco-auto/ios-domain/operations';
import { VlanId } from '@cisco-auto/kernel/domain/ios/value-objects';

type ParsedVlan = { id: string | number; name: string; state?: string };

export const CONFIG_VLAN_META: CommandMeta = {
  id: 'config-vlan',
  summary: 'Configurar VLANs en un switch Cisco',
  longDescription: 'Crea y configura VLANs con id, nombre y estado.',
  examples: [
    { command: 'pt config vlan --device S1 --id 10 --name ADMIN --dry-run', description: 'Preview VLAN' },
    { command: 'pt config vlan --device S1 --vlan "10,ADMIN" --vlan "20,USERS" --vlan "30,GUEST" --apply', description: 'Crear multiples VLANs' },
    { command: 'pt config vlan --file configs/vlans.yaml --apply', description: 'Desde archivo YAML' },
  ],
  related: ['show vlan brief', 'config interface', 'switchport access vlan'],
  tags: ['vlan', 'switching', 'config', 'cisco'],
  supportsVerify: true,
  supportsJson: true,
  supportsPlan: true,
  supportsExplain: true,
};

export function generateVlanCommands(vlans: ParsedVlan[]): string[] {
  const commands: string[] = [];
  const caps = CapabilitySet.l2Switch('2960');

  for (const vlan of vlans) {
    const plan = planConfigureVlan(caps, {
      vlan: VlanId.fromString(String(vlan.id)),
      name: vlan.name,
    });

    if (!plan) {
      throw new Error('El dispositivo no soporta configuración de VLANs');
    }

    const vlanCommands = plan.steps.map((step, index) => (index === 0 ? step.command : ` ${step.command}`));
    if (vlan.state && vlan.state !== 'active') {
      vlanCommands.splice(vlanCommands.length - 1, 0, ` state ${vlan.state}`);
    }

    commands.push(...vlanCommands);
  }

  return commands;
}

export function createConfigVlanCommand(): Command {
  const cmd = new Command('config-vlan')
    .description('Configurar VLANs')
    .option('--device <device>', 'Dispositivo destino (switch)')
    .option('--id <id>', 'ID de la VLAN')
    .option('--name <name>', 'Nombre de la VLAN')
    .option('--state <state>', 'Estado: active, suspended', 'active')
    .option('--vlan <vlan>', 'VLAN (formato: id,name[,state]). Repeatable.', (val, prev: string[] = []) => [...prev, val], [])
    .option('--file <path>', 'Archivo de configuracion YAML/JSON')
    .option('--dry-run', 'Mostrar comandos sin ejecutar', false)
    .option('--apply', 'Ejecutar comandos en el dispositivo', false)
    .action(async (options) => {
      const flags: GlobalFlags = {
        json: false, jq: null, output: 'text', verbose: false, quiet: false,
        trace: false, tracePayload: false, traceResult: false, traceDir: null,
        traceBundle: false, traceBundlePath: null, sessionId: null,
        examples: false, schema: false, explain: false, plan: false, verify: true,
        timeout: null, noTimeout: false,
      };

      let device = options.device;
      let vlanId = options.id;
      let vlanName = options.name;
      let vlanState = options.state;
      let vlans = options.vlan || [];

      if (options.file) {
        const result = parseConfigFile(options.file);
        if (!result.success) { console.error(chalk.red('Error: ' + result.error)); process.exit(1); }
        const data = result.data as Record<string, unknown>;
        if (!device) device = requireDevice(data);
        if (!vlanId && data.id) vlanId = String(data.id);
        if (!vlanName && data.name) vlanName = data.name as string;
        if (!vlanState && data.state) vlanState = data.state as string;
        if (vlans.length === 0 && data.vlans) {
          vlans = (data.vlans as Array<{ id: string; name: string; state?: string }>).map(
            (v) => `${v.id},${v.name}${v.state ? ',' + v.state : ''}`
          );
        }
      }

      if (!device) { console.error(chalk.red('Error: --device requerido')); process.exit(1); }
      if (!vlanId && vlans.length === 0) { console.error(chalk.red('Error: --id o al menos un --vlan requerido')); process.exit(1); }
      if (vlanId && !vlanName) { console.error(chalk.red('Error: --name requerido cuando se usa --id')); process.exit(1); }

      const vlanConfigs = vlanId
        ? parseVlans([`${vlanId},${vlanName}${vlanState ? `,${vlanState}` : ''}`])
        : parseVlans(vlans);

      const iosCommands = generateVlanCommands(vlanConfigs as ParsedVlan[]);
      const isDryRun = options.dryRun || !options.apply;

      if (isDryRun) {
        console.log(chalk.cyan('\n[DRY-RUN] Comandos VLAN para ' + chalk.bold(device) + ':\n'));
        iosCommands.forEach((c, i) => console.log(`  ${i + 1}. ${chalk.green(c)}`));
        console.log();
        return;
      }

      const result = await runCommand<{ device: string; commands: string[]; executed: number }>({
        action: 'config-vlan', meta: CONFIG_VLAN_META, flags,
        payloadPreview: { device, vlanCount: vlanId ? 1 : vlans.length },
        execute: async (ctx) => {
          await ctx.controller.start();
          try {
            const devices = await fetchDeviceList(ctx.controller);
            const iosDevices = getIOSCapableDevices(devices);
            const selected = iosDevices.find((d) => d.name === device);
            if (!selected) { return createErrorResult('config-vlan', { message: `Dispositivo "${device}" no encontrado` }); }
            await ctx.controller.configIosWithResult(device, iosCommands, { save: true });
            return createSuccessResult('config-vlan', { device, commands: iosCommands, executed: iosCommands.length });
          } finally { await ctx.controller.stop(); }
        },
      });

      if (result.ok) {
        console.log(chalk.green('\n✓ VLANs configuradas en ' + chalk.cyan(device) + ' (' + result.data?.executed + ' comandos)\n'));
      } else {
        console.error(chalk.red('\n✗ Error: ' + result.error?.message + '\n'));
        process.exit(1);
      }
    });

  return cmd;
}
