// ============================================================================
// PT Control V2 - Runtime Watch Command
// ============================================================================

import { watch, existsSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import pc from 'picocolors';
import { BaseCommand } from '../../base-command.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PACKAGE_ROOT = resolve(__dirname, '..', '..', '..', '..');
const GENERATED_DIR = join(PACKAGE_ROOT, 'generated');
const require = createRequire(import.meta.url);
const runtimePackagePath = dirname(require.resolve('@cisco-auto/pt-runtime/package.json'));
const runtimeSrcDirCandidates = [
  join(runtimePackagePath, 'src'),
  join(runtimePackagePath, 'dist'),
];
const RUNTIME_WATCH_DIR = runtimeSrcDirCandidates.find((dir) => existsSync(dir)) ?? runtimePackagePath;

export default class RuntimeWatch extends BaseCommand {
  static override description = 'Watch for changes and rebuild runtime automatically (generates only, does not reload PT)';

  static override examples = [
    '<%= config.bin %> runtime watch',
    '<%= config.bin %> runtime watch --dev-dir ./my-topology',
  ];

  static override flags = {
    ...BaseCommand.baseFlags,
  };

  async run(): Promise<void> {
    this.print(`${pc.cyan('Watching for runtime changes...')} (Press Ctrl+C to stop)\n`);
    this.print(pc.gray(`Source directory: ${RUNTIME_WATCH_DIR}`));

    const runtimePath = '../../../../../pt-runtime/src/' + 'index';
    const runtime: any = await import(runtimePath);
    const generator = new runtime.RuntimeGenerator({
      outputDir: GENERATED_DIR,
      devDir: this.devDir,
    });

    await this.buildOnce(generator);
    await this.watchLoop(generator);
  }

  private async buildOnce(generator: any): Promise<void> {
    try {
      await generator.generate();
      this.printSuccess('Runtime generated');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.printWarning(`Runtime build failed: ${message}`);
    }
  }

  private async watchLoop(generator: any): Promise<void> {
    let scheduled: NodeJS.Timeout | null = null;

    const schedule = () => {
      if (scheduled) return;
      scheduled = setTimeout(async () => {
        scheduled = null;
        await this.buildOnce(generator);
      }, 250);
    };

    watch(RUNTIME_WATCH_DIR, { recursive: true }, (_event, filename) => {
      if (filename && !filename.endsWith('.ts') && !filename.endsWith('.js')) {
        return;
      }
      schedule();
    });

    await new Promise(() => {
      // Keep process alive until Ctrl+C
    });
  }
}
