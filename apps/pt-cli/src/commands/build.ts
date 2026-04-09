import { Command } from 'commander';

export function createBuildCommand(): Command {
  return new Command('build')
    .description('Build y deploy de archivos a ~/pt-dev/')
    .action(async () => {
      const { execSync } = await import('child_process');
      const { resolve } = await import('path');

      console.log('🔨 Build y deploy de PT Runtime...\n');

      const rootDir = resolve(import.meta.dirname, '../..');

      try {
        execSync('bun run pt:build', { stdio: 'inherit', cwd: rootDir });
        console.log('\n✅ Build completado. Archivos deployados a ~/pt-dev/');
        console.log('💡 Ahora carga ~/pt-dev/main.js en Packet Tracer');
      } catch {
        process.exit(1);
      }
    });
}
