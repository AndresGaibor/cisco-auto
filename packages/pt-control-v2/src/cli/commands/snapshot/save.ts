// ============================================================================
// PT Control V2 - Snapshot Save Command
// ============================================================================

import { Args, Flags } from '@oclif/core';
import { input } from '@inquirer/prompts';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import pc from 'picocolors';
import { BaseCommand, createSpinner } from '../../base-command.js';
import { createDefaultPTController } from '../../../controller/index.js';
import { ValidationError } from '../../errors/index.js';

export default class SnapshotSave extends BaseCommand {
  static description = 'Save a topology snapshot';

  static examples = [
    '<%= config.bin %> snapshot save base-topology',
    '<%= config.bin %> snapshot save my-lab-v1',
  ];

  static args = {
    name: Args.string({
      description: 'Snapshot name',
    }),
  };

  static flags = {
    ...BaseCommand.baseFlags,
  };

  async run(): Promise<void> {
    let name = this.args.name as string | undefined;

    await this.runLoggedCommand({
      action: 'snapshot:save',
      targetDevice: 'topology',
      execute: async () => {
        if (!name) {
          name = await input({
            message: 'Snapshot name',
            validate: (value) => value.trim() !== '' || 'Name is required',
          });
        }

        if (!name || name.trim() === '') {
          throw new ValidationError('Snapshot name is required');
        }

        name = name.replace(/[^a-zA-Z0-9-_]/g, '-');

        const controller = createDefaultPTController();
        const spinner = createSpinner(`Saving snapshot ${pc.cyan(name)}...`);

        await controller.start();

        try {
          spinner.start();

          const snapshot = await controller.snapshot();

          const snapshotsDir = join(this.devDir, 'snapshots');
          if (!existsSync(snapshotsDir)) {
            mkdirSync(snapshotsDir, { recursive: true });
          }

          const snapshotPath = join(snapshotsDir, `${name}.json`);
          writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2));

          spinner.succeed(`Snapshot saved: ${pc.cyan(name)}`);

          if (this.globalFlags.format === 'json') {
            this.outputData({
              success: true,
              name,
              path: snapshotPath,
              devices: Object.keys(snapshot.devices || {}).length,
              links: Object.keys(snapshot.links || {}).length,
            });
          } else {
            this.print(`  Path: ${snapshotPath}`);
            this.print(`  Devices: ${Object.keys(snapshot.devices || {}).length}`);
            this.print(`  Links: ${Object.keys(snapshot.links || {}).length}`);
          }
        } catch (error) {
          spinner.fail(`Failed to save snapshot ${name}`);
          throw error;
        } finally {
          await controller.stop();
        }
      },
    });
  }
}
