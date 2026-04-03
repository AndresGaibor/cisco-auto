// ============================================================================
// PT Control V2 - Canvas Inspect Command
// ============================================================================

import { BaseCommand } from '../../base-command.js';
import { Args } from '@oclif/core';

export default class CanvasInspect extends BaseCommand {
  static override description = 'Inspect devices within a canvas rectangle';

  static override examples = [
    '<%= config.bin %> canvas inspect <rect-id>',
    '<%= config.bin %> canvas inspect area1 --format json',
    '<%= config.bin %> canvas inspect area1 --include-clusters',
  ];

  static override args = {
    rectId: Args.string({
      description: 'Canvas rectangle identifier',
      required: true,
    }),
  };

  static override flags = {
    ...BaseCommand.baseFlags,
    'include-clusters': BaseCommand.baseFlags['yes'],
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(CanvasInspect);
    const rectId = args.rectId as string;
    const includeClusters = flags['include-clusters'] as boolean;

    await this.runLoggedCommand({
      action: 'canvas:inspect',
      targetDevice: rectId,
      context: {
        format: this.globalFlags.format,
        includeClusters,
      },
      execute: async () => {
        const controller = this.createController();
        this.trackController(controller);

        await controller.start();

        try {
          const result = await controller.devicesInRect(rectId, includeClusters) as {
            ok: boolean;
            rectId: string;
            devices: string[];
            count: number;
            clusters?: string[];
          };

          const snapshot = await controller.snapshot() as {
            devices: Record<string, {
              name: string;
              model: string;
              type: string;
              power: boolean;
              x: number;
              y: number;
              ports: unknown[];
            }>;
          };

          const rectDevices = result.devices
            .map(id => snapshot.devices[id])
            .filter(Boolean);

          if (this.globalFlags.format === 'json' || this.globalFlags.jq) {
            this.outputData(result);
            return;
          }

          if (result.count === 0) {
            this.print(`No devices found in rectangle '${rectId}'.`);
            return;
          }

          this.print(`Devices in '${rectId}':\n`);
          this.print(`Total: ${result.count} device(s)\n`);

          const tableData = rectDevices.map(d => ({
            name: d?.name,
            model: d?.model,
            type: d?.type,
            status: d?.power ? 'on' : 'off',
            x: d?.x,
            y: d?.y,
          }));

          this.outputData(tableData);
        } finally {
          await controller.stop();
        }
      },
    });
  }
}
