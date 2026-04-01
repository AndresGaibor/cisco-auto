// ============================================================================
// PT Control V2 - Trunk Apply Command
// ============================================================================

import { Args, Flags } from '@oclif/core';
import pc from 'picocolors';
import { BaseCommand, createSpinner } from '../../base-command.js';
import { createDefaultPTController } from '../../../controller/index.js';
import { buildTrunkCommands } from '../../../utils/ios-commands.js';
import { DeviceNotFoundError, ValidationError } from '../../errors/index.js';
import type { DeviceState } from '../../../types/index.js';

export default class TrunkApply extends BaseCommand {
  static override description = 'Apply trunk configuration to device ports';

  static override examples = [
    '<%= config.bin %> trunk apply S1 FastEthernet0/1,FastEthernet0/2',
    '<%= config.bin %> trunk apply S1 "FastEthernet0/1 FastEthernet0/2" --vlans 10,20,30',
    '<%= config.bin %> trunk apply S1 FastEthernet0/1 --vlans 10-30',
  ];

  static override args = {
    device: Args.string({
      description: 'Device name (switch or router)',
      required: true,
    }),
    ports: Args.string({
      description: 'Interface names to configure as trunk (e.g., "FastEthernet0/1,FastEthernet0/2" or "FastEthernet0/1 FastEthernet0/2")',
      required: true,
    }),
  };

  static override flags = {
    ...BaseCommand.baseFlags,
    vlans: Flags.string({
      description: 'VLAN IDs allowed on trunk (e.g., "10,20,30" or "10-30")',
      char: 'v',
    }),
    save: Flags.boolean({
      description: 'Save configuration after applying',
      default: true,
    }),
  };

  async run(): Promise<void> {
    const device = this.args.device as string;
    const portsRaw = this.args.ports as string;
    const ports = this.parsePortList(portsRaw);
    const vlansArg = this.flags.vlans as string | undefined;
    const save = this.flags.save as boolean;

    await this.runLoggedCommand({
      action: 'trunk:apply',
      targetDevice: () => device,
      context: {
        device,
        ports,
        vlansArg,
        save,
      },
      execute: async () => {
        // Validar device
        if (!device || device.trim() === '') {
          throw new ValidationError('Device name is required');
        }

        // Parsear VLANs
        let vlanIds: number[];
        if (vlansArg) {
          vlanIds = this.parseVlanString(vlansArg);
          const invalidVlans = vlanIds.filter(v => isNaN(v) || v < 1 || v > 4094);
          if (invalidVlans.length > 0) {
            throw new ValidationError(`Invalid VLAN IDs: ${invalidVlans.join(', ')}. Must be between 1 and 4094.`);
          }
        } else {
          // Por defecto, permitir VLANs 10,20,30,40,50
          vlanIds = [10, 20, 30, 40, 50];
        }

        // Generar comandos IOS usando utilitaria T1
        const commands = buildTrunkCommands(ports, vlanIds);

        this.logDebug(`Generated ${commands.length} IOS commands for trunk ports`);

        const controller = createDefaultPTController();
        this.trackController(controller);
        const spinner = createSpinner(`Applying trunk configuration to ${pc.cyan(device)}...`);

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
          spinner.succeed(`Trunk configuration applied to ${pc.cyan(device)}`);

          if (this.globalFlags.format === 'json') {
            this.outputData({
              success: true,
              device,
              ports,
              vlans: vlanIds.length > 0 ? vlanIds : 'all',
              commandsCount: commands.length,
              saved: save,
            });
          } else {
            this.print(`  Ports: ${ports.join(', ')}`);
            this.print(`  VLANs: ${vlanIds.length > 0 ? vlanIds.join(', ') : 'all (1-4094)'}`);
            this.print(`  Commands: ${commands.length}`);
            this.print(`  Saved: ${save}`);
          }
        } catch (error) {
          spinner.fail(`Failed to apply trunk configuration to ${device}`);
          throw error;
        } finally {
          await controller.stop();
        }
      },
    });
  }

  /**
   * Parsea string de VLANs en formatos:
   * - "10,20,30" -> [10, 20, 30]
   * - "10-30" -> [10, 11, 12, ..., 30]
   * - "10,20,30-35" -> [10, 20, 30, 31, 32, 33, 34, 35]
   */
  private parsePortList(raw: string): string[] {
    if (!raw || raw.trim() === '') {
      throw new ValidationError('At least one port is required');
    }
    const ports = raw.split(/[,\s]+/).filter(p => p.length > 0);
    if (ports.length === 0) {
      throw new ValidationError('No valid port names provided');
    }
    return ports;
  }

  private parseVlanString(vlanStr: string): number[] {
    const vlans: number[] = [];
    const segments = vlanStr.split(',');

    for (const segment of segments) {
      const trimmed = segment.trim();
      if (trimmed.includes('-')) {
        const [startStr, endStr] = trimmed.split('-');
        const start = parseInt(startStr!.trim(), 10);
        const end = parseInt(endStr!.trim(), 10);
        if (isNaN(start) || isNaN(end) || start > end) {
          throw new ValidationError(`Invalid VLAN range: ${trimmed}`);
        }
        for (let v = start; v <= end; v++) {
          if (!vlans.includes(v)) {
            vlans.push(v);
          }
        }
      } else {
        const vlan = parseInt(trimmed, 10);
        if (isNaN(vlan)) {
          throw new ValidationError(`Invalid VLAN ID: ${trimmed}`);
        }
        if (!vlans.includes(vlan)) {
          vlans.push(vlan);
        }
      }
    }

    return vlans.sort((a, b) => a - b);
  }
}
