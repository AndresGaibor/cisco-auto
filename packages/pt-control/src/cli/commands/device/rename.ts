// ============================================================================
// PT Control V2 - Device Rename Command
// ============================================================================

import { Args } from '@oclif/core';
import { input } from '@inquirer/prompts';
import pc from 'picocolors';
import { BaseCommand, createSpinner } from '../../base-command.js';
import { createDefaultPTController } from '../../../controller/index.js';
import { DeviceNotFoundError, ValidationError } from '../../errors/index.js';
import type { DeviceState } from '../../../types/index.js';

export default class DeviceRename extends BaseCommand {
  static override description = 'Rename a device in the topology';

  static override examples = [
    '<%= config.bin %> device rename R1 Router1',
    '<%= config.bin %> device rename S1 CoreSwitch',
  ];

  static override args = {
    oldName: Args.string({
      description: 'Current device name',
    }),
    newName: Args.string({
      description: 'New device name',
    }),
  };

  static override flags = {
    ...BaseCommand.baseFlags,
  };

  async run(): Promise<void> {
    let oldName = this.args.oldName as string | undefined;
    let newName = this.args.newName as string | undefined;

    await this.runLoggedCommand({
      action: 'device:rename',
      targetDevice: () => oldName,
      context: { newName },
      execute: async () => {
        if (!oldName || !newName) {
          const interactive = await this.promptForRename(oldName, newName);
          oldName = interactive.oldName;
          newName = interactive.newName;
        }

        if (!oldName || oldName.trim() === '') {
          throw new ValidationError('Current device name is required');
        }
        if (!newName || newName.trim() === '') {
          throw new ValidationError('New device name is required');
        }
        if (oldName === newName) {
          throw new ValidationError('New name must be different from current name');
        }

        const controller = createDefaultPTController();
        this.trackController(controller);
        const spinner = createSpinner(`Renaming device ${pc.cyan(oldName)} to ${pc.cyan(newName)}...`);

        await controller.start();

        try {
          const devices = await controller.listDevices() as DeviceState[];
          const exists = devices.some((d: DeviceState) => d.name === oldName);

          if (!exists) {
            throw new DeviceNotFoundError(oldName);
          }

          spinner.start();
          await controller.renameDevice(oldName, newName);
          spinner.succeed(`Device renamed: ${pc.cyan(oldName)} -> ${pc.cyan(newName)}`);

          if (this.globalFlags.format === 'json') {
            this.outputData({ success: true, oldName, newName });
          }
        } catch (error) {
          if (error instanceof DeviceNotFoundError) {
            spinner.fail(`Device ${oldName} not found`);
          } else {
            spinner.fail(`Failed to rename device ${oldName}`);
          }
          throw error;
        } finally {
          await controller.stop();
        }
      },
    });
  }

  private async promptForRename(
    providedOldName?: string,
    providedNewName?: string
  ): Promise<{ oldName: string; newName: string }> {
    const controller = createDefaultPTController();
    this.trackController(controller);
    await controller.start();

    try {
      const devices = await controller.listDevices() as DeviceState[];
      const deviceNames = devices.map((d: DeviceState) => d.name);

      const oldName = providedOldName || await input({
        message: 'Current device name',
        validate: (value) => {
          if (value.trim() === '') return 'Name is required';
          if (!deviceNames.includes(value)) return `Device '${value}' not found`;
          return true;
        },
      });

      const newName = providedNewName || await input({
        message: 'New device name',
        validate: (value) => {
          if (value.trim() === '') return 'Name is required';
          if (deviceNames.includes(value)) return `Device '${value}' already exists`;
          return true;
        },
      });

      return { oldName, newName };
    } finally {
      await controller.stop();
    }
  }
}
