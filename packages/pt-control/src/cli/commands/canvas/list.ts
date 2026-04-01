// ============================================================================
// PT Control V2 - Canvas List Command
// ============================================================================

import { BaseCommand } from '../../base-command.js';
import { createDefaultPTController } from '../../../controller/index.js';

export default class CanvasList extends BaseCommand {
  static override description = 'List all canvas rectangles in Packet Tracer';

  static override examples = [
    '<%= config.bin %> canvas list',
    '<%= config.bin %> canvas list --format json',
  ];

  static override flags = {
    ...BaseCommand.baseFlags,
  };

  async run(): Promise<void> {
    await this.runLoggedCommand({
      action: 'canvas:list',
      context: {
        format: this.globalFlags.format,
      },
      execute: async () => {
        const controller = createDefaultPTController();
        this.trackController(controller);

        await controller.start();

        try {
          const result = await controller.listCanvasRects() as { rects: string[]; count: number };

          if (this.globalFlags.format === 'json' || this.globalFlags.jq) {
            this.outputData(result);
            return;
          }

          if (result.count === 0) {
            this.print('No canvas rectangles found.');
            return;
          }

          this.print(`Found ${result.count} canvas rectangle(s):\n`);
          result.rects.forEach((rect, i) => {
            this.print(`  ${i + 1}. ${rect}`);
          });
        } finally {
          await controller.stop();
        }
      },
    });
  }
}
