// ============================================================================
// PT Control V2 - Topology Read Command
// ============================================================================

import { BaseCommand } from '../../base-command.js';
import { createDefaultPTController } from '../../../controller/index.js';
import { formatDeviceType } from '../../../utils/device-type.js';

export default class TopologyRead extends BaseCommand {
  static override description = 'Read full topology from Packet Tracer canvas';

  static override aliases = ['topo', 'show'];

  static override examples = [
    '<%= config.bin %> topology read',
    '<%= config.bin %> topology read --format json',
    '<%= config.bin %> topology read --pretty',
  ];

  static override flags = {
    ...BaseCommand.baseFlags,
  };

  async run(): Promise<void> {
    await this.runLoggedCommand({
      action: 'topology:read',
      context: {
        format: this.globalFlags.format,
      },
      execute: async () => {
        const controller = createDefaultPTController();
        this.trackController(controller);

        await controller.start();

        try {
          const snapshot = await controller.snapshot() as {
            version: string;
            timestamp: number;
            devices: Record<string, {
              name: string;
              model: string;
              type: string;
              power: boolean;
              ports: unknown[];
              x?: number;
              y?: number;
              hostname?: string;
              ip?: string;
              mask?: string;
              gateway?: string;
              config?: unknown;
            }>;
            links: Record<string, {
              id: string;
              device1: string;
              port1: string;
              device2: string;
              port2: string;
              cableType: string;
            }>;
            metadata?: {
              deviceCount: number;
              linkCount: number;
              generatedBy?: string;
            };
          };

          const fullTopology = {
            version: snapshot.version,
            timestamp: snapshot.timestamp,
            devices: Object.values(snapshot.devices).map(d => ({
              id: d.hostname || d.name,
              name: d.name,
              model: d.model,
              type: formatDeviceType(d.type),
              power: d.power,
              position: { x: d.x ?? 0, y: d.y ?? 0 },
              hostname: d.hostname,
              interfaces: d.ports,
              ip: d.ip ? { address: d.ip, mask: d.mask } : undefined,
              gateway: d.gateway,
              config: d.config,
            })),
            links: Object.values(snapshot.links).map(l => ({
              id: l.id,
              from: { device: l.device1, port: l.port1 },
              to: { device: l.device2, port: l.port2 },
              cableType: l.cableType,
            })),
            statistics: {
              deviceCount: snapshot.metadata?.deviceCount ?? Object.keys(snapshot.devices).length,
              linkCount: snapshot.metadata?.linkCount ?? Object.keys(snapshot.links).length,
            },
          };

          if (this.globalFlags.format === 'json' || this.globalFlags.jq) {
            this.outputData(fullTopology);
            return;
          }

          this.print('Topology Snapshot');
          this.print('═'.repeat(50));
          this.print(`Version: ${fullTopology.version}`);
          this.print(`Devices: ${fullTopology.statistics.deviceCount}`);
          this.print(`Links: ${fullTopology.statistics.linkCount}`);
          this.print('');
          this.outputData(fullTopology);
        } finally {
          await controller.stop();
        }
      },
    });
  }
}
