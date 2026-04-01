// ============================================================================
// PT Control V2 - Device Add Command
// ============================================================================

import { Args, Flags } from '@oclif/core';
import { input, select } from '@inquirer/prompts';
import pc from 'picocolors';
import { BaseCommand, createSpinner, Flags as BaseFlags } from '../../base-command.js';
import { createDefaultPTController } from '../../../controller/index.js';
import { ValidationError } from '../../errors/index.js';
import type { DeviceState } from '../../../types/index.js';
import { formatDeviceType } from '../../../utils/device-type.js';

// Common device models
const DEVICE_MODELS: Record<string, { name: string; type: string }[]> = {
  router: [
    { name: '2911', type: 'router' },
    { name: '4321', type: 'router' },
    { name: '1941', type: 'router' },
    { name: '2901', type: 'router' },
    { name: '2951', type: 'router' },
  ],
  switch: [
    { name: '2960', type: 'switch' },
    { name: '2960-24TT', type: 'switch' },
    { name: '3560', type: 'switch' },
    { name: '3650', type: 'switch' },
  ],
  pc: [
    { name: 'PC', type: 'pc' },
    { name: 'Laptop', type: 'pc' },
  ],
  server: [
    { name: 'Server', type: 'server' },
    { name: 'Server-PT', type: 'server' },
  ],
};

export default class DeviceAdd extends BaseCommand {
  static override description = 'Add a new device to the topology';

  static override examples = [
    '<%= config.bin %> device add R1 2911',
    '<%= config.bin %> device add S1 2960 --x 200 --y 100',
    '<%= config.bin %> device add PC1 PC',
    '<%= config.bin %> device add  # Interactive mode',
  ];

  static override args = {
    name: Args.string({
      description: 'Device name (e.g., R1, S1, PC1)',
    }),
    model: Args.string({
      description: 'Device model (e.g., 2911, 2960, PC)',
    }),
  };

  static override flags = {
    ...BaseCommand.baseFlags,
    x: Flags.integer({
      description: 'X position on the workspace',
      default: 100,
    }),
    y: Flags.integer({
      description: 'Y position on the workspace',
      default: 100,
    }),
  };

  async run(): Promise<void> {
    let name = this.args.name as string | undefined;
    let model = this.args.model as string | undefined;
    const x = this.flags.x as number;
    const y = this.flags.y as number;

    await this.runLoggedCommand({
      action: 'device:add',
      targetDevice: () => name,
      context: { model, x, y },
      execute: async () => {
        // Interactive mode if args not provided
        if (!name || !model) {
          const interactive = await this.promptForDevice(name, model);
          name = interactive.name;
          model = interactive.model;
        }

        if (!name || name.trim() === '') {
          throw new ValidationError('Device name is required');
        }
        if (!model || model.trim() === '') {
          throw new ValidationError('Device model is required');
        }

        const controller = createDefaultPTController();
        this.trackController(controller);
        const spinner = createSpinner(`Adding device ${pc.cyan(name)}...`);

        await controller.start();

        try {
          spinner.start();

          await controller.addDevice(name, model, { x, y });

          const device = await controller.inspectDevice(name);

          spinner.succeed(`Device ${pc.cyan(name)} added successfully`);

          if (this.globalFlags.format === 'json') {
            this.outputData({
              ...device,
              type: formatDeviceType(device.type),
            });
          } else {
            this.print(`  Name: ${device.name}`);
            this.print(`  Type: ${formatDeviceType(device.type)}`);
            this.print(`  Model: ${device.model}`);
            this.print(`  Status: ${device.power ? 'on' : 'off'}`);
            if (device.ports?.length) {
              this.print(`  Ports: ${device.ports.length}`);
            }
          }
        } catch (error) {
          spinner.fail(`Failed to add device ${name}`);
          throw error;
        } finally {
          await controller.stop();
        }
      },
    });
  }

  private async promptForDevice(
    providedName?: string,
    providedModel?: string
  ): Promise<{ name: string; model: string }> {
    // If non-interactive output format, throw error
    if (this.globalFlags.format === 'json' && !this.globalFlags.verbose) {
      throw new ValidationError('Device name and model are required in non-interactive mode');
    }

    const name = providedName || await input({
      message: 'Device name',
      validate: (value) => value.trim() !== '' || 'Name is required',
    });

    // Select device type first
    const deviceType = await select({
      message: 'Device type',
      choices: [
        { name: 'Router', value: 'router' },
        { name: 'Switch', value: 'switch' },
        { name: 'PC', value: 'pc' },
        { name: 'Server', value: 'server' },
      ],
    });

    // Then select model based on type
    const models = DEVICE_MODELS[deviceType] || [];
    let model: string;

    if (models.length > 0) {
      model = providedModel || await select({
        message: 'Device model',
        choices: models.map(m => ({ name: `${m.name} (${m.type})`, value: m.name })),
      });
    } else {
      model = providedModel || await input({
        message: 'Device model',
        default: deviceType.toUpperCase(),
      });
    }

    return { name, model };
  }
}
