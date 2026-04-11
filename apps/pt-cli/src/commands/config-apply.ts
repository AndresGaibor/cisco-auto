#!/usr/bin/env bun
import { Command } from 'commander';
import chalk from 'chalk';
import { runCommand } from '../application/run-command';
import type { CliResult } from '../contracts/cli-result';
import { createSuccessResult, createErrorResult } from '../contracts/cli-result';
import type { CommandMeta } from '../contracts/command-meta';
import type { GlobalFlags } from '../flags';
import { fetchDeviceList, getIOSCapableDevices } from '../utils/device-utils';
import { parseConfigFile } from '../utils/config-parser';

export const CONFIG_APPLY_META: CommandMeta = {
  id: 'config-apply',
  summary: 'Aplicar configuracion desde archivo YAML/JSON con deteccion automatica de tipo',
  longDescription: 'Lee un archivo de configuracion YAML/JSON, detecta el tipo por el campo "type" y genera/aplica los comandos IOS correspondientes.',
  examples: [
    { command: 'pt config apply configs/ospf.yaml --dry-run', description: 'Preview OSPF desde archivo' },
    { command: 'pt config apply configs/eigrp.yaml --apply', description: 'Aplicar EIGRP desde archivo' },
    { command: 'pt config apply configs/vlans.yaml --device S1 --dry-run', description: 'Preview VLANs sobrescribiendo dispositivo' },
  ],
  related: ['config ospf', 'config eigrp', 'config bgp', 'config acl', 'config vlan', 'config interface'],
  tags: ['config', 'apply', 'yaml', 'json', 'cisco'],
  supportsVerify: true,
  supportsJson: true,
  supportsPlan: true,
  supportsExplain: true,
};

function generateCommandsForType(config: Record<string, unknown>): string[] {
  const type = config.type as string;
  const cmds: string[] = [];

  switch (type) {
    case 'ospf': {
      cmds.push(`router ospf ${config.processId}`);
      if (config.routerId) cmds.push(`router-id ${config.routerId}`);
      for (const net of (config.networks as Array<{ network: string; wildcard: string; area: string | number }> || [])) {
        cmds.push(`network ${net.network} ${net.wildcard} area ${net.area}`);
      }
      for (const iface of (config.passiveInterfaces as string[] || [])) {
        cmds.push(`passive-interface ${iface}`);
      }
      break;
    }
    case 'eigrp': {
      cmds.push(`router eigrp ${config.autonomousSystem}`);
      for (const net of (config.networks as Array<{ network: string; wildcard: string }> || [])) {
        cmds.push(`network ${net.network} ${net.wildcard}`);
      }
      for (const iface of (config.passiveInterfaces as string[] || [])) {
        cmds.push(`passive-interface ${iface}`);
      }
      break;
    }
    case 'bgp': {
      cmds.push(`router bgp ${config.autonomousSystem}`);
      for (const n of (config.neighbors as Array<{ ip: string; remoteAs: string | number; description?: string }> || [])) {
        cmds.push(`neighbor ${n.ip} remote-as ${n.remoteAs}`);
        if (n.description) cmds.push(`neighbor ${n.ip} description ${n.description}`);
      }
      for (const net of (config.networks as string[] || [])) {
        const parts = net.split('/');
        const cidr = Number(parts[1]) || 24;
        const maskNum = cidr === 0 ? 0 : (~((1 << (32 - cidr)) - 1) >>> 0);
        const mask = `${(maskNum >>> 24) & 255}.${(maskNum >>> 16) & 255}.${(maskNum >>> 8) & 255}.${maskNum & 255}`;
        cmds.push(`network ${parts[0]} mask ${mask}`);
      }
      break;
    }
    case 'acl': {
      const aclType = config.aclType || 'extended';
      cmds.push(`ip access-list ${aclType} ${config.name}`);
      for (const rule of (config.rules as Array<{ action: string; protocol: string; source: string; sourceWildcard?: string; destination?: string; destinationWildcard?: string; log?: boolean }> || [])) {
        let cmd = ` ${rule.action} ${rule.protocol} ${rule.source}`;
        if (rule.sourceWildcard && rule.source.toLowerCase() !== 'any') cmd += ` ${rule.sourceWildcard}`;
        if (rule.destination) {
          cmd += ` ${rule.destination}`;
          if (rule.destinationWildcard && rule.destination.toLowerCase() !== 'any') cmd += ` ${rule.destinationWildcard}`;
        }
        if (rule.log) cmd += ' log';
        cmds.push(cmd);
      }
      break;
    }
    case 'vlan': {
      if (config.vlans) {
        for (const vlan of (config.vlans as Array<{ id: string; name: string; state?: string }> || [])) {
          cmds.push(`vlan ${vlan.id}`);
          cmds.push(` name ${vlan.name}`);
          if (vlan.state && vlan.state !== 'active') cmds.push(` state ${vlan.state}`);
        }
      } else if (config.id && config.name) {
        cmds.push(`vlan ${config.id}`);
        cmds.push(` name ${config.name}`);
      }
      break;
    }
    case 'interface': {
      cmds.push(`interface ${config.name}`);
      if (config.description) cmds.push(` description ${config.description}`);
      if (config.ip && config.mask) cmds.push(` ip address ${config.ip} ${config.mask}`);
      if (config.shutdown === false || config.noShutdown) cmds.push(' no shutdown');
      if (config.shutdown === true) cmds.push(' shutdown');
      break;
    }
    default:
      throw new Error(`Tipo de configuracion no soportado: "${type}". Soportados: ospf, eigrp, bgp, acl, vlan, interface`);
  }

  return cmds;
}

export function createConfigApplyCommand(): Command {
  const cmd = new Command('apply')
    .description('Aplicar configuracion desde archivo YAML/JSON con deteccion automatica')
    .argument('<file>', 'Archivo de configuracion YAML/JSON')
    .option('--device <device>', 'Sobrescribir dispositivo destino')
    .option('--dry-run', 'Mostrar comandos sin ejecutar', false)
    .option('--apply', 'Ejecutar comandos en el dispositivo', false)
    .action(async (file, options) => {
      const flags: GlobalFlags = {
        json: false, jq: null, output: 'text', verbose: false, quiet: false,
        trace: false, tracePayload: false, traceResult: false, traceDir: null,
        traceBundle: false, traceBundlePath: null, sessionId: null,
        examples: false, schema: false, explain: false, plan: false, verify: true,
        timeout: null, noTimeout: false,
      };

      const parseResult = parseConfigFile(file);
      if (!parseResult.success) {
        console.error(chalk.red('Error: ' + parseResult.error));
        process.exit(1);
      }

      const data = parseResult.data as Record<string, unknown>;
      if (!data.type) {
        console.error(chalk.red('Error: El archivo debe tener un campo "type" (ospf, eigrp, bgp, acl, vlan, interface)'));
        process.exit(1);
      }

      const device = options.device || (data.device as string);
      if (!device) {
        console.error(chalk.red('Error: Debe especificar --device o el archivo debe tener campo "device"'));
        process.exit(1);
      }

      if (options.device) data.device = options.device;

      let iosCommands: string[];
      try {
        iosCommands = generateCommandsForType(data);
      } catch (e) {
        console.error(chalk.red('Error: ' + (e instanceof Error ? e.message : String(e))));
        process.exit(1);
      }

      const isDryRun = options.dryRun || !options.apply;

      if (isDryRun) {
        console.log(chalk.cyan(`\n[DRY-RUN] Configuracion tipo "${data.type}" para ${chalk.bold(device)}:\n`));
        iosCommands.forEach((c, i) => console.log(`  ${i + 1}. ${chalk.green(c)}`));
        console.log();
        return;
      }

      const result = await runCommand<{ device: string; type: string; commands: string[]; executed: number }>({
        action: 'config-apply', meta: CONFIG_APPLY_META, flags,
        payloadPreview: { device, type: data.type, file },
        execute: async (ctx) => {
          await ctx.controller.start();
          try {
            const devices = await fetchDeviceList(ctx.controller);
            const iosDevices = getIOSCapableDevices(devices);
            const selected = iosDevices.find((d) => d.name === device);
            if (!selected) { return createErrorResult('config-apply', { message: `Dispositivo "${device}" no encontrado` }) as CliResult<{ device: string; type: string; commands: string[]; executed: number }>; }
            await ctx.controller.configIosWithResult(device, iosCommands, { save: true });
            return createSuccessResult('config-apply', { device, type: data.type as string, commands: iosCommands, executed: iosCommands.length });
          } finally { await ctx.controller.stop(); }
        },
      });

      if (result.ok) {
        console.log(chalk.green(`\n✓ Configuracion ${data.type} aplicada en ${chalk.cyan(device)} (${result.data?.executed} comandos)\n`));
      } else {
        console.error(chalk.red('\n✗ Error: ' + result.error?.message + '\n'));
        process.exit(1);
      }
    });

  return cmd;
}
