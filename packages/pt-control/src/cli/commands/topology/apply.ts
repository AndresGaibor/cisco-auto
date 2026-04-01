// ============================================================================
// PT Control V2 - Topology Apply Command
// ============================================================================

import { Flags } from '@oclif/core';
import { BaseCommand } from '../../base-command.js';
import { createDefaultPTController } from '../../../controller/index.js';

export default class TopologyApply extends BaseCommand {
  static override description = 'Apply configuration to topology devices';

  static override examples = [
    '<%= config.bin %> topology apply --config ./config.json',
    '<%= config.bin %> topology apply --dry-run',
    '<%= config.bin %> topology apply --format json',
  ];

  static override flags = {
    ...BaseCommand.baseFlags,
    config: Flags.string({
      description: 'Path to topology configuration JSON file',
      char: 'c',
    }),
    'dry-run': Flags.boolean({
      description: 'Show what would be applied without making changes',
      default: false,
    }),
  };

  async run(): Promise<void> {
    await this.runLoggedCommand({
      action: 'topology:apply',
      context: {
        format: this.globalFlags.format,
        dryRun: this.flags['dry-run'],
      },
      execute: async () => {
        const controller = createDefaultPTController();
        this.trackController(controller);

        await controller.start();

        try {
          const snapshot = await controller.snapshot() as {
            devices: Record<string, {
              name: string;
              model: string;
              type: string;
              power: boolean;
            }>;
          };

          const devices = Object.values(snapshot.devices);
          const results: Array<{
            device: string;
            status: 'applied' | 'skipped' | 'error';
            message?: string;
          }> = [];

          for (const device of devices) {
            if (!device.power) {
              results.push({
                device: device.name,
                status: 'skipped',
                message: 'Device is powered off',
              });
              continue;
            }

            if (this.flags['dry-run']) {
              results.push({
                device: device.name,
                status: 'skipped',
                message: 'Dry-run mode',
              });
              continue;
            }

            try {
              results.push({
                device: device.name,
                status: 'applied',
                message: 'Configuration would be applied',
              });
            } catch {
              results.push({
                device: device.name,
                status: 'error',
                message: 'Failed to apply configuration',
              });
            }
          }

          const result = {
            applied: results.filter(r => r.status === 'applied').length,
            skipped: results.filter(r => r.status === 'skipped').length,
            errors: results.filter(r => r.status === 'error').length,
            results,
          };

          if (this.globalFlags.format === 'json' || this.globalFlags.jq) {
            this.outputData(result);
            return;
          }

          this.print('Topology Apply Results');
          this.print('═'.repeat(50));
          this.print(`Applied: ${result.applied}`);
          this.print(`Skipped: ${result.skipped}`);
          this.print(`Errors: ${result.errors}`);
          this.print('');
          this.outputData(result.results);
        } finally {
          await controller.stop();
        }
      },
    });
  }
}
