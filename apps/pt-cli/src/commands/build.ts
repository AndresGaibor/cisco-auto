import { Command } from 'commander';
import { runSubprocess } from '../system/run-subprocess.js';
import { ExitCodes } from '../errors/index.js';
import { getGlobalFlags } from '../flags.js';
import { resolveTimeout } from '../utils/timeout.js';

export function createBuildCommand(): Command {
  return new Command('build')
    .description('Build y deploy de archivos a ~/pt-dev/')
    .action(async function () {
      const { resolve } = await import('path');

      console.log('🔨 Build y deploy de PT Runtime...\n');

      const rootDir = resolve(import.meta.dirname, '../../../../');

      const parent = this.parent as Command;
      const globalFlags = parent ? getGlobalFlags(parent) : { json: false, jq: null, output: 'text' as const, verbose: false, quiet: false, trace: false, tracePayload: false, traceResult: false, traceDir: null, traceBundle: false, traceBundlePath: null, sessionId: null, examples: false, schema: false, explain: false, plan: false, verify: true, timeout: null, noTimeout: false };
      const timeoutMs = resolveTimeout(undefined, globalFlags);

      const result = await runSubprocess({
        cmd: ['bun', 'run', 'pt:build'],
        cwd: rootDir,
        timeoutMs,
      });

      // Forward output to maintain same behavior as stdio: 'inherit'
      process.stdout.write(result.stdout);
      process.stderr.write(result.stderr);

      if (result.timedOut) {
        console.log('\n⏰ Build timeout exceeded');
        process.exit(ExitCodes.TIMEOUT);
      }

      if (!result.success) {
        console.log('\n❌ Build failed');
        process.exit(ExitCodes.ERROR);
      }

      console.log('\n✅ Build completado. Archivos deployados a ~/pt-dev/');
      console.log('💡 Ahora carga ~/pt-dev/main.js en Packet Tracer');
    });
}
