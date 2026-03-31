// ============================================================================
// PT Control V2 - Runtime Build Command
// ============================================================================

import { Flags } from '@oclif/core';
import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pc from 'picocolors';
import { BaseCommand, createSpinner } from '../../base-command.js';
import { ValidationError } from '../../errors/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

    const runtimeGeneratorPath = join(__dirname, '..', '..', '..', 'runtime-generator', 'index.ts');

    if (!existsSync(runtimeGeneratorPath)) {
      spinner.fail('Runtime generator not found');
      throw new ValidationError(`Runtime generator build script not found at: ${runtimeGeneratorPath}`);
    }

    try {
      await this.runBunScript(runtimeGeneratorPath, 'build');
      spinner.succeed('Runtime build complete');

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

  private runBunScript(scriptPath: string, ...args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const proc = spawn('bun', ['run', scriptPath, ...args], {
        stdio: this.globalFlags.quiet ? 'ignore' : 'inherit',
        shell: false,
      });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Script exited with code ${code}`));
        }
      });

      proc.on('error', (err) => {
        reject(err);
      });
    });
  }
}