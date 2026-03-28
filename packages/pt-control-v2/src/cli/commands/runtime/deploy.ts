// ============================================================================
// PT Control V2 - Runtime Deploy Command
// ============================================================================

import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pc from 'picocolors';
import { BaseCommand, createSpinner } from '../../base-command.js';
import { ValidationError } from '../../errors/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default class RuntimeDeploy extends BaseCommand {
  static description = 'Deploy runtime files to Packet Tracer development directory';

  static examples = [
    '<%= config.bin %> runtime deploy',
    '<%= config.bin %> runtime deploy --dev-dir ~/my-pt-dev',
  ];

  static flags = {
    ...BaseCommand.baseFlags,
  };

  async run(): Promise<void> {
    const spinner = createSpinner(`Deploying to ${pc.cyan(this.devDir)}...`);
    spinner.start();

    const runtimeGeneratorPath = join(__dirname, '..', '..', '..', 'runtime-generator', 'index.ts');

    if (!existsSync(runtimeGeneratorPath)) {
      spinner.fail('Runtime generator not found');
      throw new ValidationError(`Runtime generator deploy script not found at: ${runtimeGeneratorPath}`);
    }

    try {
      await this.runBunScript(runtimeGeneratorPath, 'deploy');
      spinner.succeed('Runtime deployed successfully');

      if (!this.globalFlags.quiet) {
        this.print(`\nFiles deployed to ${this.devDir}:`);
        this.print(`  - main.js      (load this in Packet Tracer)`);
        this.print(`  - runtime.js   (runtime code)`);
        this.print(`  - state.json   (state file)`);
        this.print(`  - command.json (command file)`);
        this.print(`  - response/    (response directory)`);
        this.print(`\n${pc.gray('Open Packet Tracer and load main.js to connect.')}`);
      }
    } catch (error) {
      spinner.fail('Deploy failed');
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