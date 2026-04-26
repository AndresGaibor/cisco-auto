#!/usr/bin/env bun
import { Command } from 'commander';
import chalk from 'chalk';
import { runCommand } from '../application/run-command';
import type { CliResult } from '../contracts/cli-result';
import { createSuccessResult, createErrorResult } from '../contracts/cli-result';
import type { CommandMeta } from '../contracts/command-meta';
import type { GlobalFlags } from '../flags';
import { fetchDeviceList, getIOSCapableDevices } from '../utils/device-utils';
import { parseAclRules } from '../utils/cli-parser';
import { parseConfigFile, requireDevice } from '../utils/config-parser';
import { generateSecurityCommands, validateSecurityConfig } from '@cisco-auto/kernel/plugins/security';
import type { SecurityConfigInput } from '@cisco-auto/kernel/plugins/security';

export const CONFIG_ACL_META: CommandMeta = {
  id: 'config-acl',
  summary: 'Configurar Access Control Lists (ACLs) en un dispositivo Cisco',
  longDescription: 'Configura ACLs standard o extended con reglas permit/deny.',
  examples: [
    { command: 'pt config acl --device R1 --name FILTER_IN --type extended --rule "permit,ip,192.168.1.0,0.0.0.255,10.0.0.0,0.0.0.255" --dry-run', description: 'Preview ACL extendida' },
    { command: 'pt config acl --device R1 --name BLOCK_NET --type standard --rule "deny,ip,172.16.0.0,0.0.255.255" --rule "permit,ip,any,any" --apply', description: 'Aplicar ACL standard' },
    { command: 'pt config acl --file configs/acl.yaml --dry-run', description: 'Desde archivo YAML' },
  ],
  related: ['config interface', 'show access-lists', 'show ip interface'],
  tags: ['acl', 'security', 'config', 'cisco'],
  supportsVerify: true,
  supportsJson: true,
  supportsPlan: true,
  supportsExplain: true,
};

export function createConfigAclCommand(): Command {
  const cmd = new Command('config-acl')
    .description('Configurar Access Control Lists')
    .option('--device <device>', 'Dispositivo destino')
    .option('--name <name>', 'Nombre de la ACL')
    .option('--type <type>', 'Tipo: standard o extended', 'extended')
    .option('--rule <rule>', 'Regla ACL (formato: action,protocol,source[,wildcard][,dest][,dest-wildcard]). Repeatable.', (val, prev: string[] = []) => [...prev, val], [])
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
      let aclType = options.type;
      let rules = options.rule || [];

      if (options.file) {
        const result = parseConfigFile(options.file);
        if (!result.success) { console.error(chalk.red('Error: ' + result.error)); process.exit(1); }
        const data = result.data as Record<string, unknown>;
        if (!device) device = requireDevice(data);
        if (!name && data.name) name = data.name as string;
        if (!aclType && data.type && data.type !== 'acl') aclType = data.type as string;
        if (rules.length === 0 && data.rules) {
          rules = (data.rules as Array<{ action: string; protocol: string; source: string; sourceWildcard?: string; destination?: string; destinationWildcard?: string; log?: boolean }>).map(
            (r) => [r.action, r.protocol, r.source, r.sourceWildcard, r.destination, r.destinationWildcard, r.log ? 'log' : ''].filter(Boolean).join(',')
          );
        }
      }

      if (!device) { console.error(chalk.red('Error: --device requerido')); process.exit(1); }
      if (!name) { console.error(chalk.red('Error: --name requerido')); process.exit(1); }
      if (rules.length === 0) { console.error(chalk.red('Error: al menos un --rule requerido')); process.exit(1); }

      const parsedRules = parseAclRules(rules);
      const securityInput: SecurityConfigInput = {
        deviceName: device,
        acls: [{
          name,
          type: aclType as 'standard' | 'extended',
          rules: parsedRules.map((r) => ({
            action: r.action,
            protocol: r.protocol as 'ip' | 'tcp' | 'udp' | 'icmp' | undefined,
            source: r.source,
            sourceWildcard: r.sourceWildcard,
            destination: r.destination,
            destinationWildcard: r.destinationWildcard,
          })),
        }],
      };

      const validationResult = validateSecurityConfig(securityInput);
      if (!validationResult.ok) {
        const errors = validationResult.errors.map((e) => `  - ${e.path}: ${e.message}`).join('\n');
        console.error(chalk.red('Error de validacion:\n' + errors));
        process.exit(1);
      }

      const iosCommands = generateSecurityCommands(securityInput);
      const isDryRun = options.dryRun || !options.apply;

      if (isDryRun) {
        console.log(chalk.cyan('\n[DRY-RUN] Comandos ACL ' + chalk.bold(name) + ' para ' + chalk.bold(device) + ':\n'));
        iosCommands.forEach((c, i) => console.log(`  ${i + 1}. ${chalk.green(c)}`));
        console.log();
        return;
      }

      const result = await runCommand<{ device: string; aclName: string; commands: string[]; executed: number }>({
        action: 'config-acl', meta: CONFIG_ACL_META, flags,
        payloadPreview: { device, name, ruleCount: parsedRules.length },
        execute: async (ctx) => {
          await ctx.controller.start();
          try {
            const devices = await fetchDeviceList(ctx.controller);
            const iosDevices = getIOSCapableDevices(devices);
            const selected = iosDevices.find((d) => d.name === device);
            if (!selected) { return createErrorResult('config-acl', { message: `Dispositivo "${device}" no encontrado` }); }
            await ctx.controller.configIosWithResult(device, iosCommands, { save: true });
            return createSuccessResult('config-acl', { device, aclName: name, commands: iosCommands, executed: iosCommands.length });
          } finally { await ctx.controller.stop(); }
        },
      });

      if (result.ok) {
        console.log(chalk.green('\n✓ ACL ' + chalk.bold(name) + ' configurada en ' + chalk.cyan(device) + ' (' + result.data?.executed + ' comandos)\n'));
      } else {
        console.error(chalk.red('\n✗ Error: ' + result.error?.message + '\n'));
        process.exit(1);
      }
    });

  return cmd;
}
