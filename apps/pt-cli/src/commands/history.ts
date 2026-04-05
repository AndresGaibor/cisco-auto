#!/usr/bin/env bun
/**
 * Comando history - Historial de ejecuciones de comandos
 * Lista y muestra detalles de ejecuciones anteriores.
 * Migrado al patrón runCommand con CliResult
 */

import { Command } from 'commander';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import type { CliResult } from '../contracts/cli-result.js';
import { createSuccessResult, createErrorResult } from '../contracts/cli-result.js';
import type { CommandMeta } from '../contracts/command-meta.js';
import type { GlobalFlags } from '../flags.js';

import { runCommand } from '../application/run-command.js';
import { renderCliResult } from '../ux/renderers.js';
import { printExamples } from '../ux/examples.js';
import { historyStore } from '../telemetry/history-store.js';
import type { HistoryEntry } from '../contracts/history-entry.js';
import { getHistoryDir } from '../system/paths.js';

const HISTORY_EXAMPLES = [
  { command: 'pt history list', description: 'Listar últimas ejecuciones' },
  { command: 'pt history list --limit 20 --failed', description: 'Listar últimos 20 comandos fallidos' },
  { command: 'pt history show abc123', description: 'Ver detalle de una sesión' },
  { command: 'pt history last', description: 'Ver última ejecución' },
  { command: 'pt history rerun abc123', description: 'Re-ejecutar sesión anterior' },
  { command: 'pt history explain abc123', description: 'Explicar error de una sesión' },
];

const HISTORY_META: CommandMeta = {
  id: 'history',
  summary: 'Historial de ejecuciones de comandos',
  longDescription: 'Lista y muestra detalles de ejecuciones anteriores de comandos de la CLI.',
  examples: HISTORY_EXAMPLES,
  related: ['logs', 'results', 'doctor'],
  supportsVerify: false,
  supportsJson: true,
  supportsPlan: false,
  supportsExplain: false,
};

interface HistoryListResult {
  entries: HistoryEntry[];
  count: number;
}

interface HistoryShowResult {
  entry: HistoryEntry | null;
  availableSessions?: string[];
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + '...';
}

function getField(entry: HistoryEntry, field: 'sessionId' | 'session_id'): string {
  return entry.sessionId ?? (entry as unknown as Record<string, unknown>).session_id as string ?? '';
}

function getDuration(entry: HistoryEntry): number {
  return entry.durationMs ?? (entry as unknown as Record<string, unknown>).duration_ms as number ?? 0;
}

function getTargetDevice(entry: HistoryEntry): string | undefined {
  return entry.targetDevice ?? (entry as unknown as Record<string, unknown>).target_device as string | undefined;
}

function formatStatus(entry: HistoryEntry): { icon: string; status: string } {
  const status = entry.status ?? (entry.ok ? 'success' : 'error');
  if (status === 'success') return { icon: '✓', status: 'éxito' };
  if (status === 'error' || status === 'failure') return { icon: '✗', status: 'error' };
  return { icon: '?', status };
}

function formatEntryCompact(entry: HistoryEntry): string {
  const { icon } = formatStatus(entry);
  const sessionId = getField(entry, 'sessionId').slice(0, 8) || 'unknown';
  const action = truncate(entry.action ?? '', 15);
  const duration = getDuration(entry);
  const durationStr = formatDuration(duration);
  const targetDevice = getTargetDevice(entry);
  
  let summary = '';
  if (targetDevice) {
    summary = targetDevice.split(' ')[0] ?? targetDevice;
  }
  
  return `${icon} ${sessionId}  ${action.padEnd(18)} ${durationStr.padEnd(6)} ${summary}`;
}

export function createHistoryCommand(): Command {
  const cmd = new Command('history')
    .description('Historial de ejecuciones de comandos');

  cmd
    .command('list')
    .description('Lista las últimas ejecuciones')
    .option('-n, --limit <num>', 'Número de entradas a mostrar', '10')
    .option('--failed', 'Mostrar solo ejecuciones fallidas', false)
    .option('-a, --action <prefix>', 'Filtrar por prefijo de acción')
    .option('--examples', 'Mostrar ejemplos', false)
    .option('--explain', 'Explicar', false)
    .option('--plan', 'Mostrar plan', false)
    .action(async (options) => {
      const globalExamples = process.argv.includes('--examples');
      const globalExplain = process.argv.includes('--explain');
      const globalPlan = process.argv.includes('--plan');

      if (globalExamples) {
        console.log(printExamples(HISTORY_META));
        return;
      }

      if (globalExplain) {
        console.log(HISTORY_META.longDescription ?? HISTORY_META.summary);
        return;
      }

      if (globalPlan) {
        console.log('Plan de ejecución:');
        console.log('  1. Leer entradas del historial desde history-store');
        console.log('  2. Filtrar por limit, failed, action');
        console.log('  3. Mostrar en formato tabla o JSON');
        return;
      }

      const flags: GlobalFlags = {
        json: false, jq: null, output: 'text', verbose: false, quiet: false,
        trace: false, tracePayload: false, traceResult: false, traceDir: null,
        traceBundle: false, traceBundlePath: null, sessionId: null,
        examples: globalExamples, schema: false, explain: globalExplain, plan: globalPlan, verify: false,
      };

      const result = await runCommand<HistoryListResult>({
        action: 'history.list',
        meta: HISTORY_META,
        flags,
        payloadPreview: { limit: options.limit, failed: options.failed, action: options.action },
        execute: async (): Promise<CliResult<HistoryListResult>> => {
          try {
            const entries = await historyStore.list({
              limit: parseInt(options.limit, 10) || 10,
              failedOnly: options.failed,
              actionPrefix: options.action,
            });

            return createSuccessResult('history.list', {
              entries,
              count: entries.length,
            }, {
              advice: ['Usa pt history show <sessionId> para ver detalles'],
            });
          } catch (error) {
            return createErrorResult('history.list', {
              message: error instanceof Error ? error.message : String(error),
            }) as CliResult<HistoryListResult>;
          }
        },
      });

      const output = renderCliResult(result, flags.output);
      if (!flags.quiet || !result.ok) console.log(output);

      if (result.ok && result.data) {
        console.log('\nÚltimas ejecuciones\n');
        console.log('  Sesión    Acción              Duración  Detalles');
        console.log('  ' + '-'.repeat(56));
        for (const entry of result.data.entries) {
          console.log(formatEntryCompact(entry));
        }
        console.log(`\nTotal: ${result.data.count} entradas`);
      }

      if (!result.ok) process.exit(1);
    });

  cmd
    .command('show')
    .description('Muestra detalle de una ejecución')
    .argument('<sessionId>', 'ID de la sesión')
    .option('--json', 'Salida en JSON', false)
    .option('--examples', 'Mostrar ejemplos', false)
    .option('--explain', 'Explicar', false)
    .option('--plan', 'Mostrar plan', false)
    .action(async (sessionId: string, options) => {
      const globalExamples = process.argv.includes('--examples');
      const globalExplain = process.argv.includes('--explain');
      const globalPlan = process.argv.includes('--plan');

      if (globalExamples) {
        console.log(printExamples(HISTORY_META));
        return;
      }

      if (globalExplain) {
        console.log(HISTORY_META.longDescription ?? HISTORY_META.summary);
        return;
      }

      if (globalPlan) {
        console.log('Plan de ejecución:');
        console.log(`  1. Buscar sesión: ${sessionId}`);
        console.log('  2. Mostrar detalle completo');
        return;
      }

      const flags: GlobalFlags = {
        json: false, jq: null, output: 'text', verbose: false, quiet: false,
        trace: false, tracePayload: false, traceResult: false, traceDir: null,
        traceBundle: false, traceBundlePath: null, sessionId: null,
        examples: globalExamples, schema: false, explain: globalExplain, plan: globalPlan, verify: false,
      };

      const result = await runCommand<HistoryShowResult>({
        action: 'history.show',
        meta: HISTORY_META,
        flags,
        payloadPreview: { sessionId },
        execute: async (): Promise<CliResult<HistoryShowResult>> => {
          try {
            const entry = await historyStore.read(sessionId);
            
            const historyDir = getHistoryDir();
            let availableSessions: string[] | undefined;
            
            if (!entry && existsSync(historyDir)) {
              const sessionsDir = join(historyDir, 'sessions');
              if (existsSync(sessionsDir)) {
                availableSessions = readdirSync(sessionsDir)
                  .filter(f => f.endsWith('.json'))
                  .map(f => f.replace('.json', ''));
              }
            }

            return createSuccessResult('history.show', {
              entry,
              availableSessions,
            });
          } catch (error) {
            return createErrorResult('history.show', {
              message: error instanceof Error ? error.message : String(error),
            }) as CliResult<HistoryShowResult>;
          }
        },
      });

      const output = renderCliResult(result, flags.output);
      if (!flags.quiet || !result.ok) console.log(output);

      if (!result.ok) process.exit(1);
    });

  cmd
    .command('last')
    .description('Muestra la última ejecución')
    .option('--json', 'Salida en JSON', false)
    .option('--examples', 'Mostrar ejemplos', false)
    .option('--explain', 'Explicar', false)
    .option('--plan', 'Mostrar plan', false)
    .action(async (options) => {
      const globalExamples = process.argv.includes('--examples');
      const globalExplain = process.argv.includes('--explain');
      const globalPlan = process.argv.includes('--plan');

      if (globalExamples) {
        console.log(printExamples(HISTORY_META));
        return;
      }

      if (globalExplain || globalPlan) {
        console.log('Plan de ejecución:');
        console.log('  1. Obtener última entrada del historial');
        console.log('  2. Mostrar detalle');
        return;
      }

      const flags: GlobalFlags = {
        json: false, jq: null, output: 'text', verbose: false, quiet: false,
        trace: false, tracePayload: false, traceResult: false, traceDir: null,
        traceBundle: false, traceBundlePath: null, sessionId: null,
        examples: globalExamples, schema: false, explain: globalExplain, plan: globalPlan, verify: false,
      };

      const result = await runCommand<HistoryShowResult>({
        action: 'history.last',
        meta: HISTORY_META,
        flags,
        payloadPreview: {},
        execute: async (): Promise<CliResult<HistoryShowResult>> => {
          try {
            const entries = await historyStore.list({ limit: 1 });
            
            if (entries.length === 0) {
              return createErrorResult('history.last', {
                message: 'No hay historial disponible',
              }) as CliResult<HistoryShowResult>;
            }

            return createSuccessResult('history.last', {
              entry: entries[0]!,
            });
          } catch (error) {
            return createErrorResult('history.last', {
              message: error instanceof Error ? error.message : String(error),
            }) as CliResult<HistoryShowResult>;
          }
        },
      });

      const output = renderCliResult(result, flags.output);
      if (!flags.quiet || !result.ok) console.log(output);

      if (!result.ok) process.exit(1);
    });

  cmd
    .command('rerun')
    .description('Re-ejecuta una sesión anterior (si es rerunnable)')
    .argument('<sessionId>', 'ID de la sesión')
    .option('--examples', 'Mostrar ejemplos', false)
    .option('--explain', 'Explicar', false)
    .option('--plan', 'Mostrar plan', false)
    .action(async (sessionId: string, options) => {
      const globalExamples = process.argv.includes('--examples');
      const globalExplain = process.argv.includes('--explain');
      const globalPlan = process.argv.includes('--plan');

      if (globalExamples || globalExplain || globalPlan) {
        console.log('Re-ejecutar una sesión anterior.');
        console.log('Nota: Esta funcionalidad requiere implementación adicional.');
        return;
      }

      const flags: GlobalFlags = {
        json: false, jq: null, output: 'text', verbose: false, quiet: false,
        trace: false, tracePayload: false, traceResult: false, traceDir: null,
        traceBundle: false, traceBundlePath: null, sessionId: null,
        examples: globalExamples, schema: false, explain: globalExplain, plan: globalPlan, verify: false,
      };

      type RerunResult = { sessionId: string; rerunnable: boolean };
      const result = await runCommand<RerunResult>({
        action: 'history.rerun',
        meta: HISTORY_META,
        flags,
        payloadPreview: { sessionId },
        execute: async (): Promise<CliResult<RerunResult>> => {
          try {
            const entry = await historyStore.read(sessionId);
            
            if (!entry) {
              return createErrorResult('history.rerun', {
                message: `No se encontró la sesión: ${sessionId}`,
              }) as CliResult<RerunResult>;
            }

            const isRerunnable = (entry as unknown as Record<string, unknown>).rerunnable as boolean | undefined;
            
            if (!isRerunnable) {
              return createErrorResult('history.rerun', {
                message: `La sesión ${sessionId} no es rerunnable`,
              }) as CliResult<RerunResult>;
            }

            return createSuccessResult('history.rerun', {
              sessionId,
              rerunnable: true,
            }, {
              advice: ['Re-ejecución de sesiones requiere implementación adicional'],
            });
          } catch (error) {
            return createErrorResult('history.rerun', {
              message: error instanceof Error ? error.message : String(error),
            }) as CliResult<RerunResult>;
          }
        },
      });

      const output = renderCliResult(result, flags.output);
      if (!flags.quiet || !result.ok) console.log(output);

      if (!result.ok) process.exit(1);
    });

  cmd
    .command('explain')
    .description('Explica el error de una sesión fallida')
    .argument('<sessionId>', 'ID de la sesión')
    .option('--examples', 'Mostrar ejemplos', false)
    .option('--explain', 'Explicar', false)
    .option('--plan', 'Mostrar plan', false)
    .action(async (sessionId: string, options) => {
      const globalExamples = process.argv.includes('--examples');
      const globalExplain = process.argv.includes('--explain');
      const globalPlan = process.argv.includes('--plan');

      if (globalExamples) {
        console.log(printExamples(HISTORY_META));
        return;
      }

      if (globalPlan) {
        console.log('Plan de ejecución:');
        console.log(`  1. Buscar sesión: ${sessionId}`);
        console.log('  2. Analizar error');
        console.log('  3. Proponer próximos pasos');
        return;
      }

      const flags: GlobalFlags = {
        json: false, jq: null, output: 'text', verbose: false, quiet: false,
        trace: false, tracePayload: false, traceResult: false, traceDir: null,
        traceBundle: false, traceBundlePath: null, sessionId: null,
        examples: globalExamples, schema: false, explain: globalExplain, plan: globalPlan, verify: false,
      };

      type ExplainResult = { sessionId: string; error?: string; duration?: number };
      const result = await runCommand<ExplainResult>({
        action: 'history.explain',
        meta: HISTORY_META,
        flags,
        payloadPreview: { sessionId },
        execute: async (): Promise<CliResult<ExplainResult>> => {
          try {
            const entry = await historyStore.read(sessionId);
            
            if (!entry) {
              return createErrorResult('history.explain', {
                message: `No se encontró la sesión: ${sessionId}`,
              }) as CliResult<ExplainResult>;
            }

            const status = entry.status ?? (entry.ok ? 'success' : 'error');
            
            if (status === 'success') {
              return createErrorResult('history.explain', {
                message: `La sesión ${sessionId} fue exitosa, no hay error que explicar`,
              }) as CliResult<ExplainResult>;
            }

            const errorMessage = entry.errorMessage ?? (entry as unknown as Record<string, unknown>).error_message as string | undefined;
            const duration = entry.durationMs ?? (entry as unknown as Record<string, unknown>).duration_ms as number | undefined;

            return createSuccessResult('history.explain', {
              sessionId,
              error: errorMessage,
              duration,
            }, {
              advice: [
                'Usa pt logs session ' + sessionId + ' para más detalles',
                'Usa pt doctor para diagnostics',
              ],
            });
          } catch (error) {
            return createErrorResult('history.explain', {
              message: error instanceof Error ? error.message : String(error),
            }) as CliResult<ExplainResult>;
          }
        },
      });

      const output = renderCliResult(result, flags.output);
      if (!flags.quiet || !result.ok) console.log(output);

      if (!result.ok) process.exit(1);
    });

  return cmd;
}