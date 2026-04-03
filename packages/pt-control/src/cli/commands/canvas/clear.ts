// ============================================================================
// PT Control V2 - Canvas Clear Command
// ============================================================================

import { Flags } from '@oclif/core';
import pc from 'picocolors';
import { BaseCommand, createSpinner } from '../../base-command.js';

export default class CanvasClear extends BaseCommand {
  static override description = 'Clear the entire Packet Tracer canvas';

  static override examples = [
    '<%= config.bin %> canvas clear',
    '<%= config.bin %> canvas clear --force',
    '<%= config.bin %> canvas clear --format json',
  ];

  static override flags = {
    ...BaseCommand.baseFlags,
    force: Flags.boolean({
      description: 'Skip confirmation prompt',
      default: false,
      char: 'f',
    }),
  };

  async run(): Promise<void> {
    const force = this.flags.force as boolean;

    await this.runLoggedCommand({
      action: 'canvas:clear',
      context: { force, format: this.globalFlags.format },
      execute: async () => {
        const controller = this.createController();
        this.trackController(controller);
        const spinner = createSpinner('Clearing canvas...');

        await controller.start();

        try {
          const initial = await controller.snapshot();
          const devices = Object.keys(initial?.devices ?? {}).length;
          const links = Object.keys(initial?.links ?? {}).length;

          await this.confirmDestructiveAction({
            action: 'topology-change',
            details: `Clear canvas with ${devices} device(s) and ${links} link(s)`,
            skipPrompt: force || this.globalFlags.format === 'json',
          });

          spinner.start();
          const result = await controller.clearTopology();

          if (result.remainingDevices === 0 && result.remainingLinks === 0) {
            spinner.succeed('Canvas cleared successfully');
          } else {
            spinner.fail(`Canvas still has ${result.remainingDevices} device(s) and ${result.remainingLinks} link(s)`);
          }

          if (this.globalFlags.format === 'json') {
            this.outputData({ success: result.remainingDevices === 0 && result.remainingLinks === 0, ...result });
          } else if (!this.globalFlags.quiet) {
            this.print(`Removed ${pc.cyan(String(result.removedDevices))} device(s) and ${pc.cyan(String(result.removedLinks))} link(s).`);
          }
        } finally {
          await controller.stop();
        }
      },
    });
  }
}
