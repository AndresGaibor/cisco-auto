// ============================================================================
// PT Control V2 - Device Move Command
// ============================================================================

import { Args, Flags } from '@oclif/core';
import pc from 'picocolors';
import { BaseCommand, createSpinner } from '../../base-command.js';
import { DeviceNotFoundError, ValidationError } from '../../errors/index.js';
import type { DeviceState } from '../../../types/index.js';

export default class DeviceMove extends BaseCommand {
  static override description = 'Move a device to a new position on the canvas';

  static override examples = [
    '<%= config.bin %> device move Router1 --x 200 --y 150',
    '<%= config.bin %> device move Switch1 -x 300 -y 400',
  ];

  static override args = {
    name: Args.string({
      description: 'Device name',
      required: true,
    }),
  };

  static override flags = {
    ...BaseCommand.baseFlags,
    x: Flags.integer({
      description: 'X coordinate on the canvas',
      required: true,
      char: 'x',
    }),
    y: Flags.integer({
      description: 'Y coordinate on the canvas',
      required: true,
      char: 'y',
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(DeviceMove);
    const name = args.name as string;
    const x = flags.x as number;
    const y = flags.y as number;

    await this.runLoggedCommand({
      action: 'device:move',
      targetDevice: () => name,
      context: { x, y },
      execute: async () => {
        if (!name || name.trim() === '') {
          throw new ValidationError('Device name is required');
        }
        if (typeof x !== 'number' || typeof y !== 'number') {
          throw new ValidationError('X and Y coordinates must be numbers');
        }

        const controller = this.createController();
        this.trackController(controller);
        const spinner = createSpinner(`Moving device ${pc.cyan(name)} to (${x}, ${y})...`);

        await controller.start();

        try {
          const devices = await controller.listDevices() as DeviceState[];
          const exists = devices.some((d: DeviceState) => d.name === name);

          if (!exists) {
            throw new DeviceNotFoundError(name);
          }

          spinner.start();
          const result = await controller.moveDevice(name, x, y);

          if (!result.ok) {
            spinner.fail(`Failed to move device ${name}: ${result.error}`);
            throw new Error(result.error);
          }

          spinner.succeed(`Device ${pc.cyan(name)} moved to (${x}, ${y})`);

          if (this.globalFlags.format === 'json') {
            this.outputData({ success: true, name, x, y });
          }
        } catch (error) {
          if (error instanceof DeviceNotFoundError) {
            spinner.fail(`Device ${name} not found`);
          } else if (!(error instanceof Error) || !error.message.includes('Failed to move')) {
            spinner.fail(`Failed to move device ${name}`);
          }
          throw error;
        } finally {
          await controller.stop();
        }
      },
    });
  }
}