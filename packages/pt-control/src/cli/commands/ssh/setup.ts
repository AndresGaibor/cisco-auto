// ============================================================================
// PT Control V2 - SSH Setup Command
// ============================================================================

import { Args, Flags } from '@oclif/core';
import pc from 'picocolors';
import { BaseCommand, createSpinner } from '../../base-command.js';
import { createDefaultPTController } from '../../../controller/index.js';
import { buildSshCommands } from '../../../utils/ios-commands.js';
import { DeviceNotFoundError, ValidationError } from '../../errors/index.js';
import type { DeviceState } from '../../../types/index.js';

export default class SshSetup extends BaseCommand {
  static override description = 'Configure SSH access on a device';

  static override examples = [
    '<%= config.bin %> ssh setup R1',
    '<%= config.bin %> ssh setup R1 --domain cisco.local --user admin --pass C1sco12345',
    '<%= config.bin %> ssh setup Router1 --domain mi-red.local',
  ];

  static override args = {
    device: Args.string({
      description: 'Device name (router or switch)',
      required: true,
    }),
  };

  static override flags = {
    ...BaseCommand.baseFlags,
    domain: Flags.string({
      description: 'Domain name for SSH (e.g., "cisco.local")',
      default: 'cisco-lab.local',
    }),
    user: Flags.string({
      description: 'Username for SSH access',
      default: 'admin',
    }),
    pass: Flags.string({
      description: 'Password for SSH access',
      default: 'admin',
    }),
    save: Flags.boolean({
      description: 'Save configuration after applying',
      default: true,
    }),
  };

  async run(): Promise<void> {
    const device = this.args.device as string;
    const domain = this.flags.domain as string;
    const username = this.flags.user as string;
    const password = this.flags.pass as string;
    const save = this.flags.save as boolean;

    await this.runLoggedCommand({
      action: 'ssh:setup',
      targetDevice: () => device,
      context: {
        device,
        domain,
        username,
        save,
      },
      execute: async () => {
        // Validar device
        if (!device || device.trim() === '') {
          throw new ValidationError('Device name is required');
        }

        // Validar domain
        if (!domain || domain.trim() === '') {
          throw new ValidationError('Domain name is required');
        }

        // Validar username
        if (!username || username.trim() === '') {
          throw new ValidationError('Username is required');
        }

        // Validar password
        if (!password || password.trim() === '') {
          throw new ValidationError('Password is required');
        }

        // Generar comandos IOS usando utilitaria T1
        const commands = buildSshCommands(domain, username, password);

        this.logDebug(`Generated ${commands.length} IOS commands for SSH setup`);

        const controller = createDefaultPTController();
        const spinner = createSpinner(`Configuring SSH on ${pc.cyan(device)}...`);

        await controller.start();

        try {
          // Verificar que el dispositivo existe
          const devices = await controller.listDevices() as DeviceState[];
          const exists = devices.some((d: DeviceState) => d.name === device);

          if (!exists) {
            throw new DeviceNotFoundError(device);
          }

          spinner.start();
          await controller.configIos(device, commands, { save });
          spinner.succeed(`SSH configured on ${pc.cyan(device)}`);

          if (this.globalFlags.format === 'json') {
            this.outputData({
              success: true,
              device,
              domain,
              username,
              commandsCount: commands.length,
              saved: save,
            });
          } else {
            this.print(`  Domain: ${domain}`);
            this.print(`  Username: ${username}`);
            this.print(`  Commands: ${commands.length}`);
            this.print(`  Saved: ${save}`);
          }
        } catch (error) {
          spinner.fail(`Failed to configure SSH on ${device}`);
          throw error;
        } finally {
          await controller.stop();
        }
      },
    });
  }
}
