#!/usr/bin/env bun
/**
 * Comando results - Gestionar resultados de comandos en ~/pt-dev/
 * Migrado al patrón runCommand con CliResult
 */

import { Command } from 'commander';
import { resolve } from 'path';
import { homedir } from 'os';
import chalk from 'chalk';
import { existsSync, readdirSync, statSync, readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';

import type { CliResult } from '../contracts/cli-result.js';
import { createSuccessResult, createErrorResult } from '../contracts/cli-result.js';
import type { CommandMeta } from '../contracts/command-meta.js';
import type { GlobalFlags } from '../flags.js';

import { runCommand } from '../application/run-command.js';
import { renderCliResult } from '../ux/renderers.js';
import { printExamples } from '../ux/examples.js';

const RESULTS_EXAMPLES = [
  { command: 'pt results list', description: 'Listar archivos de resultados' },
  { command: 'pt results list -n 50 --json', description: 'Listar últimos 50 en JSON' },
  { command: 'pt results clean --keep 20', description: 'Mantener solo últimos 20' },
  { command: 'pt results view cmd_abc123.json', description: 'Ver contenido de resultado' },
];

const RESULTS_META: CommandMeta = {
  id: 'results',
  summary: 'Gestionar resultados de comandos',
  longDescription: 'Lista, limpia y visualiza archivos de resultado de comandos guardados en ~/pt-dev/results.',
  examples: RESULTS_EXAMPLES,
  related: ['history', 'logs', 'doctor'],
  supportsVerify: false,
  supportsJson: true,
  supportsPlan: false,
  supportsExplain: false,
};

interface ResultFileInfo {
  name: string;
  mtime: Date;
  size: number;
}

interface ResultsListResult {
  files: ResultFileInfo[];
  total: number;
}

interface ResultsViewResult {
  content: unknown;
  file: string;
}

interface ResultsCleanResult {
  deleted: number;
  kept: number;
}

function getDefaultDevDir(): string {
  if (process.env.PT_DEV_DIR) {
    return process.env.PT_DEV_DIR;
  }
  const home = homedir();
  if (process.platform === 'win32') {
    return resolve(process.env.USERPROFILE || home, 'pt-dev');
  }
  return resolve(home, 'pt-dev');
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  return `${(bytes / 1024).toFixed(1)}KB`;
}

export function createResultsCommand(): Command {
  const cmd = new Command('results')
    .description('Gestionar resultados de comandos en ~/pt-dev/');

  cmd
    .command('list')
    .description('Listar archivos de resultados')
    .option('-n, --num <number>', 'Número de resultados a mostrar', '20')
    .option('-j, --json', 'Salida en formato JSON')
    .option('--examples', 'Mostrar ejemplos', false)
    .option('--explain', 'Explicar', false)
    .option('--plan', 'Mostrar plan', false)
    .action(async (options) => {
      const globalExamples = process.argv.includes('--examples');
      const globalExplain = process.argv.includes('--explain');
      const globalPlan = process.argv.includes('--plan');

      if (globalExamples) {
        console.log(printExamples(RESULTS_META));
        return;
      }

      if (globalExplain) {
        console.log(RESULTS_META.longDescription ?? RESULTS_META.summary);
        return;
      }

      if (globalPlan) {
        console.log('Plan de ejecución:');
        console.log('  1. Leer directorio ~/pt-dev/results');
        console.log('  2. Filtrar archivos cmd_*.json');
        console.log('  3. Ordenar por fecha');
        console.log('  4. Mostrar lista');
        return;
      }

      const flags: GlobalFlags = {
        json: false, jq: null, output: 'text', verbose: false, quiet: false,
        trace: false, tracePayload: false, traceResult: false, traceDir: null,
        traceBundle: false, traceBundlePath: null, sessionId: null,
        examples: globalExamples, schema: false, explain: globalExplain, plan: globalPlan, verify: false,
      };

      const result = await runCommand<ResultsListResult>({
        action: 'results.list',
        meta: RESULTS_META,
        flags,
        payloadPreview: { num: options.num, json: options.json },
        execute: async (): Promise<CliResult<ResultsListResult>> => {
          try {
            const devDir = getDefaultDevDir();
            const resultsDir = resolve(devDir, 'results');
            
            let files: string[] = [];
            try {
              files = readdirSync(resultsDir);
            } catch {
              return createErrorResult('results.list', {
                message: `Directorio de resultados no encontrado: ${resultsDir}`,
              }) as CliResult<ResultsListResult>;
            }

            const fileInfos: ResultFileInfo[] = [];
            for (const f of files) {
              if (!f.startsWith('cmd_') || !f.endsWith('.json')) continue;
              const filePath = resolve(resultsDir, f);
              try {
                const stats = statSync(filePath);
                fileInfos.push({ name: f, mtime: stats.mtime, size: stats.size });
              } catch {
                // Skip files we can't statSync
              }
            }

            fileInfos.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

            const limit = parseInt(options.num) || 20;
            const limited = fileInfos.slice(0, limit);

            return createSuccessResult('results.list', {
              files: limited,
              total: fileInfos.length,
            });
          } catch (error) {
            return createErrorResult('results.list', {
              message: error instanceof Error ? error.message : String(error),
            }) as CliResult<ResultsListResult>;
          }
        },
      });

      const output = renderCliResult(result, flags.output);
      if (!flags.quiet || !result.ok) console.log(output);

      if (result.ok && result.data && !options.json) {
        const devDir = getDefaultDevDir();
        const resultsDir = resolve(devDir, 'results');
        console.log(`\n📁 Resultados en ${resultsDir} (${result.data.total} total):\n`);
        result.data.files.forEach((f, i) => {
          const date = f.mtime.toISOString().slice(0, 19).replace('T', ' ');
          console.log(`${i + 1}. ${chalk.cyan(f.name)} ${chalk.gray(date)} ${chalk.yellow(formatSize(f.size))}`);
        });
        console.log('');
      }

      if (!result.ok) process.exit(1);
    });

  cmd
    .command('clean')
    .description('Limpiar archivos de resultados antiguos')
    .option('-k, --keep <number>', 'Cantidad de resultados a mantener', '50')
    .option('-d, --days <number>', 'Mantener solo resultados de los últimos N días')
    .option('-f, --force', 'No pedir confirmación')
    .option('--examples', 'Mostrar ejemplos', false)
    .option('--explain', 'Explicar', false)
    .option('--plan', 'Mostrar plan', false)
    .action(async (options) => {
      const globalExamples = process.argv.includes('--examples');
      const globalExplain = process.argv.includes('--explain');
      const globalPlan = process.argv.includes('--plan');

      if (globalExamples) {
        console.log(printExamples(RESULTS_META));
        return;
      }

      if (globalPlan) {
        console.log('Plan de ejecución:');
        console.log(`  1. Mantener últimos ${options.keep} archivos (o últimos ${options.days} días)`);
        console.log('  2. Solicitar confirmación si no es --force');
        console.log('  3. Eliminar archivos antiguos');
        return;
      }

      const flags: GlobalFlags = {
        json: false, jq: null, output: 'text', verbose: false, quiet: false,
        trace: false, tracePayload: false, traceResult: false, traceDir: null,
        traceBundle: false, traceBundlePath: null, sessionId: null,
        examples: globalExamples, schema: false, explain: globalExplain, plan: globalPlan, verify: false,
      };

      type CleanResult = { deleted: number; kept: number };
      const result = await runCommand<CleanResult>({
        action: 'results.clean',
        meta: RESULTS_META,
        flags,
        payloadPreview: { keep: options.keep, days: options.days, force: options.force },
        execute: async (): Promise<CliResult<CleanResult>> => {
          try {
            const devDir = getDefaultDevDir();
            const resultsDir = resolve(devDir, 'results');
            
            let files: string[] = [];
            try {
              files = readdirSync(resultsDir);
            } catch {
              return createErrorResult('results.clean', {
                message: `Directorio de resultados no encontrado: ${resultsDir}`,
              }) as CliResult<CleanResult>;
            }

            const fileInfos: { name: string; path: string; mtime: Date }[] = [];
            for (const f of files) {
              if (!f.startsWith('cmd_') || !f.endsWith('.json')) continue;
              const filePath = resolve(resultsDir, f);
              try {
                const stats = statSync(filePath);
                fileInfos.push({ name: f, path: filePath, mtime: stats.mtime });
              } catch {
                // Skip
              }
            }

            fileInfos.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

            let toDelete: string[] = [];
            
            if (options.days) {
              const cutoff = Date.now() - (parseInt(options.days) * 24 * 60 * 60 * 1000);
              toDelete = fileInfos.filter(f => f.mtime.getTime() < cutoff).map(f => f.path);
            } else {
              const keep = parseInt(options.keep) || 50;
              toDelete = fileInfos.slice(keep).map(f => f.path);
            }

            if (toDelete.length === 0) {
              return createSuccessResult('results.clean', {
                deleted: 0,
                kept: fileInfos.length,
              }, { advice: ['No hay archivos para eliminar'] });
            }

            if (!options.force) {
              console.log(`\n🗑️  Se eliminarán ${toDelete.length} archivos:`);
              toDelete.slice(0, 5).forEach(p => console.log(`   - ${require('path').basename(p)}`));
              if (toDelete.length > 5) {
                console.log(`   ... y ${toDelete.length - 5} más`);
              }
              console.log('');
              
              const readline = await import('readline');
              const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
              const answer = await new Promise<string>((resolve) => {
                rl.question('¿Continuar? (s/n): ', (ans) => {
                  rl.close();
                  resolve(ans.toLowerCase());
                });
              });
              
              if (answer !== 's' && answer !== 'si' && answer !== 'y') {
                return createErrorResult('results.clean', {
                  message: 'Operación cancelada por el usuario',
                }) as CliResult<CleanResult>;
              }
            }

            let deleted = 0;
            const { unlink } = await import('node:fs/promises');
            for (const path of toDelete) {
              try {
                await unlink(path);
                deleted++;
              } catch {
                // Skip files we can't delete
              }
            }

            return createSuccessResult('results.clean', {
              deleted,
              kept: fileInfos.length - deleted,
            });
          } catch (error) {
            return createErrorResult('results.clean', {
              message: error instanceof Error ? error.message : String(error),
            }) as CliResult<CleanResult>;
          }
        },
      });

      const output = renderCliResult(result, flags.output);
      if (!flags.quiet || !result.ok) console.log(output);

      if (!result.ok) process.exit(1);
    });

  cmd
    .command('view <file>')
    .description('Ver contenido de un archivo de resultado')
    .option('-j, --json', 'Mostrar como JSON formateado')
    .option('--examples', 'Mostrar ejemplos', false)
    .option('--explain', 'Explicar', false)
    .option('--plan', 'Mostrar plan', false)
    .action(async (file: string, options) => {
      const globalExamples = process.argv.includes('--examples');
      const globalPlan = process.argv.includes('--plan');

      if (globalExamples) {
        console.log(printExamples(RESULTS_META));
        return;
      }

      if (globalPlan) {
        console.log('Plan de ejecución:');
        console.log(`  1. Leer archivo: ${file}`);
        console.log('  2. Mostrar contenido');
        return;
      }

      const flags: GlobalFlags = {
        json: false, jq: null, output: 'text', verbose: false, quiet: false,
        trace: false, tracePayload: false, traceResult: false, traceDir: null,
        traceBundle: false, traceBundlePath: null, sessionId: null,
        examples: globalExamples, schema: false, explain: false, plan: globalPlan, verify: false,
      };

      const result = await runCommand<ResultsViewResult>({
        action: 'results.view',
        meta: RESULTS_META,
        flags,
        payloadPreview: { file },
        execute: async (): Promise<CliResult<ResultsViewResult>> => {
          try {
            const devDir = getDefaultDevDir();
            const filePath = resolve(devDir, 'results', file);
            
            if (!existsSync(filePath)) {
              return createErrorResult('results.view', {
                message: `Archivo no encontrado: ${file}`,
              }) as CliResult<ResultsViewResult>;
            }

            const content = await readFile(filePath, 'utf-8');
            let parsed: unknown;
            try {
              parsed = JSON.parse(content);
            } catch {
              parsed = content;
            }

            return createSuccessResult('results.view', {
              content: parsed,
              file,
            });
          } catch (error) {
            return createErrorResult('results.view', {
              message: error instanceof Error ? error.message : String(error),
            }) as CliResult<ResultsViewResult>;
          }
        },
      });

      const output = renderCliResult(result, flags.output);
      if (!flags.quiet || !result.ok) console.log(output);

      if (!result.ok) process.exit(1);
    });

  cmd
    .command('show <commandId>')
    .description('Ver envelope autoritativo de un resultado')
    .option('--json', 'Salida JSON', false)
    .action(async (commandId: string, options) => {
      const devDir = getDefaultDevDir();
      const resultsDir = resolve(devDir, 'results');
      const resultPath = resolve(resultsDir, `cmd_${commandId.replace('cmd_', '')}.json`);
      const directPath = resolve(resultsDir, `${commandId}.json`);
      const filePath = existsSync(directPath) ? directPath : resultPath;

      if (!existsSync(filePath)) {
        console.log(`Resultado no encontrado para: ${commandId}`);
        return;
      }

      const content = readFileSync(filePath, 'utf-8');
      const envelope = JSON.parse(content);

      if (options.json) {
        console.log(JSON.stringify(envelope, null, 2));
        return;
      }

      console.log('');
      console.log(`═══ Resultado: ${commandId} ═══`);
      console.log(`Status    : ${envelope.status ?? 'unknown'}`);
      console.log(`OK        : ${envelope.ok}`);
      if (envelope.startedAt) console.log(`Inicio    : ${new Date(envelope.startedAt).toISOString()}`);
      if (envelope.completedAt) console.log(`Fin       : ${new Date(envelope.completedAt).toISOString()}`);
      if (envelope.startedAt && envelope.completedAt) {
        const dur = envelope.completedAt - envelope.startedAt;
        console.log(`Duración  : ${dur}ms`);
      }
      if (envelope.protocolVersion) console.log(`Protocolo: v${envelope.protocolVersion}`);

      if (envelope.value) {
        const v = envelope.value;
        if (v.error) console.log(`Error     : ${v.error}`);
        if (v.code) console.log(`Código    : ${v.code}`);
        if (v.device) console.log(`Dispositivo: ${v.device}`);
        if (v.source) console.log(`Fuente    : ${v.source}`);
        if (v.session) {
          const s = v.session;
          if (s.mode) console.log(`Modo IOS  : ${s.mode}`);
          if (s.prompt) console.log(`Prompt    : ${s.prompt}`);
        }
      }

      const commandsTraceDir = join(devDir, 'logs', 'commands');
      const tracePath = join(commandsTraceDir, `${commandId.replace('cmd_', '')}.json`);
      const directTracePath = join(commandsTraceDir, `${commandId}.json`);
      const traceFilePath = existsSync(directTracePath) ? directTracePath : tracePath;
      if (existsSync(traceFilePath)) {
        const trace = JSON.parse(readFileSync(traceFilePath, 'utf-8'));
        console.log('\nPT-Side Trace:');
        for (const [key, value] of Object.entries(trace)) {
          console.log(`  ${key}: ${JSON.stringify(value)}`);
        }
      }
      console.log('');
    });

  cmd
    .command('failed')
    .description('Listar resultados fallidos')
    .option('-n, --limit <num>', 'Máximo a mostrar', '20')
    .action(async (options) => {
      const devDir = getDefaultDevDir();
      const resultsDir = resolve(devDir, 'results');
      const limit = parseInt(options.limit) || 20;

      if (!existsSync(resultsDir)) {
        console.log('Directorio de resultados no encontrado.');
        return;
      }

      const files = readdirSync(resultsDir)
        .filter(f => f.startsWith('cmd_') && f.endsWith('.json'))
        .sort()
        .reverse()
        .slice(0, limit * 3);

      const failed: { name: string; status: string; error?: string; completedAt?: number }[] = [];

      for (const f of files) {
        if (failed.length >= limit) break;
        try {
          const content = readFileSync(resolve(resultsDir, f), 'utf-8');
          const envelope = JSON.parse(content);
          if (!envelope.ok || envelope.status === 'failed') {
            failed.push({
              name: f,
              status: envelope.status,
              error: envelope.value?.error,
              completedAt: envelope.completedAt,
            });
          }
        } catch { /* skip */ }
      }

      console.log('');
      console.log(`═══ Resultados fallidos (${failed.length}) ═══`);
      console.log('');
      for (const f of failed) {
        const date = f.completedAt ? new Date(f.completedAt).toISOString().slice(0, 19) : 'unknown';
        console.log(`  ✗ ${f.name}  [${date}]`);
        if (f.error) console.log(`    → ${f.error.slice(0, 100)}`);
      }
      console.log('');
    });

  cmd
    .command('pending')
    .description('Ver estado de cola y comandos en proceso')
    .action(async () => {
      const devDir = getDefaultDevDir();
      const commandsDir = resolve(devDir, 'commands');
      const inFlightDir = resolve(devDir, 'in-flight');
      const deadLetterDir = resolve(devDir, 'dead-letter');
      const pendingFile = resolve(devDir, 'journal', 'pending-commands.json');

      const countDir = (dir: string) => {
        if (!existsSync(dir)) return 0;
        return readdirSync(dir).filter(f => f.endsWith('.json')).length;
      };

      const queueCount = countDir(commandsDir);
      const inFlightCount = countDir(inFlightDir);
      const deadCount = countDir(deadLetterDir);

      let pendingDeferred = 0;
      if (existsSync(pendingFile)) {
        try {
          const pending = JSON.parse(readFileSync(pendingFile, 'utf-8'));
          pendingDeferred = Object.keys(pending).length;
        } catch { /* skip */ }
      }

      console.log('');
      console.log('═══ Estado de cola ═══');
      console.log('');
      console.log(`  En cola (commands/)     : ${queueCount}`);
      console.log(`  En vuelo (in-flight/)   : ${inFlightCount}`);
      console.log(`  Deferred (journal)      : ${pendingDeferred}`);
      console.log(`  Dead-letter             : ${deadCount}`);

      if (deadCount > 0) {
        console.log('');
        console.log('  ⚠️  Hay comandos en dead-letter. Revisa con:');
        console.log(`     ls ${deadLetterDir}`);
      }
      if (inFlightCount > 5) {
        console.log('');
        console.log('  ⚠️  Alta cantidad en in-flight. PT podría estar atascado.');
      }
      console.log('');
    });

  return cmd;
}