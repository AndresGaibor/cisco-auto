// ============================================================================
// PT Control V2 - Link Add Command
// ============================================================================

import { Args, Flags } from '@oclif/core';
import { input, select } from '@inquirer/prompts';
import pc from 'picocolors';
import { BaseCommand, createSpinner } from '../../base-command.js';
import { createDefaultPTController } from '../../../controller/index.js';
import { ValidationError } from '../../errors/index.js';
import type { DeviceState, CableType } from '../../../types/index.js';

const CABLE_TYPES: { name: string; value: CableType }[] = [
  { name: 'Auto-detect (recommended)', value: 'auto' },
  { name: 'Straight-through', value: 'straight' },
  { name: 'Crossover', value: 'cross' },
  { name: 'Fiber optic', value: 'fiber' },
  { name: 'Serial', value: 'serial' },
  { name: 'Console', value: 'console' },
];

export default class LinkAdd extends BaseCommand {
  static description = 'Add a link between two devices';

  static examples = [
    '<%= config.bin %> link add R1:GigabitEthernet0/0 S1:GigabitEthernet0/1',
    '<%= config.bin %> link add R1:GigabitEthernet0/0 R2:GigabitEthernet0/0 --type cross',
    '<%= config.bin %> link add  # Interactive mode',
  ];

  static args = {
    port1: Args.string({
      description: 'First port (device:port)',
    }),
    port2: Args.string({
      description: 'Second port (device:port)',
    }),
  };

  static flags = {
    ...BaseCommand.baseFlags,
    type: Flags.string({
      description: 'Cable type',
      options: ['auto', 'straight', 'cross', 'fiber', 'serial', 'console'],
      default: 'auto',
      char: 't',
    }),
  };

  async run(): Promise<void> {
    let port1Spec = this.args.port1 as string | undefined;
    let port2Spec = this.args.port2 as string | undefined;
    let cableType = this.flags.type as CableType;

    await this.runLoggedCommand({
      action: 'link:add',
      targetDevice: () => port1Spec,
      execute: async () => {
        if (!port1Spec || !port2Spec) {
          const interactive = await this.promptForLink(port1Spec, port2Spec);
          port1Spec = interactive.port1Spec;
          port2Spec = interactive.port2Spec;
          if (this.flags.type === 'auto') {
            cableType = interactive.cableType;
          }
        }

        if (!port1Spec || !this.isValidPortSpec(port1Spec)) {
          throw new ValidationError('Invalid port1 format. Expected: device:port');
        }
        if (!port2Spec || !this.isValidPortSpec(port2Spec)) {
          throw new ValidationError('Invalid port2 format. Expected: device:port');
        }

        const { device: device1, port: port1 } = this.parsePortSpec(port1Spec);
        const { device: device2, port: port2 } = this.parsePortSpec(port2Spec);

        const controller = createDefaultPTController();
        const spinner = createSpinner(
          `Creating link ${pc.cyan(port1Spec)} <-> ${pc.cyan(port2Spec)}...`
        );

        await controller.start();

        try {
          spinner.start();

          const link = await controller.addLink(device1, port1, device2, port2, cableType);

          spinner.succeed(`Link created: ${pc.cyan(port1Spec)} <-> ${pc.cyan(port2Spec)}`);

          if (this.globalFlags.format === 'json') {
            this.outputData(link);
          } else {
            this.print(`  Cable type: ${link.cableType}`);
            this.print(`  Link ID: ${link.id}`);
          }
        } catch (error) {
          spinner.fail(`Failed to create link`);
          throw error;
        } finally {
          await controller.stop();
        }
      },
    });
  }

  private isValidPortSpec(spec: string): boolean {
    const parts = spec.split(':');
    return parts.length === 2 && parts[0].length > 0 && parts[1].length > 0;
  }

  private parsePortSpec(spec: string): { device: string; port: string } {
    const [device, ...portParts] = spec.split(':');
    return { device, port: portParts.join(':') };
  }

  private async promptForLink(
    providedPort1?: string,
    providedPort2?: string
  ): Promise<{ port1Spec: string; port2Spec: string; cableType: CableType }> {
    const controller = createDefaultPTController();
    await controller.start();

    try {
      const devices = await controller.listDevices() as DeviceState[];

      if (devices.length < 2) {
        throw new ValidationError('Need at least 2 devices to create a link');
      }

      // First endpoint
      const device1Name = await select({
        message: 'First device',
        choices: devices.map(d => ({ name: d.name, value: d.name })),
      });

      const port1 = providedPort1?.split(':')[1] || await input({
        message: 'Port on first device',
        default: 'GigabitEthernet0/0',
      });

      // Second endpoint
      const device2Name = await select({
        message: 'Second device',
        choices: devices.filter(d => d.name !== device1Name).map(d => ({ name: d.name, value: d.name })),
      });

      const port2 = providedPort2?.split(':')[1] || await input({
        message: 'Port on second device',
        default: 'GigabitEthernet0/1',
      });

      // Cable type
      const cableType = await select({
        message: 'Cable type',
        choices: CABLE_TYPES,
      });

      return {
        port1Spec: `${device1Name}:${port1}`,
        port2Spec: `${device2Name}:${port2}`,
        cableType,
      };
    } finally {
      await controller.stop();
    }
  }
}
