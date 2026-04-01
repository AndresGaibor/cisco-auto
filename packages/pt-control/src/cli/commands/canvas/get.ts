// ============================================================================
// PT Control V2 - Canvas Get Command
// ============================================================================

import { BaseCommand } from '../../base-command.js';
import { Args } from '@oclif/core';

export default class CanvasGet extends BaseCommand {
  static override description = 'Get detailed information about a canvas rectangle';

  static override examples = [
    '<%= config.bin %> canvas get area1',
    '<%= config.bin %> canvas get zone1 --format json',
  ];

  static override args = {
    rectId: Args.string({
      description: 'Canvas rectangle identifier',
      required: true,
    }),
  };

  static override flags = {
    ...BaseCommand.baseFlags,
  };

  async run(): Promise<void> {
    const { args } = await this.parse(CanvasGet);
    const rectId = args.rectId as string;

    await this.runLoggedCommand({
      action: 'canvas:get',
      targetDevice: rectId,
      context: {
        format: this.globalFlags.format,
      },
      execute: async () => {
        const controller = this.createController();
        this.trackController(controller);

        await controller.start();

        try {
          const result = await controller.getRect(rectId) as {
            ok: boolean;
            rectId: string;
            data?: Record<string, unknown>;
            error?: string;
          };

          if (this.globalFlags.format === 'json' || this.globalFlags.jq) {
            this.outputData(result);
            return;
          }

          if (!result.ok) {
            this.print(`Error: ${result.error ?? 'Rect not found'}`);
            return;
          }

          if (!result.data) {
            this.print(`No data found for rectangle '${rectId}'.`);
            return;
          }

          this.print(`Rectangle: ${rectId}\n`);
          const data = result.data;
          const displayFields: [string, unknown][] = [
            ['ID', data['id'] ?? rectId],
            ['Name', data['name']],
            ['Type', data['type']],
            ['Position', `x=${data['x'] ?? 0}, y=${data['y'] ?? 0}`],
            ['Size', `width=${data['width'] ?? 0}, height=${data['height'] ?? 0}`],
          ];

          for (const [key, value] of displayFields) {
            if (value !== undefined) {
              this.print(`  ${key}: ${value}`);
            }
          }

          if (data['color']) {
            this.print(`  Color: ${data['color']}`);
          }
        } finally {
          await controller.stop();
        }
      },
    });
  }
}
