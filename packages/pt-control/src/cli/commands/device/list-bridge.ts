// ============================================================================
// PT Control V3 - Device List Command (HTTP Bridge Version)
// ============================================================================

import { BaseCommand, Flags } from '../../base-command.js';
import { getTopology, checkBridgeHealth, waitForExecution } from '@cisco-auto/http-bridge';
import { formatDeviceType } from '../../../utils/device-type.js';

export default class DeviceList extends BaseCommand {
  static override description = 'List all devices in the topology (via HTTP Bridge)';

  static override aliases = ['devices', 'ls'];

  static override examples = [
    '<%= config.bin %> device list',
    '<%= config.bin %> device list --format json',
    '<%= config.bin %> device list --jq ".[].name"',
  ];

  static override flags = {
    ...BaseCommand.baseFlags,
  };

  async run(): Promise<void> {
    await this.runLoggedCommand({
      action: 'device:list',
      targetDevice: 'all',
      context: {
        format: this.globalFlags.format,
        usingBridge: true,
      },
      execute: async () => {
        // Check if bridge server is running
        const isHealthy = await checkBridgeHealth();
        if (!isHealthy) {
          throw new Error(
            'HTTP Bridge server is not running.\n' +
            'Start it with: bun bridge:start'
          );
        }

        // Get topology from bridge
        const topology = await getTopology();
        if (!topology) {
          throw new Error('Failed to fetch topology from bridge');
        }

        const devices = topology.devices;

        if (this.globalFlags.format === 'json' || this.globalFlags.jq) {
          this.outputData(devices.map(d => ({
            ...d,
            type: d.type, // Already formatted in bridge
          })));
          return;
        }

        if (devices.length === 0) {
          this.print('No devices found.');
          this.print('\nℹ️  Topology is empty or PT is not running.');
          return;
        }

        const tableData = devices.map(d => ({
          name: d.name,
          model: d.model || 'unknown',
          type: d.type,
          x: d.x || 0,
          y: d.y || 0,
        }));

        this.outputData(tableData);
        this.print(`\nTotal: ${devices.length} device(s)`);
        this.print(`Last update: ${new Date(topology.lastUpdate).toLocaleString()}`);
      },
    });
  }
}
