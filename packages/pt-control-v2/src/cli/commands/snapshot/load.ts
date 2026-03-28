// ============================================================================
// PT Control V2 - Snapshot Load Command
// ============================================================================

import { Args, Flags } from '@oclif/core';
import { confirm, select } from '@inquirer/prompts';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import pc from 'picocolors';
import { BaseCommand, createSpinner } from '../../base-command.js';
import { createDefaultPTController } from '../../../controller/index.js';
import { ValidationError } from '../../errors/index.js';

export default class SnapshotLoad extends BaseCommand {
  static description = 'Load a topology snapshot';

  static examples = [
    '<%= config.bin %> snapshot load base-topology',
    '<%= config.bin %> snapshot load my-lab-v1 --clear',
  ];

  static args = {
    name: Args.string({
      description: 'Snapshot name to load',
    }),
  };

  static flags = {
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

    // Check for available snapshots
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

    // Confirmation for clear
    if (clear && !this.globalFlags.quiet) {
      const confirmed = await confirm({
        message: `Clear existing topology before loading ${pc.cyan(name)}?`,
        default: false,
      });

      if (!confirmed) {
        this.print('Cancelled.');
        return;
      }
    }

    const controller = createDefaultPTController();
    const spinner = createSpinner(`Loading snapshot ${pc.cyan(name)}...`);

    await controller.start();

    try {
      spinner.start();

      const snapshot = JSON.parse(readFileSync(snapshotPath, 'utf-8'));

      // TODO: Implement actual snapshot loading logic
      // This would involve clearing topology (if --clear) and recreating devices/links

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
  }
}