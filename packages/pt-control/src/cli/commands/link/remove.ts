// ============================================================================
// PT Control V2 - Link Remove Command
// ============================================================================

import { Args, Flags } from '@oclif/core';
import { input } from '@inquirer/prompts';
import pc from 'picocolors';
import { BaseCommand, createSpinner } from '../../base-command.js';
import { ValidationError } from '../../errors/index.js';

export default class LinkRemove extends BaseCommand {
  static override description = 'Remove a link from the topology';

  static override examples = [
    '<%= config.bin %> link remove R1:GigabitEthernet0/0',
    '<%= config.bin %> link remove S1:GigabitEthernet0/1 --force',
  ];

  static override args = {
    port: Args.string({
      description: 'Port specification (device:port)',
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
    let portSpec = this.args.port as string | undefined;
    const force = this.flags.force as boolean;

    await this.runLoggedCommand({
      action: 'link:remove',
      targetDevice: () => portSpec,
      execute: async () => {
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

        if (!portSpec || !this.isValidPortSpec(portSpec)) {
          throw new ValidationError('Invalid port format. Expected: device:port');
        }

        const { device, port } = this.parsePortSpec(portSpec);

        await this.confirmDestructiveAction({
          action: 'topology-change',
          details: `Remove link on ${portSpec}`,
          targetDevice: device,
          skipPrompt: force || this.globalFlags.format === 'json',
        });

        const controller = this.createController();
        this.trackController(controller);
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
      },
    });
  }

  private isValidPortSpec(spec: string): boolean {
    const parts = spec.split(':');
    return parts.length >= 2 && parts[0]!.length > 0;
  }

  private parsePortSpec(spec: string): { device: string; port: string } {
    const [device, ...portParts] = spec.split(':');
    return { device: device!, port: portParts.join(':') };
  }
}
