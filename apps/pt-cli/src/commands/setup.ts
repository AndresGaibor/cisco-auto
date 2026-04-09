import { Command } from 'commander';
import { execSync } from 'node:child_process';
import { resolve } from 'node:path';

export function createSetupCommand(): Command {
  return new Command('setup')
    .description('Preparar entorno local de Packet Tracer')
    .action(() => {
      const rootDir = resolve(import.meta.dirname, '../..');
      execSync('bun run pt:build', { stdio: 'inherit', cwd: rootDir });
      console.log('✓ CLI instalada');
      console.log('✓ Runtime generado');
      console.log('✓ main.js y runtime.js desplegados en ~/pt-dev');
    });
}
