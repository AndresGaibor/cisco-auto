// ============================================================================
// PT Control V2 - Device Remove Command
// ============================================================================

import { Args, Flags } from '@oclif/core';
import { input } from '@inquirer/prompts';
import pc from 'picocolors';
import { BaseCommand, createSpinner } from '../../base-command.js';
import { createDefaultPTController } from '../../../controller/index.js';
import { DeviceNotFoundError, ValidationError } from '../../errors/index.js';
import type { DeviceState } from '../../../types/index.js';

export default class DeviceRemove extends BaseCommand {
  static override description = 'Remove a device from the topology';

  static override examples = [
    '<%= config.bin %> device remove R1',
    '<%= config.bin %> device remove S1 --force',
    '<%= config.bin %> device remove  # Interactive mode',
  ];

  static override args = {
    name: Args.string({
      description: 'Device name to remove',
    }),
  };

  static override flags = {
    ...BaseCommand.baseFlags,
    force: Flags.boolean({
      description: 'Skip confirmation prompt',
      default: false,
      char: 'f',
    }),
  };

  async run(): Promise<void> {
    let name = this.args.name as string | undefined;
    const force = this.flags.force as boolean;

    await this.runLoggedCommand({
      action: 'device:remove',
      targetDevice: () => name,
      context: { force },
      execute: async () => {
        if (!name) {
          name = await input({
            message: 'Device name to remove',
            validate: (value) => value.trim() !== '' || 'Name is required',
          });
        }

        if (!name || name.trim() === '') {
          throw new ValidationError('Device name is required');
        }

        const controller = createDefaultPTController();
        this.trackController(controller);
        const spinner = createSpinner(`Removing device ${pc.cyan(name)}...`);

        await controller.start();

        try {
          const devices = await controller.listDevices() as DeviceState[];
          const exists = devices.some((d: DeviceState) => d.name === name);

          if (!exists) {
            throw new DeviceNotFoundError(name);
          }

          await this.confirmDestructiveAction({
            action: 'topology-change',
            details: `Remove device ${name}`,
            targetDevice: name,
            skipPrompt: force || this.globalFlags.format === 'json',
          });

          spinner.start();
          await controller.removeDevice(name);
          spinner.succeed(`Device ${pc.cyan(name)} removed successfully`);

          if (this.globalFlags.format === 'json') {
            this.outputData({ success: true, name });
          }
        } catch (error) {
          if (error instanceof DeviceNotFoundError) {
            spinner.fail(`Device ${name} not found`);
          } else {
            spinner.fail(`Failed to remove device ${name}`);
          }
          throw error;
        } finally {
          await controller.stop();
        }
      },
    });
  }
}
