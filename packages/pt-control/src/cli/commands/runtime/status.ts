// ============================================================================
// PT Control V2 - Runtime Status Command
// ============================================================================

import { existsSync, statSync } from 'fs';
import { join } from 'path';
import pc from 'picocolors';
import { BaseCommand } from '../../base-command.js';

export default class RuntimeStatus extends BaseCommand {
  static override description = 'Show runtime status and file health';

  static override aliases = ['status'];

  static override examples = [
    '<%= config.bin %> runtime status',
    '<%= config.bin %> runtime status --dev-dir ~/my-pt-dev',
  ];

  static override flags = {
    ...BaseCommand.baseFlags,
  };

  async run(): Promise<void> {
    const files = [
      { name: 'main.js', desc: 'PT extension entry point' },
      { name: 'runtime.js', desc: 'Runtime code' },
      { name: 'state.json', desc: 'State file' },
      { name: 'command.json', desc: 'Command file' },
      { name: 'results/', desc: 'Results directory' },
    ];

    this.print(`Runtime Status (${this.devDir})\n`);

    let allOk = true;
    for (const file of files) {
      const filePath = join(this.devDir, file.name);
      const exists = existsSync(filePath);
      const status = exists ? pc.green('OK') : pc.red('MISSING');
      let extra = '';

      if (exists && (file.name === 'state.json' || file.name === 'command.json')) {
        try {
          const stats = statSync(filePath);
          const ageMs = Date.now() - stats.mtimeMs;
          if (ageMs < 60000) {
            extra = pc.gray(` (${Math.round(ageMs / 1000)}s ago)`);
          } else if (ageMs < 3600000) {
            extra = pc.gray(` (${Math.round(ageMs / 60000)}m ago)`);
          }
        } catch {
          // Ignore
        }
      }

      if (!exists) {
        allOk = false;
      }

      this.print(`${file.name.padEnd(15)} ${status.padEnd(10)} ${file.desc}${extra}`);
    }

    this.print('');
    if (allOk) {
      this.printSuccess('All files present. Runtime is ready.');
    } else {
      this.printWarning('Some files are missing.');
      this.print('Run `pt runtime build --deploy` to set up.');
    }

    // Check PT connection
    const stateFile = join(this.devDir, 'state.json');
    if (existsSync(stateFile)) {
      this.print('\n');
      try {
        const controller = this.createController();
        this.trackController(controller);
        await controller.start();
        const state = controller.readState() as { devices?: Record<string, unknown> } | null;
        await controller.stop();

        if (state) {
          const deviceCount = state.devices ? Object.keys(state.devices).length : 0;
          this.print(`Packet Tracer connection: ${pc.green('ACTIVE')}`);
          this.print(`Devices in topology: ${deviceCount}`);
        } else {
          this.print(`Packet Tracer connection: ${pc.yellow('STALE')}`);
          this.print('The state file exists but PT may not be running.');
        }
      } catch {
        this.print(`Packet Tracer connection: ${pc.red('NOT ACTIVE')}`);
        this.print('Open Packet Tracer and load main.js to connect.');
      }
    }

    this.print('');
  }
}