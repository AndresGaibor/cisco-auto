// ============================================================================
// PT Control V2 - VLAN Apply Command
// ============================================================================

import { Args, Flags } from '@oclif/core';
import pc from 'picocolors';
import { BaseCommand, createSpinner } from '../../base-command.js';
import { VlanGenerator } from '@cisco-auto/core';
import { DeviceNotFoundError, ValidationError } from '../../errors/index.js';
import type { DeviceState } from '../../../types/index.js';

export default class VlanApply extends BaseCommand {
  static override description = 'Apply VLAN configuration to a device';

  static override examples = [
    '<%= config.bin %> vlan apply S1 10,20,30',
    '<%= config.bin %> vlan apply S1 "10 20 30" --name-prefix ADMIN',
    '<%= config.bin %> vlan apply S1 10',
  ];

  static override args = {
    device: Args.string({
      description: 'Device name (switch or router)',
      required: true,
    }),
    vlans: Args.string({
      description: 'VLAN IDs to create (e.g., "10,20,30" or "10 20 30")',
      required: true,
    }),
  };

  static override flags = {
    ...BaseCommand.baseFlags,
    'name-prefix': Flags.string({
      description: 'Base name for VLANs (e.g., "ADMIN" creates "ADMIN10", "ADMIN20")',
      char: 'p',
    }),
    save: Flags.boolean({
      description: 'Save configuration after applying',
      default: true,
    }),
  };

  async run(): Promise<void> {
    const device = this.args.device as string;
    const vlansRaw = this.args.vlans as string;
    const vlanIds = this.parseVlanIds(vlansRaw);
    const namePrefix = this.flags['name-prefix'] as string | undefined;
    const save = this.flags.save as boolean;

    await this.runLoggedCommand({
      action: 'vlan:apply',
      targetDevice: () => device,
      context: {
        vlans: vlanIds,
        namePrefix,
        save,
      },
      execute: async () => {
        // Validar VLANs
        const invalidVlans = vlanIds.filter(v => isNaN(v) || v < 1 || v > 4094);
        if (invalidVlans.length > 0) {
          throw new ValidationError(`Invalid VLAN IDs: ${invalidVlans.join(', ')}. Must be between 1 and 4094.`);
        }

        if (!device || device.trim() === '') {
          throw new ValidationError('Device name is required');
        }

        // Generar comandos IOS usando VlanGenerator
        const commands = VlanGenerator.generateVLANsFromIds(vlanIds, namePrefix);

        this.logDebug(`Generated ${commands.length} IOS commands for VLANs`);

        const controller = this.createController();
        this.trackController(controller);
        const spinner = createSpinner(`Applying VLANs to ${pc.cyan(device)}...`);

        await controller.start();

        try {
          // Verificar que el dispositivo existe
          const devices = await controller.listDevices() as DeviceState[];
          const exists = devices.some((d: DeviceState) => d.name === device);

          if (!exists) {
            throw new DeviceNotFoundError(device);
          }

          spinner.start();
          await controller.configIos(device, commands, { save });
          spinner.succeed(`VLANs applied to ${pc.cyan(device)}`);

          if (this.globalFlags.format === 'json') {
            this.outputData({
              success: true,
              device,
              vlans: vlanIds,
              namePrefix,
              commandsCount: commands.length,
              saved: save,
            });
          } else {
            this.print(`  VLANs: ${vlanIds.join(', ')}`);
            if (namePrefix) {
              this.print(`  Name prefix: ${namePrefix}`);
            }
            this.print(`  Commands: ${commands.length}`);
            this.print(`  Saved: ${save}`);
          }
        } catch (error) {
          spinner.fail(`Failed to apply VLANs to ${device}`);
          throw error;
        } finally {
          await controller.stop();
        }
      },
    });
  }

  private parseVlanIds(raw: string): number[] {
    if (!raw || raw.trim() === '') {
      throw new ValidationError('VLAN IDs are required');
    }
    const tokens = raw.split(/[,\s]+/).filter(t => t.length > 0);
    if (tokens.length === 0) {
      throw new ValidationError('No valid VLAN IDs provided');
    }
    const ids = tokens.map(t => {
      const n = parseInt(t, 10);
      if (isNaN(n) || n < 1 || n > 4094) {
        throw new ValidationError(`Invalid VLAN ID: "${t}". Must be between 1 and 4094.`);
      }
      return n;
    });
    return [...new Set(ids)].sort((a, b) => a - b);
  }
}
