#!/usr/bin/env bun
import { Command } from 'commander';
import chalk from 'chalk';
import { runCommand } from '../application/run-command';
import type { CliResult } from '../contracts/cli-result';
import { createSuccessResult, createErrorResult } from '../contracts/cli-result';
import type { CommandMeta } from '../contracts/command-meta';
import type { GlobalFlags } from '../flags';
import { fetchDeviceList, getIOSCapableDevices } from '../utils/device-utils';
import { parseConfigFile, requireDevice } from '../utils/config-parser';

export const CONFIG_INTERFACE_META: CommandMeta = {
  id: 'config-interface',
  summary: 'Configurar interfaces de un dispositivo Cisco',
  longDescription: 'Configura interfaces con IP, mascara, descripcion y estado shutdown/no shutdown.',
  examples: [
    { command: 'pt config interface --device R1 --name GigabitEthernet0/0 --ip 192.168.1.1 --mask 255.255.255.0 --no-shutdown --dry-run', description: 'Preview interface' },
    { command: 'pt config interface --device R1 --name Gig0/0 --ip 10.0.0.1 --mask 255.255.255.252 --description "Link a R2" --no-shutdown --apply', description: 'Configurar interfaz completa' },
    { command: 'pt config interface --file configs/interface.yaml --apply', description: 'Desde archivo YAML' },
  ],
  related: ['show ip interface brief', 'show interfaces', 'config ospf'],
  tags: ['interface', 'config', 'cisco'],
  supportsVerify: true,
  supportsJson: true,
  supportsPlan: true,
  supportsExplain: true,
};

function generateInterfaceCommands(config: Record<string, unknown>): string[] {
  const cmds: string[] = [];
  cmds.push(`interface ${config.name}`);
  if (config.description) cmds.push(` description ${config.description}`);
  if (config.ip && config.mask) cmds.push(` ip address ${config.ip} ${config.mask}`);
  if (config.shutdown === false || config.noShutdown) cmds.push(' no shutdown');
  if (config.shutdown === true) cmds.push(' shutdown');
  return cmds;
}

export function createConfigInterfaceCommand(): Command {
  const cmd = new Command('interface')
    .description('Configurar interfaces')
    .option('--device <device>', 'Dispositivo destino')
    .option('--name <name>', 'Nombre de la interfaz')
    .option('--ip <ip>', 'Direccion IP')
    .option('--mask <mask>', 'Subnet mask')
    .option('--description <desc>', 'Descripcion de la interfaz')
    .option('--shutdown', 'Deshabilitar interfaz', false)
    .option('--no-shutdown', 'Habilitar interfaz', false)
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
      let name = options.name;
      let ip = options.ip;
      let mask = options.mask;
      let description = options.description;
      let shutdown = options.shutdown;
      let noShutdown = options.noShutdown;

      if (options.file) {
        const result = parseConfigFile(options.file);
        if (!result.success) { console.error(chalk.red('Error: ' + result.error)); process.exit(1); }
        const data = result.data as Record<string, unknown>;
        if (!device) device = requireDevice(data);
        if (!name && data.name) name = data.name as string;
        if (!ip && data.ip) ip = data.ip as string;
        if (!mask && data.mask) mask = data.mask as string;
        if (!description && data.description) description = data.description as string;
        if (data.shutdown !== undefined) shutdown = data.shutdown as boolean;
        if (data.noShutdown !== undefined) noShutdown = data.noShutdown as boolean;
      }

      if (!device) { console.error(chalk.red('Error: --device requerido')); process.exit(1); }
      if (!name) { console.error(chalk.red('Error: --name requerido')); process.exit(1); }

      const configInput: Record<string, unknown> = { device, type: 'interface', name, ip, mask, description, shutdown, noShutdown };
      const iosCommands = generateInterfaceCommands(configInput);
      const isDryRun = options.dryRun || !options.apply;

      if (isDryRun) {
        console.log(chalk.cyan('\n[DRY-RUN] Comandos interface ' + chalk.bold(name) + ' para ' + chalk.bold(device) + ':\n'));
        iosCommands.forEach((c, i) => console.log(`  ${i + 1}. ${chalk.green(c)}`));
        console.log();
        return;
      }

      const result = await runCommand<{ device: string; interface: string; commands: string[]; executed: number }>({
        action: 'config-interface', meta: CONFIG_INTERFACE_META, flags,
        payloadPreview: { device, name },
        execute: async (ctx) => {
          await ctx.controller.start();
          try {
            const devices = await fetchDeviceList(ctx.controller);
            const iosDevices = getIOSCapableDevices(devices);
            const selected = iosDevices.find((d) => d.name === device);
            if (!selected) { return createErrorResult('config-interface', { message: `Dispositivo "${device}" no encontrado` }); }
            await ctx.controller.configIosWithResult(device, iosCommands, { save: true });
            return createSuccessResult('config-interface', { device, interface: name, commands: iosCommands, executed: iosCommands.length });
          } finally { await ctx.controller.stop(); }
        },
      });

      if (result.ok) {
        console.log(chalk.green('\n✓ Interface ' + chalk.bold(name) + ' configurada en ' + chalk.cyan(device) + ' (' + result.data?.executed + ' comandos)\n'));
      } else {
        console.error(chalk.red('\n✗ Error: ' + result.error?.message + '\n'));
        process.exit(1);
      }
    });

  return cmd;
}
