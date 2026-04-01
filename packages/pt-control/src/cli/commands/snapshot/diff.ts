// ============================================================================
// PT Control V2 - Snapshot Diff Command
// ============================================================================

import { Args, Flags } from '@oclif/core';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import pc from 'picocolors';
import { BaseCommand, createSpinner } from '../../base-command.js';
import { ValidationError } from '../../errors/index.js';
import { calculateDelta, type TopologySnapshot, type TopologyDelta, type DeviceDelta, type LinkDelta } from '../../../contracts/index.js';

export default class SnapshotDiff extends BaseCommand {
  static override description = 'Compare two topology snapshots and show differences';

  static override examples = [
    '<%= config.bin %> snapshot diff before.json after.json',
    '<%= config.bin %> snapshot diff base-topology --current',
    '<%= config.bin %> snapshot diff --current --file after.json',
    '<%= config.bin %> snapshot diff file1.json file2.json --format json',
  ];

  static override args = {
    from: Args.string({
      description: 'Path or name of the source snapshot file',
      required: false,
    }),
    to: Args.string({
      description: 'Path or name of the target snapshot file',
      required: false,
    }),
  };

  static override flags = {
    ...BaseCommand.baseFlags,
    current: Flags.boolean({
      description: 'Use current PT topology as the target (--from is required)',
      default: false,
    }),
    file: Flags.string({
      description: 'Load snapshot from a specific file path',
      char: 'f',
    }),
    'from-file': Flags.string({
      description: 'Explicit from snapshot file path',
      char: 's',
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(SnapshotDiff);

    await this.runLoggedCommand({
      action: 'snapshot:diff',
      targetDevice: 'topology',
      execute: async () => {
        const fromArg = args.from as string | undefined;
        const toArg = args.to as string | undefined;
        const useCurrentAsTo = flags['current'] as boolean;

        if (!fromArg && !toArg && !useCurrentAsTo) {
          throw new ValidationError('Provide two snapshot files or use --current flag');
        }

        const snapshotsDir = join(this.devDir, 'snapshots');

        const loadSnapshot = (name: string | undefined, label: string): TopologySnapshot => {
          if (!name) {
            throw new ValidationError(`${label} snapshot is required`);
          }

          let content: string | undefined;

          if (existsSync(name)) {
            content = readFileSync(name, 'utf-8');
          } else {
            const withExt = name.endsWith('.json') ? name : `${name}.json`;
            const path1 = join(process.cwd(), withExt);
            const path2 = join(snapshotsDir, withExt);

            if (existsSync(path1)) {
              content = readFileSync(path1, 'utf-8');
            } else if (existsSync(path2)) {
              content = readFileSync(path2, 'utf-8');
            }
          }

          if (!content) {
            throw new ValidationError(`Snapshot file not found: ${name}`);
          }

          try {
            return JSON.parse(content) as TopologySnapshot;
          } catch {
            throw new ValidationError(`Invalid JSON in snapshot: ${name}`);
          }
        };

        const spinner = createSpinner('Loading snapshots...');

        let fromSnapshot: TopologySnapshot;
        let toSnapshot: TopologySnapshot | null = null;

        spinner.start();

        if (fromArg) {
          fromSnapshot = loadSnapshot(fromArg, 'From');
        } else {
          const controller = this.createController();
          this.trackController(controller);
          await controller.start();
          try {
            const s = await controller.snapshot();
            if (!s) throw new ValidationError('No current topology snapshot available');
            fromSnapshot = s;
          } finally {
            await controller.stop();
          }
        }

        if (useCurrentAsTo) {
          const controller = this.createController();
          this.trackController(controller);
          await controller.start();
          try {
            const s = await controller.snapshot();
            if (!s) throw new ValidationError('No current topology snapshot available');
            toSnapshot = s;
          } finally {
            await controller.stop();
          }
        } else if (toArg) {
          toSnapshot = loadSnapshot(toArg, 'To');
        }

        if (!toSnapshot) {
          throw new ValidationError('Target snapshot is required');
        }

        spinner.stop();

        const delta = calculateDelta(fromSnapshot, toSnapshot);
        this.displayDelta(delta);
      },
    });
  }

  private displayDelta(delta: TopologyDelta): void {
    const hasDeviceChanges = delta.devices.length > 0;
    const hasLinkChanges = delta.links.length > 0;

    if (!hasDeviceChanges && !hasLinkChanges) {
      this.printSuccess('Snapshots are identical — no changes detected');
      if (this.globalFlags.format === 'json' || this.globalFlags.jq) {
        this.outputData(delta);
      }
      return;
    }

    const addedDevices = delta.devices.filter((d): d is Extract<DeviceDelta, { op: 'add' }> => d.op === 'add');
    const removedDevices = delta.devices.filter((d): d is Extract<DeviceDelta, { op: 'remove' }> => d.op === 'remove');
    const updatedDevices = delta.devices.filter((d): d is Extract<DeviceDelta, { op: 'update' }> => d.op === 'update');
    const addedLinks = delta.links.filter((l): l is Extract<LinkDelta, { op: 'add' }> => l.op === 'add');
    const removedLinks = delta.links.filter((l): l is Extract<LinkDelta, { op: 'remove' }> => l.op === 'remove');

    if (this.globalFlags.format === 'json' || this.globalFlags.jq) {
      this.outputData(delta);
      return;
    }

    const fromDate = new Date(delta.from).toISOString();
    const toDate = new Date(delta.to).toISOString();

    this.print(`Snapshot Diff: ${fromDate} → ${toDate}`);
    this.print('='.repeat(60));

    if (addedDevices.length > 0) {
      this.print(`\n${pc.green('+ Devices added:')} ${addedDevices.length}`);
      for (const d of addedDevices) {
        this.print(`  ${pc.green('+')} ${pc.cyan(d.device.name)} (${d.device.model}) at (${d.device.x ?? 0}, ${d.device.y ?? 0})`);
      }
    }

    if (removedDevices.length > 0) {
      this.print(`\n${pc.red('- Devices removed:')} ${removedDevices.length}`);
      for (const d of removedDevices) {
        this.print(`  ${pc.red('-')} ${pc.cyan(d.name)}`);
      }
    }

    if (updatedDevices.length > 0) {
      this.print(`\n${pc.yellow('~ Devices updated:')} ${updatedDevices.length}`);
      for (const d of updatedDevices) {
        this.print(`  ${pc.yellow('~')} ${pc.cyan(d.name)}`);
        for (const [key, value] of Object.entries(d.changes)) {
          this.print(`      ${key}: ${JSON.stringify(value)}`);
        }
      }
    }

    if (addedLinks.length > 0) {
      this.print(`\n${pc.green('+ Links added:')} ${addedLinks.length}`);
      for (const l of addedLinks) {
        this.print(`  ${pc.green('+')} ${l.link.device1}:${l.link.port1} ↔ ${l.link.device2}:${l.link.port2} (${l.link.cableType})`);
      }
    }

    if (removedLinks.length > 0) {
      this.print(`\n${pc.red('- Links removed:')} ${removedLinks.length}`);
      for (const l of removedLinks) {
        this.print(`  ${pc.red('-')} ${l.id}`);
      }
    }

    this.print(`\n${'─'.repeat(60)}`);
    this.print(`Summary:`);
    this.print(`  Devices: +${addedDevices.length} -${removedDevices.length} ~${updatedDevices.length}`);
    this.print(`  Links:   +${addedLinks.length} -${removedLinks.length}`);
  }
}