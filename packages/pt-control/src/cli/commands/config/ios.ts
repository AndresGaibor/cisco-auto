// ============================================================================
// PT Control V2 - Config IOS Command
// ============================================================================

import { Args, Flags } from '@oclif/core';
import { input } from '@inquirer/prompts';
import pc from 'picocolors';
import { BaseCommand, createSpinner } from '../../base-command.js';
import { createDefaultPTController } from '../../../controller/index.js';
import { DeviceNotFoundError, ValidationError } from '../../errors/index.js';
import type { DeviceState } from '../../../types/index.js';

export default class ConfigIos extends BaseCommand {
  static override description = 'Execute IOS commands on a device';

  static override examples = [
    '<%= config.bin %> config ios R1 --commands "conf t" "hostname Router1"',
    '<%= config.bin %> config ios S1 --file ./config.txt',
    '<%= config.bin %> config ios R1  # Interactive mode',
  ];

  static override args = {
    device: Args.string({
      description: 'Device name',
    }),
  };

  static override flags = {
    ...BaseCommand.baseFlags,
    commands: Flags.string({
      description: 'IOS commands to execute (can be specified multiple times)',
      multiple: true,
      char: 'c',
    }),
    file: Flags.string({
      description: 'File containing IOS commands',
      char: 'f',
    }),
    save: Flags.boolean({
      description: 'Save configuration after applying',
      default: true,
    }),
  };

  async run(): Promise<void> {
    let device = this.args.device as string | undefined;
    let commands: string[] = [];

    // Get commands from file if specified
    const filePath = this.flags.file as string | undefined;
    if (filePath) {
      const fs = await import('fs/promises');
      const content = await fs.readFile(filePath, 'utf-8');
      commands = content.split('\n').filter(line => line.trim() && !line.startsWith('!'));
    } else {
      const cmdFlags = this.flags.commands as string[] | undefined;
      if (cmdFlags && cmdFlags.length > 0) {
        commands = cmdFlags;
      }
    }

    const save = this.flags.save as boolean;

    await this.runLoggedCommand({
      action: 'config:ios',
      targetDevice: () => device,
      context: {
        commandsCount: commands.length,
        save,
        source: filePath ? 'file' : 'interactive-or-flags',
      },
      execute: async () => {
        if (!device || commands.length === 0) {
          const interactive = await this.promptForConfig(device, commands);
          device = interactive.device;
          commands = interactive.commands;
        }

        if (!device || device.trim() === '') {
          throw new ValidationError('Device name is required');
        }
        if (commands.length === 0) {
          throw new ValidationError('At least one command is required');
        }

        const controller = createDefaultPTController();
        this.trackController(controller);
        const spinner = createSpinner(`Configuring ${pc.cyan(device)}...`);

        await controller.start();

        try {
          const devices = await controller.listDevices() as DeviceState[];
          const exists = devices.some((d: DeviceState) => d.name === device);

          if (!exists) {
            throw new DeviceNotFoundError(device);
          }

          spinner.start();
          await controller.configIos(device, commands, { save });
          spinner.succeed(`Configuration applied to ${pc.cyan(device)}`);

          if (this.globalFlags.format === 'json') {
            this.outputData({ success: true, device, commandsCount: commands.length });
          } else {
            this.print(`  Commands: ${commands.length}`);
            this.print(`  Saved: ${save}`);
          }
        } catch (error) {
          spinner.fail(`Failed to configure ${device}`);
          throw error;
        } finally {
          await controller.stop();
        }
      },
    });
  }

  private async promptForConfig(
    providedDevice?: string,
    providedCommands?: string[]
  ): Promise<{ device: string; commands: string[] }> {
    const controller = createDefaultPTController();
    this.trackController(controller);
    await controller.start();

    try {
      const devices = await controller.listDevices() as DeviceState[];

      // Filter to IOS devices (routers, switches)
      const iosDevices = devices.filter(d =>
        d.type === 'router' || d.type === 'switch' || d.model.includes('2911') || d.model.includes('2960')
      );

      if (iosDevices.length === 0) {
        throw new ValidationError('No IOS-capable devices found in topology');
      }

      const device = providedDevice || await input({
        message: 'Device name',
        validate: (value) => {
          if (value.trim() === '') return 'Device name is required';
          if (!devices.some(d => d.name === value)) return `Device '${value}' not found`;
          return true;
        },
      });

      // Get commands interactively
      let commands = providedCommands && providedCommands.length > 0 ? providedCommands : [];

      if (commands.length === 0) {
        const firstCmd = await input({
          message: 'Enter first command',
        });

        commands = [firstCmd];

        let addMore = true;
        while (addMore) {
          const more = await input({
            message: 'Another command (leave empty to finish)',
          });
          if (more.trim() === '') {
            addMore = false;
          } else {
            commands.push(more);
          }
        }
      }

      return { device, commands };
    } finally {
      await controller.stop();
    }
  }
}
