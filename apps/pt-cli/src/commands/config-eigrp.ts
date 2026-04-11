#!/usr/bin/env bun
import { Command } from 'commander';
import chalk from 'chalk';
import { runCommand } from '../application/run-command';
import type { CliResult } from '../contracts/cli-result';
import { createSuccessResult, createErrorResult } from '../contracts/cli-result';
import type { CommandMeta } from '../contracts/command-meta';
import type { GlobalFlags } from '../flags';
import { fetchDeviceList, getIOSCapableDevices } from '../utils/device-utils';
import { parseNetworks } from '../utils/cli-parser';
import { parseConfigFile, requireDevice } from '../utils/config-parser';
import type { EigrpConfig } from '@cisco-auto/ios-domain/schemas';
import { EigrpConfigSchema } from '@cisco-auto/ios-domain/schemas';

export const CONFIG_EIGRP_META: CommandMeta = {
  id: 'config-eigrp',
  summary: 'Configurar enrutamiento EIGRP en un dispositivo Cisco',
  longDescription: 'Configura EIGRP con autonomous system, networks y passive-interfaces.',
  examples: [
    { command: 'pt config eigrp --device R1 --as 100 --network "192.168.1.0,0.0.0.255" --dry-run', description: 'Preview EIGRP' },
    { command: 'pt config eigrp --device R1 --as 100 --network "192.168.1.0,0.0.0.255" --network "10.0.0.0,0.0.0.3" --apply', description: 'Aplicar EIGRP' },
    { command: 'pt config eigrp --file configs/eigrp.yaml --dry-run', description: 'Desde archivo YAML' },
  ],
  related: ['config ospf', 'config bgp', 'show ip route', 'show ip eigrp neighbors'],
  tags: ['eigrp', 'routing', 'config', 'cisco'],
  supportsVerify: true,
  supportsJson: true,
  supportsPlan: true,
  supportsExplain: true,
};

function generateEigrpCommands(config: EigrpConfig): string[] {
  const cmds: string[] = [];
  cmds.push(`router eigrp ${config.autonomousSystem}`);
  for (const net of config.networks) {
    cmds.push(`network ${net.network} ${net.wildcard}`);
  }
  if (config.passiveInterfaces) {
    for (const iface of config.passiveInterfaces) {
      cmds.push(`passive-interface ${iface}`);
    }
  }
  return cmds;
}

export function createConfigEigrpCommand(): Command {
  const cmd = new Command('eigrp')
    .description('Configurar enrutamiento EIGRP')
    .option('--device <device>', 'Dispositivo destino')
    .option('--as <as>', 'Autonomous System number')
    .option('--network <network>', 'Red EIGRP (formato: ip,wildcard). Repeatable.', (val, prev: string[] = []) => [...prev, val], [])
    .option('--passive-interface <iface>', 'Interfaz pasiva. Repeatable.', (val, prev: string[] = []) => [...prev, val], [])
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
      let autonomousSystem: string | number | undefined = options.as;
      let networks = options.network || [];
      let passiveInterfaces = options.passiveInterface || [];

      if (options.file) {
        const result = parseConfigFile(options.file);
        if (!result.success) { console.error(chalk.red('Error: ' + result.error)); process.exit(1); }
        const data = result.data as Record<string, unknown>;
        if (!device) device = requireDevice(data);
        if (!autonomousSystem && data.autonomousSystem) autonomousSystem = data.autonomousSystem as string | number;
        if (networks.length === 0 && data.networks) {
          networks = (data.networks as Array<{ network: string; wildcard: string }>).map((n) => `${n.network},${n.wildcard}`);
        }
        if (passiveInterfaces.length === 0 && data.passiveInterfaces) {
          passiveInterfaces = data.passiveInterfaces as string[];
        }
      }

      if (!device) { console.error(chalk.red('Error: --device requerido')); process.exit(1); }
      if (!autonomousSystem) { console.error(chalk.red('Error: --as requerido')); process.exit(1); }
      if (networks.length === 0) { console.error(chalk.red('Error: al menos un --network requerido')); process.exit(1); }

      const parsedNetworks = parseNetworks(networks).map((n) => ({ network: n.network, wildcard: n.wildcard }));
      const configInput: Record<string, unknown> = {
        device, type: 'eigrp', autonomousSystem, networks: parsedNetworks,
        passiveInterfaces: passiveInterfaces.length > 0 ? passiveInterfaces : undefined,
      };

      const validationResult = EigrpConfigSchema.safeParse(configInput);
      if (!validationResult.success) {
        const errors = validationResult.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
        console.error(chalk.red('Error de validacion:\n' + errors));
        process.exit(1);
      }

      const config = validationResult.data;
      const iosCommands = generateEigrpCommands(config);
      const isDryRun = options.dryRun || !options.apply;

      if (isDryRun) {
        console.log(chalk.cyan('\n[DRY-RUN] Comandos EIGRP para ' + chalk.bold(device) + ':\n'));
        iosCommands.forEach((c, i) => console.log(`  ${i + 1}. ${chalk.green(c)}`));
        console.log();
        return;
      }

      const result = await runCommand<{ device: string; commands: string[]; executed: number }>({
        action: 'config-eigrp', meta: CONFIG_EIGRP_META, flags,
        payloadPreview: { device, autonomousSystem, networkCount: parsedNetworks.length },
        execute: async (ctx) => {
          await ctx.controller.start();
          try {
            const devices = await fetchDeviceList(ctx.controller);
            const iosDevices = getIOSCapableDevices(devices);
            const selected = iosDevices.find((d) => d.name === device);
            if (!selected) { return createErrorResult('config-eigrp', { message: `Dispositivo "${device}" no encontrado` }) as CliResult<{ device: string; commands: string[]; executed: number }>; }
            await ctx.controller.configIosWithResult(device, iosCommands, { save: true });
            return createSuccessResult('config-eigrp', { device, commands: iosCommands, executed: iosCommands.length });
          } finally { await ctx.controller.stop(); }
        },
      });

      if (result.ok) {
        console.log(chalk.green('\n✓ EIGRP configurado en ' + chalk.cyan(device) + ' (' + result.data?.executed + ' comandos)\n'));
      } else {
        console.error(chalk.red('\n✗ Error: ' + result.error?.message + '\n'));
        process.exit(1);
      }
    });

  return cmd;
}
