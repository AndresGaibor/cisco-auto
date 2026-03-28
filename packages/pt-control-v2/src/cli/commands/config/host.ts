// ============================================================================
// PT Control V2 - Config Host Command
// ============================================================================

import { Args, Flags } from '@oclif/core';
import { input, confirm } from '@inquirer/prompts';
import pc from 'picocolors';
import { BaseCommand, createSpinner } from '../../base-command.js';
import { createDefaultPTController } from '../../../controller/index.js';
import { DeviceNotFoundError, ValidationError } from '../../errors/index.js';
import type { DeviceState } from '../../../types/index.js';

export default class ConfigHost extends BaseCommand {
  static description = 'Configure IP settings for a host device (PC/Server)';

  static examples = [
    '<%= config.bin %> config host PC1 --ip 192.168.1.10 --mask 255.255.255.0',
    '<%= config.bin %> config host PC1 --dhcp',
    '<%= config.bin %> config host PC1 --ip 192.168.1.10 --gateway 192.168.1.1 --dns 8.8.8.8',
  ];

  static args = {
    device: Args.string({
      description: 'Device name (PC or Server)',
    }),
  };

  static flags = {
    ...BaseCommand.baseFlags,
    ip: Flags.string({
      description: 'IP address',
      char: 'i',
    }),
    mask: Flags.string({
      description: 'Subnet mask',
      char: 'm',
    }),
    gateway: Flags.string({
      description: 'Default gateway',
      char: 'g',
    }),
    dns: Flags.string({
      description: 'DNS server',
      char: 'd',
    }),
    dhcp: Flags.boolean({
      description: 'Use DHCP',
      default: false,
    }),
  };

  async run(): Promise<void> {
    let device = this.args.device as string | undefined;
    const flags = this.flags;

    // Interactive mode
    if (!device || (!flags.ip && !flags.dhcp)) {
      const interactive = await this.promptForHost(device);
      device = interactive.device;
    }

    // Validate
    if (!device || device.trim() === '') {
      throw new ValidationError('Device name is required');
    }

    if (!flags.dhcp && !flags.ip) {
      throw new ValidationError('Either --ip or --dhcp is required');
    }

    const ip = flags.ip as string | undefined;
    if (ip && !this.isValidIp(ip)) {
      throw new ValidationError(`Invalid IP address: ${ip}`);
    }

    const controller = createDefaultPTController();
    const spinner = createSpinner(`Configuring ${pc.cyan(device)}...`);

    await controller.start();

    try {
      // Check if device exists
      const devices = await controller.listDevices() as DeviceState[];
      const exists = devices.some((d: DeviceState) => d.name === device);

      if (!exists) {
        throw new DeviceNotFoundError(device);
      }

      spinner.start();

      const config: {
        ip?: string;
        mask?: string;
        gateway?: string;
        dns?: string;
        dhcp?: boolean;
      } = {};

      if (flags.dhcp) {
        config.dhcp = true;
      } else {
        if (flags.ip) config.ip = flags.ip as string;
        if (flags.mask) config.mask = flags.mask as string;
        if (flags.gateway) config.gateway = flags.gateway as string;
        if (flags.dns) config.dns = flags.dns as string;
      }

      await controller.configHost(device, config);
      spinner.succeed(`Host ${pc.cyan(device)} configured`);

      if (this.globalFlags.format === 'json') {
        this.outputData({ success: true, device, ...config });
      } else {
        if (flags.dhcp) {
          this.print('  Mode: DHCP');
        } else {
          if (flags.ip) this.print(`  IP: ${flags.ip}`);
          if (flags.mask) this.print(`  Mask: ${flags.mask}`);
          if (flags.gateway) this.print(`  Gateway: ${flags.gateway}`);
          if (flags.dns) this.print(`  DNS: ${flags.dns}`);
        }
      }
    } catch (error) {
      spinner.fail(`Failed to configure ${device}`);
      throw error;
    } finally {
      await controller.stop();
    }
  }

  private isValidIp(ip: string): boolean {
    const parts = ip.split('.');
    if (parts.length !== 4) return false;
    return parts.every(part => {
      const num = parseInt(part, 10);
      return !isNaN(num) && num >= 0 && num <= 255;
    });
  }

  private async promptForHost(providedDevice?: string): Promise<{ device: string }> {
    const controller = createDefaultPTController();
    await controller.start();

    try {
      const devices = await controller.listDevices() as DeviceState[];

      const device = providedDevice || await input({
        message: 'Device name (PC or Server)',
        validate: (value) => {
          if (value.trim() === '') return 'Device name is required';
          if (!devices.some(d => d.name === value)) return `Device '${value}' not found`;
          return true;
        },
      });

      // Prompt for configuration if not provided
      if (!this.flags.dhcp && !this.flags.ip) {
        const useDhcp = await confirm({
          message: 'Use DHCP?',
          default: false,
        });

        if (!useDhcp) {
          this.flags.ip = await input({
            message: 'IP address',
            validate: (value) => this.isValidIp(value) || 'Invalid IP address',
          });

          this.flags.mask = await input({
            message: 'Subnet mask',
            default: '255.255.255.0',
          });

          const setGateway = await confirm({
            message: 'Set default gateway?',
            default: true,
          });

          if (setGateway) {
            this.flags.gateway = await input({
              message: 'Gateway IP',
            });
          }
        } else {
          this.flags.dhcp = true;
        }
      }

      return { device };
    } finally {
      await controller.stop();
    }
  }
}