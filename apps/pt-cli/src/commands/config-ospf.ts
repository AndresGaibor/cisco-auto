#!/usr/bin/env bun
import { Command } from 'commander';
import chalk from 'chalk';
import { runCommand } from '../application/run-command';
import type { CliResult } from '../contracts/cli-result';
import { createSuccessResult, createErrorResult } from '../contracts/cli-result';
import type { CommandMeta } from '../contracts/command-meta';
import type { GlobalFlags } from '../flags';
import { fetchDeviceList, getIOSCapableDevices } from '../utils/device-utils';
import { parseNetworks, parseRepeatableSimple } from '../utils/cli-parser';
import { parseConfigFile, requireDevice } from '../utils/config-parser';
import type { OspfConfig } from '@cisco-auto/ios-domain/schemas';
import { OspfConfigSchema } from '@cisco-auto/ios-domain/schemas';

export const CONFIG_OSPF_META: CommandMeta = {
  id: 'config-ospf',
  summary: 'Configurar enrutamiento OSPF en un dispositivo Cisco',
  longDescription: 'Configura OSPF con process-id, router-id, networks y passive-interfaces. Soporta modo dry-run, archivos YAML/JSON y aplicacion directa.',
  examples: [
    { command: 'pt config ospf --device R1 --process-id 1 --network "192.168.1.0,0.0.0.255,0" --dry-run', description: 'Preview de configuracion OSPF' },
    { command: 'pt config ospf --device R1 --process-id 1 --network "192.168.1.0,0.0.0.255,0" --network "10.0.0.0,0.0.0.3,1" --apply', description: 'Aplicar OSPF con multiples redes' },
    { command: 'pt config ospf --file configs/ospf.yaml --dry-run', description: 'Configurar desde archivo YAML' },
    { command: 'pt config ospf --device R1 --process-id 1 --router-id 1.1.1.1 --network "192.168.1.0,0.0.0.255,0" --passive-interface Loopback0 --apply', description: 'OSPF completo con router-id y passive-interface' },
  ],
  related: ['config eigrp', 'config bgp', 'show ip route', 'show ip ospf neighbor'],
  tags: ['ospf', 'routing', 'config', 'cisco'],
  supportsVerify: true,
  supportsJson: true,
  supportsPlan: true,
  supportsExplain: true,
};

function generateOspfCommands(config: OspfConfig): string[] {
  const cmds: string[] = [];
  cmds.push(`router ospf ${config.processId}`);
  if (config.routerId) cmds.push(`router-id ${config.routerId}`);
  for (const net of config.networks) {
    cmds.push(`network ${net.network} ${net.wildcard} area ${net.area}`);
  }
  if (config.passiveInterfaces) {
    for (const iface of config.passiveInterfaces) {
      cmds.push(`passive-interface ${iface}`);
    }
  }
  return cmds;
}

export function createConfigOspfCommand(): Command {
  const cmd = new Command('ospf')
    .description('Configurar enrutamiento OSPF')
    .option('--device <device>', 'Dispositivo destino')
    .option('--process-id <id>', 'Process ID de OSPF (1-65535)')
    .option('--router-id <id>', 'Router ID (direccion IP)')
    .option('--network <network>', 'Red OSPF (formato: ip,wildcard,area). Repeatable.', (val, prev: string[] = []) => [...prev, val], [])
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
      let processId: number | undefined = options.processId ? parseInt(options.processId, 10) : undefined;
      let routerId = options.routerId;
      let networks = options.network || [];
      let passiveInterfaces = options.passiveInterface || [];

      if (options.file) {
        const result = parseConfigFile(options.file);
        if (!result.success) {
          console.error(chalk.red('Error: ' + result.error));
          process.exit(1);
        }
        const data = result.data as Record<string, unknown>;
        if (!device) device = requireDevice(data);
        if (!processId && data.processId) processId = Number(data.processId);
        if (!routerId && data.routerId) routerId = data.routerId as string;
        if (networks.length === 0 && data.networks) {
          networks = (data.networks as Array<{ network: string; wildcard: string; area: string | number }>).map(
            (n) => `${n.network},${n.wildcard},${n.area}`
          );
        }
        if (passiveInterfaces.length === 0 && data.passiveInterfaces) {
          passiveInterfaces = data.passiveInterfaces as string[];
        }
      }

      if (!device) {
        console.error(chalk.red('Error: Debe especificar --device o usar --file con campo "device"'));
        process.exit(1);
      }
      if (!processId) {
        console.error(chalk.red('Error: Debe especificar --process-id o usar --file con campo "processId"'));
        process.exit(1);
      }
      if (networks.length === 0) {
        console.error(chalk.red('Error: Debe especificar al menos un --network o usar --file con "networks"'));
        process.exit(1);
      }

      const parsedNetworks = parseNetworks(networks);
      const configInput: Record<string, unknown> = {
        device,
        type: 'ospf',
        processId,
        routerId,
        networks: parsedNetworks,
        passiveInterfaces: passiveInterfaces.length > 0 ? passiveInterfaces : undefined,
      };

      const validationResult = OspfConfigSchema.safeParse(configInput);
      if (!validationResult.success) {
        const errors = validationResult.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
        console.error(chalk.red('Error de validacion:\n' + errors));
        process.exit(1);
      }

      const config = validationResult.data;
      const iosCommands = generateOspfCommands(config);
      const isDryRun = options.dryRun || !options.apply;

      if (isDryRun) {
        console.log(chalk.cyan('\n[DRY-RUN] Comandos OSPF para ' + chalk.bold(device) + ':\n'));
        iosCommands.forEach((c, i) => console.log(`  ${i + 1}. ${chalk.green(c)}`));
        console.log();
        return;
      }

      const result = await runCommand<{ device: string; commands: string[]; executed: number }>({
        action: 'config-ospf',
        meta: CONFIG_OSPF_META,
        flags,
        payloadPreview: { device, processId, networkCount: parsedNetworks.length },
        execute: async (ctx) => {
          await ctx.controller.start();
          try {
            const devices = await fetchDeviceList(ctx.controller);
            const iosDevices = getIOSCapableDevices(devices);
            const selected = iosDevices.find((d) => d.name === device);
            if (!selected) {
              return createErrorResult('config-ospf', { message: `Dispositivo "${device}" no encontrado` }) as CliResult<{ device: string; commands: string[]; executed: number }>;
            }
            await ctx.controller.configIosWithResult(device, iosCommands, { save: true });
            return createSuccessResult('config-ospf', { device, commands: iosCommands, executed: iosCommands.length });
          } finally {
            await ctx.controller.stop();
          }
        },
      });

      if (result.ok) {
        console.log(chalk.green('\n✓ OSPF configurado en ' + chalk.cyan(device) + ' (' + result.data?.executed + ' comandos)\n'));
      } else {
        console.error(chalk.red('\n✗ Error: ' + result.error?.message + '\n'));
        process.exit(1);
      }
    });

  return cmd;
}
