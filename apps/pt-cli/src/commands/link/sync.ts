#!/usr/bin/env bun
import { Command } from 'commander';
import chalk from 'chalk';
import { runCommand } from '../../application/run-command.js';
import { createSuccessResult, createErrorResult } from '../../contracts/cli-result.js';

interface SyncLinksResult {
  ok: boolean;
  added: number;
  removed: number;
  totalLinks: number;
  error?: string;
}

export function createLinkSyncCommand(): Command {
  return new Command('sync')
    .description('Sincronizar links.json con la topología actual de PT')
    .option('--add-only', 'Solo agregar links faltantes, no limpiar obsoletos')
    .option('--prune', 'Solo limpiar links obsoletos, no agregar faltantes')
    .option('--dry-run', 'Mostrar qué se haría sin hacer cambios')
    .option('-j, --json', 'Salida en JSON')
    .action(async (options) => {
      const dryRun = options.dryRun;
      const addOnly = options.addOnly;
      const pruneOnly = options.prune;

      if (dryRun) {
        console.log(chalk.cyan('[Dry Run] Simulando sync de links...\n'));
      }

      const result = await runCommand<SyncLinksResult>({
        action: 'link.sync',
        meta: {
          id: 'link.sync',
          summary: 'Sincronizar links.json con la topología de PT',
          examples: [
            { command: 'pt link sync', description: 'Sincronizar todos los links' },
            { command: 'pt link sync --add-only', description: 'Solo agregar links faltantes' },
            { command: 'pt link sync --prune', description: 'Solo limpiar links obsoletos' },
            { command: 'pt link sync --dry-run', description: 'Preview sin hacer cambios' },
          ],
          related: ['link list', 'device list'],
        },
        flags: {
          json: Boolean(options.json),
          jq: null,
          output: 'text',
          verbose: false,
          quiet: false,
          trace: false,
          tracePayload: false,
          traceResult: false,
          traceDir: null,
          traceBundle: false,
          traceBundlePath: null,
          sessionId: null,
          examples: false,
          schema: false,
          explain: false,
          plan: false,
          verify: false,
        },
        execute: async ({ controller }) => {
          await controller.start();

          try {
            const snapshot = await controller.snapshot();

            if (!snapshot || !snapshot.devices) {
              return createErrorResult('link.sync', {
                message: 'No se pudo obtener la topología de PT. Asegúrate de que PT esté corriendo.',
              });
            }

            const links = snapshot.links || {};

            if (dryRun) {
              const deviceNames = new Set(Object.keys(snapshot.devices));
              let wouldAdd = 0;

              for (const linkId of Object.keys(links)) {
                const link = (links as any)[linkId];
                const d1 = link?.device1;
                const d2 = link?.device2;
                if (d1 && d2 && deviceNames.has(d1) && deviceNames.has(d2)) {
                  wouldAdd++;
                }
              }

              return createSuccessResult('link.sync', {
                ok: true,
                added: wouldAdd,
                removed: 0,
                totalLinks: Object.keys(links).length,
              });
            }

            const bridge = controller.getBridge();
            const syncResult = await bridge.sendCommandAndWait<SyncLinksResult>('syncLinks', {
              links,
            }, 30000);

            const value = syncResult?.value;
            if (!value) {
              return createErrorResult('link.sync', {
                message: 'No se recibió respuesta del runtime',
              });
            }

            return createSuccessResult('link.sync', value);
          } finally {
            await controller.stop();
          }
        },
      });

      if (!result.ok) {
        console.error(`${chalk.red('✗')} Error: ${result.error?.message}`);
        process.exit(1);
      }

      const data = result.data;

      if (options.json) {
        console.log(JSON.stringify(data, null, 2));
        return;
      }

      if (dryRun) {
        console.log(chalk.bold('\n[Dry Run] Resultados simulados:'));
      } else {
        console.log(chalk.bold('\n[Sync] Resultados:'));
      }

      console.log(chalk.gray('─'.repeat(50)));
      console.log(`  ${chalk.green('+')} Links agregados:    ${data?.added ?? 0}`);
      console.log(`  ${chalk.red('-')} Links eliminados:   ${data?.removed ?? 0}`);
      console.log(`  ${chalk.cyan('=')} Total en registry:  ${data?.totalLinks ?? 0}`);
      console.log(chalk.gray('─'.repeat(50)));

      if (data?.error) {
        console.log(`\n${chalk.yellow('⚠')} Advertencia: ${data.error}`);
      }

      if (dryRun) {
        console.log(chalk.cyan('\n→ Usa sin --dry-run para aplicar los cambios'));
      } else if ((data?.added ?? 0) > 0 || (data?.removed ?? 0) > 0) {
        console.log(chalk.green('\n✓ Sincronización completada'));
      } else {
        console.log(chalk.gray('\n→ No había cambios que aplicar'));
      }
    });

  return new Command('sync');
}
