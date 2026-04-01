// ============================================================================
// PT Control V2 - Link List Command
// ============================================================================

import { BaseCommand } from '../../base-command.js';
import { createDefaultPTController } from '../../../controller/index.js';
import type { LinkState } from '../../../types/index.js';

export default class LinkList extends BaseCommand {
  static override description = 'List all links in the topology';

  static override aliases = ['links'];

  static override examples = [
    '<%= config.bin %> link list',
    '<%= config.bin %> link list --format json',
    '<%= config.bin %> link list --jq ".[].cableType"',
  ];

  static override flags = {
    ...BaseCommand.baseFlags,
  };

  async run(): Promise<void> {
    await this.runLoggedCommand({
      action: 'link:list',
      targetDevice: 'all',
      context: { format: this.globalFlags.format },
      execute: async () => {
        const controller = createDefaultPTController();
        this.trackController(controller);

        await controller.start();

        try {
          const snapshot = await controller.snapshot();
          const links = Object.values(snapshot.links) as LinkState[];

          if (this.globalFlags.format === 'json' || this.globalFlags.jq) {
            this.outputData(links);
            return;
          }

          if (links.length === 0) {
            this.print('No links found.');
            return;
          }

          const tableData = links.map(link => ({
            endpoint1: `${link.device1}:${link.port1}`,
            endpoint2: `${link.device2}:${link.port2}`,
            cableType: link.cableType,
          }));

          this.outputData(tableData);
          this.print(`\nTotal: ${links.length} link(s)`);
        } finally {
          await controller.stop();
        }
      },
    });
  }
}
