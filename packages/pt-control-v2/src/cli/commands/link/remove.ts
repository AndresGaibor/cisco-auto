// ============================================================================
// PT Control V2 - Link Remove Command
// ============================================================================

import { Args, Flags } from '@oclif/core';
import { input, confirm } from '@inquirer/prompts';
import pc from 'picocolors';
import { BaseCommand, createSpinner } from '../../base-command.js';
import { createDefaultPTController } from '../../../controller/index.js';
import { ValidationError } from '../../errors/index.js';

export default class LinkRemove extends BaseCommand {
  static description = 'Remove a link from the topology';

  static examples = [
    '<%= config.bin %> link remove R1:GigabitEthernet0/0',
    '<%= config.bin %> link remove S1:GigabitEthernet0/1 --force',
  ];

  static args = {
    port: Args.string({
      description: 'Port specification (device:port)',
    }),
  };

  static flags = {
    ...BaseCommand.baseFlags,
    force: Flags.boolean({
      description: 'Skip confirmation prompt',
      default: false,
      char: 'f',
    }),
  };

  async run(): Promise<void> {
    let portSpec = this.args.port as string | undefined;
    const force = this.flags.force as boolean;

    // Interactive mode if not provided
    if (!portSpec) {
      portSpec = await input({
        message: 'Port specification (device:port)',
        validate: (value) => {
          if (value.trim() === '') return 'Port specification is required';
          if (!value.includes(':')) return 'Format should be device:port';
          return true;
        },
      });
    }

    // Validate
    if (!portSpec || !this.isValidPortSpec(portSpec)) {
      throw new ValidationError('Invalid port format. Expected: device:port');
    }

    const { device, port } = this.parsePortSpec(portSpec);

    // Confirmation (skip if --force or JSON output)
    if (!force && this.globalFlags.format !== 'json') {
      const confirmed = await confirm({
        message: `Remove link on ${pc.cyan(portSpec)}?`,
        default: false,
      });

      if (!confirmed) {
        this.print('Cancelled.');
        return;
      }
    }

    const controller = createDefaultPTController();
    const spinner = createSpinner(`Removing link on ${pc.cyan(portSpec)}...`);

    await controller.start();

    try {
      spinner.start();
      await controller.removeLink(device, port);
      spinner.succeed(`Link removed: ${pc.cyan(portSpec)}`);

      if (this.globalFlags.format === 'json') {
        this.outputData({ success: true, device, port });
      }
    } catch (error) {
      spinner.fail(`Failed to remove link on ${portSpec}`);
      throw error;
    } finally {
      await controller.stop();
    }
  }

  private isValidPortSpec(spec: string): boolean {
    const parts = spec.split(':');
    return parts.length >= 2 && parts[0].length > 0;
  }

  private parsePortSpec(spec: string): { device: string; port: string } {
    const [device, ...portParts] = spec.split(':');
    return { device, port: portParts.join(':') };
  }
}