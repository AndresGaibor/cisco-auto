// ============================================================================
// PT Control V2 - Runtime Build Command
// ============================================================================

import { Flags } from '@oclif/core';
import { RuntimeGenerator } from '@cisco-auto/pt-runtime';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { BaseCommand, createSpinner } from '../../base-command.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PACKAGE_ROOT = resolve(__dirname, '..', '..', '..', '..');
const GENERATED_DIR = join(PACKAGE_ROOT, 'generated');

export default class RuntimeBuild extends BaseCommand {
  static override description = 'Build the Packet Tracer runtime files';

  static override examples = [
    '<%= config.bin %> runtime build',
    '<%= config.bin %> runtime build --deploy',
    '<%= config.bin %> runtime build --dev-dir ~/my-pt-dev',
  ];

  static override flags = {
    ...BaseCommand.baseFlags,
    deploy: Flags.boolean({
      description: 'Deploy after building',
      default: false,
      char: 'd',
    }),
  };

  async run(): Promise<void> {
    const deploy = this.flags.deploy as boolean;
    const spinner = createSpinner('Building runtime files...');
    spinner.start();

    try {
      const generator = this.createGenerator();
      await generator.generate();
      spinner.succeed('Runtime build complete');

      if (!this.globalFlags.quiet) {
        this.print(`\nArtifacts written to ${GENERATED_DIR}:`);
        this.print('  - main.js');
        this.print('  - runtime.js');
      }

      if (deploy) {
        const { default: RuntimeDeploy } = await import('./deploy.js');
        const deployCmd = new RuntimeDeploy([], this.config);
        await deployCmd.init();
        await deployCmd.run();
      } else {
        this.print('\nRun `pt runtime deploy` to deploy to Packet Tracer');
      }
    } catch (error) {
      spinner.fail('Build failed');
      throw error;
    }
  }

  private createGenerator(): RuntimeGenerator {
    return new RuntimeGenerator({
      outputDir: GENERATED_DIR,
      devDir: this.devDir,
    });
  }
}
