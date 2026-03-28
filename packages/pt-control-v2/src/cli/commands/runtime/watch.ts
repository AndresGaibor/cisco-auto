// ============================================================================
// PT Control V2 - Runtime Watch Command
// ============================================================================

import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pc from 'picocolors';
import { BaseCommand } from '../../base-command.js';
import { ValidationError } from '../../errors/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default class RuntimeWatch extends BaseCommand {
  static description = 'Watch for changes and rebuild runtime automatically';

  static examples = [
    '<%= config.bin %> runtime watch',
  ];

  static flags = {
    ...BaseCommand.baseFlags,
  };

  async run(): Promise<void> {
    const runtimeGeneratorPath = join(__dirname, '..', '..', '..', 'runtime-generator', 'index.ts');

    if (!existsSync(runtimeGeneratorPath)) {
      throw new ValidationError(`Runtime generator watch script not found at: ${runtimeGeneratorPath}`);
    }

    this.print(`${pc.cyan('Watching for changes...')} (Press Ctrl+C to stop)\n`);

    await this.runBunScript(runtimeGeneratorPath, 'watch');
  }

  private runBunScript(scriptPath: string, ...args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const proc = spawn('bun', ['run', scriptPath, ...args], {
        stdio: 'inherit',
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