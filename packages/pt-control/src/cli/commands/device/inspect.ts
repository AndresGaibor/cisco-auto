// ============================================================================
// PT Control V2 - Device Inspect Command
// ============================================================================

import { BaseCommand } from '../../base-command.js';
import { createDefaultPTController } from '../../../controller/index.js';
import { Args } from '@oclif/core';
import { formatDeviceType } from '../../../utils/device-type.js';

export default class DeviceInspect extends BaseCommand {
  static override description = 'Inspect a specific device in detail';

  static override examples = [
    '<%= config.bin %> device inspect Router0',
    '<%= config.bin %> device inspect Switch1 --format json',
    '<%= config.bin %> device inspect PC1 --include-config',
  ];

  static override args = {
    deviceId: Args.string({
      description: 'Device name or ID',
      required: true,
    }),
  };

  static override flags = {
    ...BaseCommand.baseFlags,
    'include-config': BaseCommand.baseFlags['yes'],
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(DeviceInspect);
    const deviceId = args.deviceId as string;
    const includeConfig = flags['include-config'] as boolean;

    await this.runLoggedCommand({
      action: 'device:inspect',
      targetDevice: deviceId,
      context: {
        format: this.globalFlags.format,
        includeConfig,
      },
      execute: async () => {
        const controller = createDefaultPTController();
        this.trackController(controller);

        await controller.start();

        try {
          const device = await controller.inspect(deviceId, false) as {
            name: string;
            model: string;
            type: string;
            power: boolean;
            ports: Array<{
              name: string;
              type?: string;
              status?: string;
              protocol?: string;
              ipAddress?: string;
              subnetMask?: string;
              macAddress?: string;
              speed?: string;
              duplex?: string;
              vlan?: number;
              mode?: string;
              link?: string;
            }>;
            displayName?: string;
            x?: number;
            y?: number;
            uuid?: string;
            hostname?: string;
            version?: string;
            configRegister?: string;
            ip?: string;
            mask?: string;
            gateway?: string;
            dns?: string;
            dhcp?: boolean;
          };

          if (!device) {
            throw new Error(`Device '${deviceId}' not found`);
          }

          const fullInspect = {
            identity: {
              name: device.name,
              displayName: device.displayName,
              hostname: device.hostname,
              model: device.model,
              type: formatDeviceType(device.type),
              uuid: device.uuid,
            },
            status: {
              power: device.power ? 'on' : 'off',
              configRegister: device.configRegister,
              version: device.version,
            },
            position: device.x !== undefined && device.y !== undefined
              ? { x: device.x, y: device.y }
              : undefined,
            network: device.ip ? {
              ip: device.ip,
              mask: device.mask,
              gateway: device.gateway,
              dns: device.dns,
              dhcp: device.dhcp,
            } : undefined,
            interfaces: device.ports.map(p => ({
              name: p.name,
              type: p.type,
              status: p.status,
              protocol: p.protocol,
              ipAddress: p.ipAddress,
              subnetMask: p.subnetMask,
              macAddress: p.macAddress,
              speed: p.speed,
              duplex: p.duplex,
              vlan: p.vlan,
              mode: p.mode,
              link: p.link,
            })),
          };

          if (includeConfig) {
            try {
              const config = await controller.showRunningConfig(deviceId) as { raw?: string };
              (fullInspect as Record<string, unknown>).runningConfig = config?.raw;
            } catch {
              // Config not available
            }
          }

          if (this.globalFlags.format === 'json' || this.globalFlags.jq) {
            this.outputData(fullInspect);
            return;
          }

          this.print(`Device: ${fullInspect.identity.name}`);
          this.print('═'.repeat(50));
          this.print(`Model: ${fullInspect.identity.model}`);
          this.print(`Type: ${fullInspect.identity.type}`);
          this.print(`Status: ${fullInspect.status.power}`);
          if (fullInspect.position) {
            this.print(`Position: (${fullInspect.position.x}, ${fullInspect.position.y})`);
          }
          this.print('');
          this.outputData(fullInspect);
        } finally {
          await controller.stop();
        }
      },
    });
  }
}
