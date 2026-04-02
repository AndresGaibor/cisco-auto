// ============================================================================
// PT Control V2 - Runtime Deploy Command
// ============================================================================

import { RuntimeGenerator } from '@cisco-auto/file-bridge';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import pc from 'picocolors';
import { BaseCommand, createSpinner } from '../../base-command.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PACKAGE_ROOT = resolve(__dirname, '..', '..', '..', '..');
const GENERATED_DIR = join(PACKAGE_ROOT, 'generated');

export default class RuntimeDeploy extends BaseCommand {
  static override description = 'Deploy runtime files to Packet Tracer development directory';

  static override examples = [
    '<%= config.bin %> runtime deploy',
    '<%= config.bin %> runtime deploy --dev-dir ~/my-pt-dev',
  ];

  static override flags = {
    ...BaseCommand.baseFlags,
  };

  async run(): Promise<void> {
    const spinner = createSpinner(`Deploying to ${pc.cyan(this.devDir)}...`);
    spinner.start();

    try {
      const generator = new RuntimeGenerator({
        outputDir: GENERATED_DIR,
        devDir: this.devDir,
      });
      await generator.deploy();
      spinner.succeed('Runtime deployed successfully');

      if (!this.globalFlags.quiet) {
        this.print(`\nFiles deployed to ${this.devDir}:`);
        this.print('  - main.js      (load this in Packet Tracer)');
        this.print('  - runtime.js   (runtime code)');
        this.print(`\n${pc.gray('Open Packet Tracer and load main.js to connect.')}`);
      }
    } catch (error) {
      spinner.fail('Deploy failed');
      throw error;
    }
  }
}
