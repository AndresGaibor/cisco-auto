// ============================================================================
// PT Control V2 - Topology Apply Command
// ============================================================================
// Declarative topology reconciler: ensures PT topology matches desired config.

import { Flags } from '@oclif/core';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import pc from 'picocolors';
import { BaseCommand, createSpinner } from '../../base-command.js';
import { ValidationError } from '../../errors/index.js';
import type { TopologySnapshot, DeviceState, LinkState, AddLinkPayload } from '../../../contracts/index.js';
import { calculateDelta, type DeviceDelta, type LinkDelta } from '../../../contracts/index.js';

interface DesiredDevice {
  name: string;
  model: string;
  x?: number;
  y?: number;
}

interface DesiredLink {
  device1: string;
  port1: string;
  device2: string;
  port2: string;
  cableType?: "auto" | "straight" | "cross" | "roll" | "fiber" | "phone" | "cable" | "serial" | "console" | "wireless" | "coaxial" | "octal" | "cellular" | "usb" | "custom_io";
}

interface TopologyConfig {
  devices?: DesiredDevice[];
  links?: DesiredLink[];
}

interface ApplyResult {
  action: 'add' | 'remove' | 'skip';
  kind: 'device' | 'link';
  name?: string;
  details?: string;
  error?: string;
}

export default class TopologyApply extends BaseCommand {
  static override description = 'Apply a declarative topology configuration to Packet Tracer';

  static override examples = [
    '<%= config.bin %> topology apply --config ./topology.json',
    '<%= config.bin %> topology apply --config ./topology.json --dry-run',
    '<%= config.bin %> topology apply --config ./topology.json --force',
  ];

  static override flags = {
    ...BaseCommand.baseFlags,
    config: Flags.string({
      description: 'Path to topology configuration JSON file',
      char: 'c',
      required: true,
    }),
    'dry-run': Flags.boolean({
      description: 'Show what would be applied without making changes',
      default: false,
    }),
    force: Flags.boolean({
      description: 'Remove devices/links not in the desired config',
      default: false,
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(TopologyApply);

    await this.runLoggedCommand({
      action: 'topology:apply',
      context: {
        format: this.globalFlags.format,
        dryRun: flags['dry-run'],
        force: flags.force,
      },
      execute: async () => {
        const configPath = flags.config as string;

        if (!existsSync(configPath)) {
          throw new ValidationError(`Config file not found: ${configPath}`);
        }

        let config: TopologyConfig;
        try {
          const raw = readFileSync(configPath, 'utf-8');
          config = JSON.parse(raw) as TopologyConfig;
        } catch (error) {
          throw new ValidationError(`Invalid JSON in config file: ${configPath}`);
        }

        if (!config.devices && !config.links) {
          throw new ValidationError('Config must contain at least one of: devices, links');
        }

        const controller = this.createController();
        this.trackController(controller);
        const spinner = createSpinner('Loading current topology...');

        await controller.start();

        try {
          spinner.start();

          const currentSnapshot = await controller.snapshot();

          if (!currentSnapshot) {
            throw new ValidationError('No topology snapshot available from PT');
          }

          const desiredSnapshot = this.buildDesiredSnapshot(config);

          spinner.start();

          const delta = calculateDelta(currentSnapshot as TopologySnapshot, desiredSnapshot);

          const results: ApplyResult[] = [];

          if (flags['dry-run']) {
            this.print(pc.bold('Dry-run mode — no changes will be made\n'));
          }

          for (const deviceDelta of delta.devices) {
            if (deviceDelta.op === 'add') {
              const d = deviceDelta.device;
              const details = `${d.model} at (${d.x ?? 100}, ${d.y ?? 100})`;
              if (flags['dry-run']) {
                results.push({ action: 'add', kind: 'device', name: d.name, details });
                this.print(`  ${pc.green('+')} Would add device ${pc.cyan(d.name)} (${details})`);
              } else {
                try {
                  await controller.addDevice(d.name, d.model, { x: d.x, y: d.y });
                  results.push({ action: 'add', kind: 'device', name: d.name, details });
                  this.print(`  ${pc.green('+')} Added device ${pc.cyan(d.name)}`);
                } catch (err) {
                  const msg = err instanceof Error ? err.message : String(err);
                  results.push({ action: 'skip', kind: 'device', name: d.name, error: msg });
                  this.print(`  ${pc.red('!')} Failed to add ${pc.cyan(d.name)}: ${msg}`);
                }
              }
            } else if (deviceDelta.op === 'remove' && flags.force) {
              const name = deviceDelta.name;
              if (flags['dry-run']) {
                results.push({ action: 'remove', kind: 'device', name, details: 'Not in desired config' });
                this.print(`  ${pc.red('-')} Would remove device ${pc.cyan(name)}`);
              } else {
                try {
                  await controller.removeDevice(name);
                  results.push({ action: 'remove', kind: 'device', name });
                  this.print(`  ${pc.red('-')} Removed device ${pc.cyan(name)}`);
                } catch (err) {
                  const msg = err instanceof Error ? err.message : String(err);
                  results.push({ action: 'skip', kind: 'device', name, error: msg });
                  this.print(`  ${pc.red('!')} Failed to remove ${pc.cyan(name)}: ${msg}`);
                }
              }
            } else if (deviceDelta.op === 'remove' && !flags.force) {
              this.print(`  ${pc.yellow('~')} Device ${pc.cyan(deviceDelta.name)} not in desired config (use --force to remove)`);
            }
          }

          for (const linkDelta of delta.links) {
            if (linkDelta.op === 'add') {
              const l = linkDelta.link;
              const details = `${l.device1}:${l.port1} ↔ ${l.device2}:${l.port2}`;
              if (flags['dry-run']) {
                results.push({ action: 'add', kind: 'link', details });
                this.print(`  ${pc.green('+')} Would add link ${details}`);
              } else {
                try {
                  await controller.addLink(l.device1, l.port1, l.device2, l.port2, l.cableType as AddLinkPayload["linkType"]);
                  results.push({ action: 'add', kind: 'link', details });
                  this.print(`  ${pc.green('+')} Added link ${details}`);
                } catch (err) {
                  const msg = err instanceof Error ? err.message : String(err);
                  results.push({ action: 'skip', kind: 'link', details, error: msg });
                  this.print(`  ${pc.red('!')} Failed to add link ${details}: ${msg}`);
                }
              }
            } else if (linkDelta.op === 'remove' && flags.force) {
              const id = linkDelta.id;
              if (flags['dry-run']) {
                results.push({ action: 'remove', kind: 'link', details: id });
                this.print(`  ${pc.red('-')} Would remove link ${id}`);
              } else {
                const parts = id.split('-');
                if (parts.length >= 2) {
                  const [d1, p1] = parts[0].split(':');
                  const d2Part = parts.slice(1).join('-');
                  try {
                    await controller.removeLink(d1, p1);
                    results.push({ action: 'remove', kind: 'link', details: id });
                    this.print(`  ${pc.red('-')} Removed link ${id}`);
                  } catch (err) {
                    const msg = err instanceof Error ? err.message : String(err);
                    results.push({ action: 'skip', kind: 'link', details: id, error: msg });
                    this.print(`  ${pc.red('!')} Failed to remove link ${id}: ${msg}`);
                  }
                }
              }
            } else if (linkDelta.op === 'remove' && !flags.force) {
              this.print(`  ${pc.yellow('~')} Link ${linkDelta.id} not in desired config (use --force to remove)`);
            }
          }

          spinner.stop();

          const added = results.filter(r => r.action === 'add').length;
          const removed = results.filter(r => r.action === 'remove').length;
          const skipped = results.filter(r => r.action === 'skip').length;

          this.print(`\n${'─'.repeat(50)}`);
          this.print(`Summary: ${pc.green(`+${added}`)} added, ${pc.red(`-${removed}`)} removed, ${skipped > 0 ? pc.red(`!${skipped}`) : '0'} skipped`);

          if (flags['dry-run']) {
            this.print(pc.yellow('\nDry-run complete. Run without --dry-run to apply changes.'));
          }

          if (this.globalFlags.format === 'json' || this.globalFlags.jq) {
            this.outputData({
              dryRun: flags['dry-run'],
              added,
              removed,
              skipped,
              results,
            });
          }
        } finally {
          await controller.stop();
        }
      },
    });
  }

  private buildDesiredSnapshot(config: TopologyConfig): TopologySnapshot {
    const devices: Record<string, DeviceState> = {};
    const links: Record<string, LinkState> = {};

    for (const d of config.devices ?? []) {
      devices[d.name] = {
        name: d.name,
        model: d.model,
        type: 'generic',
        power: true,
        x: d.x,
        y: d.y,
        ports: [],
      };
    }

    for (const l of config.links ?? []) {
      const id = this.makeLinkId(l.device1, l.port1, l.device2, l.port2);
      links[id] = {
        id,
        device1: l.device1,
        port1: l.port1,
        device2: l.device2,
        port2: l.port2,
        cableType: l.cableType ?? 'auto',
      };
    }

    return {
      version: '1.0',
      timestamp: Date.now(),
      devices,
      links,
      metadata: {
        deviceCount: Object.keys(devices).length,
        linkCount: Object.keys(links).length,
      },
    };
  }

  private makeLinkId(device1: string, port1: string, device2: string, port2: string): string {
    const a = `${device1}:${port1}`;
    const b = `${device2}:${port2}`;
    const [x, y] = [a, b].sort();
    return `${x}-${y}`;
  }
}