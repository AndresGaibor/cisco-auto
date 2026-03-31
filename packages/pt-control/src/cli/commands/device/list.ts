// ============================================================================
// PT Control V2 - Device List Command
// ============================================================================

import { BaseCommand, Flags } from '../../base-command.js';
import { createDefaultPTController, PTController } from '../../../controller/index.js';
import type { DeviceState } from '../../../types/index.js';

export default class DeviceList extends BaseCommand {
  static override description = 'List all devices in the topology';

  static override examples = [
    '<%= config.bin %> device list',
    '<%= config.bin %> device list --format json',
    '<%= config.bin %> device list --filter router',
    '<%= config.bin %> device list --jq ".[].name"',
  ];

  static override flags = {
    ...BaseCommand.baseFlags,
    filter: Flags.string({
      description: 'Filter devices by type or model',
      char: 'F',
    }),
  };

  async run(): Promise<void> {
    const filter = this.flags.filter as string | undefined;

    await this.runLoggedCommand({
      action: 'device:list',
      targetDevice: filter ?? 'all',
      context: {
        format: this.globalFlags.format,
        hasFilter: Boolean(filter),
      },
      execute: async () => {
        const controller = createDefaultPTController();

        await controller.start();

        try {
          const devices = await this.listDevices(controller);

          let filtered = devices;
          if (filter) {
            const filterLower = filter.toLowerCase();
            filtered = devices.filter(d =>
              d.type.toLowerCase() === filterLower ||
              d.model.toLowerCase().includes(filterLower)
            );
          }

          if (this.globalFlags.format === 'json' || this.globalFlags.jq) {
            this.outputData(filtered);
            return;
          }

          if (filtered.length === 0) {
            this.print('No devices found.');
            return;
          }

          const tableData = filtered.map(d => ({
            name: d.name,
            model: d.model,
            type: d.type,
            status: d.power ? 'on' : 'off',
          }));

          this.outputData(tableData);
          this.print(`\nTotal: ${filtered.length} device(s)`);
        } finally {
          await controller.stop();
        }
      },
    });
  }

  private async listDevices(controller: PTController): Promise<DeviceState[]> {
    const result = await controller.listDevices() as unknown;

    if (Array.isArray(result)) {
      return result as DeviceState[];
    }

    if (result && typeof result === 'object') {
      const obj = result as { devices?: unknown };
      if (Array.isArray(obj.devices)) {
        return obj.devices as DeviceState[];
      }
    }

    return [];
  }
}
