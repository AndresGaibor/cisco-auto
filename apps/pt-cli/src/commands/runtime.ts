import { Command } from 'commander';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { listRuntimeSnapshots, restoreRuntimeSnapshot } from '@cisco-auto/pt-runtime';

function getDevDir(): string {
  return process.env.PT_DEV_DIR ?? resolve(import.meta.dirname, '../../../../pt-dev');
}

export function createRuntimeCommand(): Command {
  const runtime = new Command('runtime').description('Operaciones del runtime de Packet Tracer');

  runtime.command('releases')
    .description('Listar snapshots locales del runtime')
    .action(() => {
      const snapshots = listRuntimeSnapshots(getDevDir());
      console.log('');
      console.log('═══ Runtime releases ═══');
      console.log('');
      if (snapshots.length === 0) {
        console.log('  No hay snapshots disponibles.');
        return;
      }
      for (const snapshot of snapshots) {
        console.log(`  - ${snapshot}`);
      }
      console.log('');
    });

  runtime.command('rollback')
    .option('--last', 'Restaurar el último snapshot', true)
    .option('--snapshot <name>', 'Nombre específico del snapshot')
    .description('Restaurar artefactos del runtime desde un snapshot')
    .action((options) => {
      const restored = restoreRuntimeSnapshot(getDevDir(), options.snapshot);
      if (!restored) {
        console.log('No hay snapshot disponible para restaurar.');
        process.exit(1);
      }
      console.log(`Restaurado: ${restored}`);
    });

  return runtime;
}
