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

function inferFailureCauses(entry: HistoryEntry): string[] {
  const causes: string[] = [];

  const ctx = entry.contextSummary as Record<string, unknown> | undefined;
  if (ctx?.bridgeReady === false) {
    causes.push('Bridge no estaba listo durante la ejecución.');
  }

  if (entry.warnings?.some(w => /heartbeat stale|heartbeat missing/i.test(w))) {
    causes.push('Packet Tracer parecía no estar disponible o no responder.');
  }

  if (entry.verificationSummary?.includes('not verified')) {
    causes.push('La acción pudo ejecutarse, pero no quedó verificada.');
  }

  if (entry.warnings?.some(w => /desincronizada|desynced/i.test(w))) {
    causes.push('La topología pudo haber quedado desincronizada tras la ejecución.');
  }

  const errMsg = entry.errorMessage ?? (entry as unknown as Record<string, unknown>).error_message as string | undefined;
  if (errMsg) {
    if (/lease/i.test(errMsg)) causes.push('El lease del bridge era inválido o expiró.');
    if (/runtime/i.test(errMsg)) causes.push('El runtime de PT no estaba cargado o falló.');
    if (/timeout/i.test(errMsg)) causes.push('Se agotó el tiempo de espera del comando.');
    if (/terminal/i.test(errMsg)) causes.push('La terminal del dispositivo no estaba disponible.');
  }

  const compReason = entry.completionReason;
  if (compReason && entry.status !== 'success') {
    causes.push(`Razón de finalización: ${compReason}`);
  }

  if (causes.length === 0 && entry.status !== 'success') {
    causes.push('Causa no determinada. Revisa pt logs session para más detalle.');
  }

  return causes;
}

function classifyRerunnable(entry: HistoryEntry): { rerunnable: boolean; reason: string } {
  const action = entry.action ?? '';
  const nonTerminalActions = ['history.list', 'history.show', 'history.last', 'status', 'doctor', 'results.list', 'results.view', 'device.list', 'device.get', 'link.list', 'lab.list', 'lab.validate', 'topology.analyze'];
  const writeActions = ['config.ios', 'config.host', 'device.add', 'device.remove', 'link.add', 'link.remove', 'vlan.apply', 'stp.apply', 'routing.apply', 'acl.apply'];

  if (nonTerminalActions.includes(action)) {
    return { rerunnable: true, reason: 'Lectura idempotente, seguro re-ejecutar.' };
  }

  if (writeActions.includes(action)) {
    return { rerunnable: false, reason: 'Acción de escritura con efectos secundarios. Re-ejecutar manualmente con precaución.' };
  }

  if (entry.status === 'error' && entry.errorMessage?.includes('confirmación')) {
    return { rerunnable: false, reason: 'Requirió confirmación interactiva.' };
  }

  return { rerunnable: false, reason: 'Tipo de acción no clasificado como rerunnable.' };
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

      if (result.ok && result.data?.entry) {
        const e = result.data.entry;
        console.log('');
        console.log(`═══ Sesión: ${e.sessionId} ═══`);
        console.log(`Acción    : ${e.action}`);
        console.log(`Estado    : ${e.status ?? (e.ok ? 'éxito' : 'error')}`);
        console.log(`Duración  : ${e.durationMs ? formatDuration(e.durationMs) : 'n/a'}`);
        console.log(`Inicio    : ${e.startedAt}`);
        if (e.endedAt) console.log(`Fin       : ${e.endedAt}`);

        const targetDevice = getTargetDevice(e);
        if (targetDevice) console.log(`Dispositivo: ${targetDevice}`);

        if (e.commandIds && e.commandIds.length > 0) {
          console.log(`Commands  : ${e.commandIds.join(', ')}`);
        }

        if (e.interactionSummary) {
          const summary = typeof e.interactionSummary === 'object'
            ? (e.interactionSummary as Record<string, unknown>).summary
            : e.interactionSummary;
          if (summary) console.log(`Interacción: ${summary}`);
        }

        if (e.verificationSummary) {
          console.log(`Verificación: ${e.verificationSummary}`);
        }

        if (e.completionReason) {
          console.log(`Finalización: ${e.completionReason}`);
        }

        const ctx = e.contextSummary as Record<string, unknown> | undefined;
        if (ctx) {
          console.log('Contexto  :');
          if (typeof ctx.bridgeReady === 'boolean') console.log(`  bridge: ${ctx.bridgeReady ? 'ready' : 'not ready'}`);
          if (typeof ctx.topologyMaterialized === 'boolean') console.log(`  topology: ${ctx.topologyMaterialized ? 'materialized' : 'warming'}`);
          if (typeof ctx.deviceCount === 'number') console.log(`  devices: ${ctx.deviceCount}`);
          if (typeof ctx.linkCount === 'number') console.log(`  links: ${ctx.linkCount}`);
        }

        if (e.warnings && e.warnings.length > 0) {
          console.log('Warnings  :');
          for (const w of e.warnings) console.log(`  - ${w}`);
        }

        if (e.status !== 'success') {
          const causes = inferFailureCauses(e);
          if (causes.length > 0) {
            console.log('Causas probables:');
            for (const c of causes) console.log(`  → ${c}`);
          }
        }

        if (e.errorMessage || (e as unknown as Record<string, unknown>).error_message) {
          const msg = e.errorMessage ?? (e as unknown as Record<string, unknown>).error_message;
          console.log(`\nError     : ${msg}`);
        }

        console.log('');
        console.log('Comandos relacionados:');
        console.log(`  pt logs session ${e.sessionId}  - Timeline completo`);
        if (e.commandIds && e.commandIds.length > 0) {
          console.log(`  pt logs command ${e.commandIds[0]}    - Trace del comando`);
        }
        console.log(`  pt results list         - Resultados`);
        console.log(`  pt doctor               - Diagnóstico`);
        console.log('');
      }

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
        console.log('Clasifica si una sesión puede re-ejecutarse de forma segura.');
        console.log('Solo comandos de lectura idempotentes son rerunnables.');
        return;
      }

      const flags: GlobalFlags = {
        json: false, jq: null, output: 'text', verbose: false, quiet: false,
        trace: false, tracePayload: false, traceResult: false, traceDir: null,
        traceBundle: false, traceBundlePath: null, sessionId: null,
        examples: globalExamples, schema: false, explain: globalExplain, plan: globalPlan, verify: false,
      };

      type RerunResult = { sessionId: string; rerunnable: boolean; reason: string; action?: string };
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

            const classification = classifyRerunnable(entry);

            return createSuccessResult('history.rerun', {
              sessionId,
              rerunnable: classification.rerunnable,
              reason: classification.reason,
              action: entry.action,
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

      if (result.ok && result.data) {
        const icon = result.data.rerunnable ? '✓' : '✗';
        console.log(`\n${icon} ${result.data.sessionId} (${result.data.action})`);
        console.log(`   Rerunnable: ${result.data.rerunnable ? 'Sí' : 'No'}`);
        console.log(`   Razón: ${result.data.reason}`);
        console.log('');
      }

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

      type ExplainResult = { sessionId: string; error?: string; duration?: number; causes?: string[] };
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
            const causes = inferFailureCauses(entry);

            return createSuccessResult('history.explain', {
              sessionId,
              error: errorMessage,
              duration,
              causes,
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

      if (result.ok && result.data) {
        console.log('');
        console.log(`═══ Explicación: ${result.data.sessionId} ═══`);
        if (result.data.error) {
          console.log(`Error: ${result.data.error}`);
        }
        if (result.data.duration) {
          console.log(`Duración: ${formatDuration(result.data.duration)}`);
        }
        if (result.data.causes && result.data.causes.length > 0) {
          console.log('');
          console.log('Causas probables:');
          for (const c of result.data.causes) {
            console.log(`  → ${c}`);
          }
        }
        console.log('');
      }

      if (!result.ok) process.exit(1);
    });

  return cmd;
}