#!/usr/bin/env bun
import { Command } from 'commander';
import chalk from 'chalk';
import { runCommand } from '../application/run-command';
import type { CliResult } from '../contracts/cli-result';
import { createSuccessResult, createErrorResult } from '../contracts/cli-result';
import type { CommandMeta } from '../contracts/command-meta';
import type { GlobalFlags } from '../flags';
import { fetchDeviceList, getIOSCapableDevices } from '../utils/device-utils';
import { parseBgpNeighbors } from '../utils/cli-parser';
import { parseConfigFile, requireDevice } from '../utils/config-parser';
import { BgpConfigSchema } from '@cisco-auto/ios-domain/schemas';

export const CONFIG_BGP_META: CommandMeta = {
  id: 'config-bgp',
  summary: 'Configurar enrutamiento BGP en un dispositivo Cisco',
  longDescription: 'Configura BGP con autonomous system, neighbors y networks.',
  examples: [
    { command: 'pt config bgp --device R1 --as 65000 --neighbor "10.0.0.2,65001" --network "192.168.1.0/24" --dry-run', description: 'Preview BGP' },
    { command: 'pt config bgp --device R1 --as 65000 --neighbor "10.0.0.2,65001,R2" --network "192.168.1.0/24" --apply', description: 'Aplicar BGP' },
    { command: 'pt config bgp --file configs/bgp.yaml --dry-run', description: 'Desde archivo YAML' },
  ],
  related: ['config ospf', 'config eigrp', 'show ip bgp summary', 'show ip bgp neighbors'],
  tags: ['bgp', 'routing', 'config', 'cisco'],
  supportsVerify: true,
  supportsJson: true,
  supportsPlan: true,
  supportsExplain: true,
};

function generateBgpCommands(config: Record<string, unknown>): string[] {
  const cmds: string[] = [];
  const as = config.autonomousSystem;
  cmds.push(`router bgp ${as}`);
  const neighbors = config.neighbors as Array<{ ip: string; remoteAs: string | number; description?: string }>;
  for (const n of (neighbors || [])) {
    cmds.push(`neighbor ${n.ip} remote-as ${n.remoteAs}`);
    if (n.description) cmds.push(`neighbor ${n.ip} description ${n.description}`);
  }
  const networks = config.networks as string[];
  for (const net of (networks || [])) {
    const parts = net.split('/');
    cmds.push(`network ${parts[0]} mask ${cidrToMask(Number(parts[1]) || 24)}`);
  }
  return cmds;
}

function cidrToMask(cidr: number): string {
  const mask = cidr === 0 ? '0.0.0.0' : (~((1 << (32 - cidr)) - 1) >>> 0);
  return `${(mask >>> 24) & 255}.${(mask >>> 16) & 255}.${(mask >>> 8) & 255}.${mask & 255}`;
}

export function createConfigBgpCommand(): Command {
  const cmd = new Command('bgp')
    .description('Configurar enrutamiento BGP')
    .option('--device <device>', 'Dispositivo destino')
    .option('--as <as>', 'Autonomous System number')
    .option('--neighbor <neighbor>', 'Neighbor BGP (formato: ip,remote-as[,description]). Repeatable.', (val, prev: string[] = []) => [...prev, val], [])
    .option('--network <network>', 'Red BGP (formato: CIDR, ej: 192.168.1.0/24). Repeatable.', (val, prev: string[] = []) => [...prev, val], [])
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
      let neighbors = options.neighbor || [];
      let networks = options.network || [];

      if (options.file) {
        const result = parseConfigFile(options.file);
        if (!result.success) { console.error(chalk.red('Error: ' + result.error)); process.exit(1); }
        const data = result.data as Record<string, unknown>;
        if (!device) device = requireDevice(data);
        if (!autonomousSystem && data.autonomousSystem) autonomousSystem = data.autonomousSystem as string | number;
        if (neighbors.length === 0 && data.neighbors) {
          neighbors = (data.neighbors as Array<{ ip: string; remoteAs: string | number; description?: string }>).map(
            (n) => `${n.ip},${n.remoteAs}${n.description ? ',' + n.description : ''}`
          );
        }
        if (networks.length === 0 && data.networks) {
          networks = data.networks as string[];
        }
      }

      if (!device) { console.error(chalk.red('Error: --device requerido')); process.exit(1); }
      if (!autonomousSystem) { console.error(chalk.red('Error: --as requerido')); process.exit(1); }

      const parsedNeighbors = parseBgpNeighbors(neighbors);
      const configInput: Record<string, unknown> = {
        device, type: 'bgp', autonomousSystem, neighbors: parsedNeighbors, networks,
      };

      const validationResult = BgpConfigSchema.safeParse(configInput);
      if (!validationResult.success) {
        const errors = validationResult.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
        console.error(chalk.red('Error de validacion:\n' + errors));
        process.exit(1);
      }

      const iosCommands = generateBgpCommands(configInput);
      const isDryRun = options.dryRun || !options.apply;

      if (isDryRun) {
        console.log(chalk.cyan('\n[DRY-RUN] Comandos BGP para ' + chalk.bold(device) + ':\n'));
        iosCommands.forEach((c, i) => console.log(`  ${i + 1}. ${chalk.green(c)}`));
        console.log();
        return;
      }

      const result = await runCommand<{ device: string; commands: string[]; executed: number }>({
        action: 'config-bgp', meta: CONFIG_BGP_META, flags,
        payloadPreview: { device, autonomousSystem, neighborCount: parsedNeighbors.length },
        execute: async (ctx) => {
          await ctx.controller.start();
          try {
            const devices = await fetchDeviceList(ctx.controller);
            const iosDevices = getIOSCapableDevices(devices);
            const selected = iosDevices.find((d) => d.name === device);
            if (!selected) { return createErrorResult('config-bgp', { message: `Dispositivo "${device}" no encontrado` }) as CliResult<{ device: string; commands: string[]; executed: number }>; }
            await ctx.controller.configIosWithResult(device, iosCommands, { save: true });
            return createSuccessResult('config-bgp', { device, commands: iosCommands, executed: iosCommands.length });
          } finally { await ctx.controller.stop(); }
        },
      });

      if (result.ok) {
        console.log(chalk.green('\n✓ BGP configurado en ' + chalk.cyan(device) + ' (' + result.data?.executed + ' comandos)\n'));
      } else {
        console.error(chalk.red('\n✗ Error: ' + result.error?.message + '\n'));
        process.exit(1);
      }
    });

  return cmd;
}
