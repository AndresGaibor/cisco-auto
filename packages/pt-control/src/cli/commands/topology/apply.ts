// ============================================================================
// PT Control V2 - Topology Apply Command
// ============================================================================

import { Flags } from '@oclif/core';
import { readFileSync, existsSync } from 'fs';
import pc from 'picocolors';
import { BaseCommand, createSpinner } from '../../base-command.js';
import { createDefaultPTController } from '../../../controller/index.js';
import { ValidationError } from '../../errors/index.js';
import type { DeviceState, TopologySnapshot } from '../../../types/index.js';

interface VlanConfig {
  id: number;
  name?: string;
}

interface TrunkPortsConfig {
  [deviceName: string]: string[];
}

interface HostIpConfig {
  ip: string;
  mask?: string;
  gateway?: string;
  dns?: string;
  dhcp?: boolean;
}

interface HostIpConfigMap {
  [deviceName: string]: HostIpConfig;
}

interface SshConfig {
  domain: string;
  username: string;
  password: string;
}

interface TopologyConfig {
  vlans?: VlanConfig[];
  trunkPorts?: TrunkPortsConfig;
  hostIpConfig?: HostIpConfigMap;
  sshConfig?: SshConfig;
}

interface ApplyResult {
  action: 'apply' | 'skip' | 'error';
  target: string;
  details: string;
}

export default class TopologyApply extends BaseCommand {
  static override description = 'Apply configuration to topology devices';

  static override examples = [
    '<%= config.bin %> topology apply --config ./topology-config.json',
    '<%= config.bin %> topology apply --config ./topology-config.json --dry-run',
    '<%= config.bin %> topology apply --config ./topology-config.json --force',
  ];

  static override flags = {
    ...BaseCommand.baseFlags,
    config: Flags.string({
      description: 'Path to topology configuration JSON file',
      char: 'c',
      required: true,
    }),
    'dry-run': Flags.boolean({
      description: 'Show what would be applied without making changes',
      default: false,
    }),
    force: Flags.boolean({
      description: 'Apply changes even to powered-off devices',
      default: false,
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(TopologyApply);

    await this.runLoggedCommand({
      action: 'topology:apply',
      context: {
        format: this.globalFlags.format,
        dryRun: flags['dry-run'],
      },
      execute: async () => {
        const configPath = flags.config as string;

        if (!existsSync(configPath)) {
          throw new ValidationError(`Config file not found: ${configPath}`);
        }

        let config: TopologyConfig;
        try {
          const raw = readFileSync(configPath, 'utf-8');
          config = JSON.parse(raw) as TopologyConfig;
        } catch {
          throw new ValidationError(`Invalid JSON in config file: ${configPath}`);
        }

        if (Object.keys(config).length === 0) {
          throw new ValidationError('Config file is empty');
        }

        const controller = createDefaultPTController();
        this.trackController(controller);
        const spinner = createSpinner('Loading current topology...');

        await controller.start();

        try {
          spinner.start();
          const snapshot = await controller.snapshot() as TopologySnapshot;
          const devices = Object.values(snapshot.devices);
          const results: ApplyResult[] = [];

          const hasVlanConfig = config.vlans && config.vlans.length > 0;
          const hasTrunkConfig = config.trunkPorts && Object.keys(config.trunkPorts).length > 0;
          const hasIpConfig = config.hostIpConfig && Object.keys(config.hostIpConfig).length > 0;
          const hasSshConfig = config.sshConfig != null;

          if (!hasVlanConfig && !hasTrunkConfig && !hasIpConfig && !hasSshConfig) {
            this.print('No configuration sections found in config file.');
            this.print('Expected at least one of: vlans, trunkPorts, hostIpConfig, sshConfig');
            return;
          }

          if (flags['dry-run']) {
            this.print(pc.bold('\nDry-run mode — no changes will be made\n'));
          }

          for (const device of devices) {
            const isPowered = device.power;
            const shouldSkip = !isPowered && !flags.force;

            if (hasIpConfig && config.hostIpConfig) {
              const ipConfig = config.hostIpConfig[device.name];
              if (ipConfig) {
                if (shouldSkip) {
                  results.push({ action: 'skip', target: device.name, details: 'Device is powered off' });
                  this.print(`  ${pc.yellow('~')} ${pc.cyan(device.name)}: ${pc.dim('skip (powered off)')}`);
                  continue;
                }

                const details = `IP ${ipConfig.dhcp ? 'DHCP' : `${ipConfig.ip}/${ipConfig.mask ?? '??'}`}`;
                if (flags['dry-run']) {
                  results.push({ action: 'apply', target: device.name, details });
                  this.print(`  ${pc.green('+')} ${pc.cyan(device.name)}: Would apply host IP config (${details})`);
                } else {
                  try {
                    await controller.configHost(device.name, {
                      ip: ipConfig.ip,
                      mask: ipConfig.mask,
                      gateway: ipConfig.gateway,
                      dns: ipConfig.dns,
                      dhcp: ipConfig.dhcp,
                    });
                    results.push({ action: 'apply', target: device.name, details });
                    this.print(`  ${pc.green('+')} ${pc.cyan(device.name)}: Applied host IP config (${details})`);
                  } catch (err) {
                    const msg = err instanceof Error ? err.message : String(err);
                    results.push({ action: 'error', target: device.name, details: msg });
                    this.print(`  ${pc.red('!')} ${pc.cyan(device.name)}: Failed - ${msg}`);
                  }
                }
              }
            }

            if (hasSshConfig && config.sshConfig) {
              if (device.type === 'router' || device.type === 'switch' || device.type === 'switch_layer3') {
                if (shouldSkip) {
                  results.push({ action: 'skip', target: device.name, details: 'Device is powered off' });
                  this.print(`  ${pc.yellow('~')} ${pc.cyan(device.name)}: ${pc.dim('skip SSH config (powered off)')}`);
                  continue;
                }

                const details = `SSH for ${config.sshConfig.username}@${config.sshConfig.domain}`;
                if (flags['dry-run']) {
                  results.push({ action: 'apply', target: device.name, details });
                  this.print(`  ${pc.green('+')} ${pc.cyan(device.name)}: Would apply SSH config (${details})`);
                } else {
                  this.print(`  ${pc.dim('-')} ${pc.cyan(device.name)}: SSH config not yet implemented via CLI`);
                }
              }
            }
          }

          if (hasVlanConfig && config.vlans) {
            this.print(`\n${pc.bold('VLANs to apply:')}`);
            for (const vlan of config.vlans) {
              this.print(`  ${pc.cyan(`VLAN ${vlan.id}`)}: ${vlan.name ?? '(no name)'}`);
            }
          }

          if (hasTrunkConfig && config.trunkPorts) {
            this.print(`\n${pc.bold('Trunk ports to apply:')}`);
            for (const [deviceName, ports] of Object.entries(config.trunkPorts)) {
              this.print(`  ${pc.cyan(deviceName)}: ${ports.join(', ')}`);
            }
          }

          spinner.stop();

          const applied = results.filter(r => r.action === 'apply').length;
          const skipped = results.filter(r => r.action === 'skip').length;
          const errors = results.filter(r => r.action === 'error').length;

          this.print(`\n${'─'.repeat(50)}`);
          this.print(`Summary: ${pc.green(`+${applied}`)} applied, ${pc.yellow(`~${skipped}`)} skipped, ${pc.red(`!${errors}`)} errors`);

          if (flags['dry-run']) {
            this.print(pc.yellow('\nDry-run complete. Run without --dry-run to apply changes.'));
          }

          if (this.globalFlags.format === 'json' || this.globalFlags.jq) {
            this.outputData({
              dryRun: flags['dry-run'],
              applied,
              skipped,
              errors,
              results,
            });
          }
        } finally {
          await controller.stop();
        }
      },
    });
  }
}
