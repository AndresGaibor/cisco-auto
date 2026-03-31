// ============================================================================
// PT Control V2 - Snapshot Load Command
// ============================================================================

import { Args, Flags } from '@oclif/core';
import { select } from '@inquirer/prompts';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import pc from 'picocolors';
import { BaseCommand, createSpinner } from '../../base-command.js';
import { createDefaultPTController } from '../../../controller/index.js';
import { ValidationError } from '../../errors/index.js';

export default class SnapshotLoad extends BaseCommand {
  static override description = 'Load a topology snapshot';

  static override examples = [
    '<%= config.bin %> snapshot load base-topology',
    '<%= config.bin %> snapshot load my-lab-v1 --clear',
  ];

  static override args = {
    name: Args.string({
      description: 'Snapshot name to load',
    }),
  };

  static override flags = {
    ...BaseCommand.baseFlags,
    clear: Flags.boolean({
      description: 'Clear existing topology before loading',
      default: false,
      char: 'c',
    }),
  };

  async run(): Promise<void> {
    let name = this.args.name as string | undefined;
    const clear = this.flags.clear as boolean;

    await this.runLoggedCommand({
      action: 'snapshot:load',
      targetDevice: 'topology',
      execute: async () => {
        const snapshotsDir = join(this.devDir, 'snapshots');
        const availableSnapshots = existsSync(snapshotsDir)
          ? readdirSync(snapshotsDir).filter(f => f.endsWith('.json')).map(f => f.replace('.json', ''))
          : [];

        if (!name) {
          if (availableSnapshots.length === 0) {
            throw new ValidationError('No snapshots found. Run `pt snapshot save <name>` first.');
          }

          name = await select({
            message: 'Select snapshot to load',
            choices: availableSnapshots.map(s => ({ name: s, value: s })),
          });
        }

        if (!name || name.trim() === '') {
          throw new ValidationError('Snapshot name is required');
        }

        const snapshotPath = join(snapshotsDir, `${name}.json`);

        if (!existsSync(snapshotPath)) {
          throw new ValidationError(`Snapshot '${name}' not found at ${snapshotPath}`);
        }

        if (clear) {
          await this.confirmDestructiveAction({
            action: 'topology-change',
            details: `Clear existing topology before loading snapshot ${name}`,
            targetDevice: 'topology',
            skipPrompt: this.globalFlags.yes || this.globalFlags.quiet || this.globalFlags.format === 'json',
          });
        }

        const controller = createDefaultPTController();
        this.trackController(controller);
        const spinner = createSpinner(`Loading snapshot ${pc.cyan(name)}...`);

        await controller.start();

        try {
          spinner.start();

          const snapshot = JSON.parse(readFileSync(snapshotPath, 'utf-8'));

          spinner.succeed(`Snapshot loaded: ${pc.cyan(name)}`);

          if (this.globalFlags.format === 'json') {
            this.outputData({
              success: true,
              name,
              devices: Object.keys(snapshot.devices || {}).length,
              links: Object.keys(snapshot.links || {}).length,
            });
          } else {
            this.print(`  Devices: ${Object.keys(snapshot.devices || {}).length}`);
            this.print(`  Links: ${Object.keys(snapshot.links || {}).length}`);
            this.printWarning('Note: Full snapshot restoration is not yet implemented');
          }
        } catch (error) {
          spinner.fail(`Failed to load snapshot ${name}`);
          throw error;
        } finally {
          await controller.stop();
        }
      },
    });
  }
}
