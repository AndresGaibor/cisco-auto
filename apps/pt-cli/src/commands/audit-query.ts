#!/usr/bin/env bun
/**
 * Comando audit query - Consulta la tabla audit_log de SQLite.
 * Permite filtrar ejecuciones persistidas por sesión, dispositivo, estado y límite.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { Database } from 'bun:sqlite';

import type { CliResult } from '../contracts/cli-result.js';
import { createSuccessResult, createErrorResult } from '../contracts/cli-result.js';
import type { CommandMeta } from '../contracts/command-meta.js';
import type { GlobalFlags } from '../flags.js';

import { runCommand } from '../application/run-command.js';
import { renderCliResult } from '../ux/renderers.js';
import { printExamples } from '../ux/examples.js';
import { getMemoryDbPath } from '../system/paths.js';

function initializeSchema(db: Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      session_id TEXT NOT NULL,
      device_id TEXT,
      command TEXT NOT NULL,
      status TEXT NOT NULL,
      output TEXT,
      error TEXT,
      duration_ms INTEGER,
      transaction_id TEXT,
      FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE SET NULL
    );
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_audit_log_session_id ON audit_log(session_id);
    CREATE INDEX IF NOT EXISTS idx_audit_log_device_id ON audit_log(device_id);
    CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp);
    CREATE INDEX IF NOT EXISTS idx_audit_log_status ON audit_log(status);
    CREATE INDEX IF NOT EXISTS idx_audit_log_transaction_id ON audit_log(transaction_id);
  `);
}

interface AuditQueryRow {
  id: number;
  timestamp: string;
  session_id: string;
  device_id?: string | null;
  command: string;
  status: string;
  output?: string | null;
  error?: string | null;
  duration_ms?: number | null;
  transaction_id?: string | null;
}

interface AuditQueryResult {
  entries: AuditQueryRow[];
  count: number;
}

const AUDIT_QUERY_EXAMPLES = [
  { command: 'pt audit query', description: 'Consultar últimas ejecuciones auditadas' },
  { command: 'pt audit query --session sess-1', description: 'Filtrar por sesión' },
  { command: 'pt audit query --device R1 --status failed', description: 'Filtrar por dispositivo y estado' },
  { command: 'pt audit query --limit 10 --json', description: 'Limitar resultados y mostrar JSON' },
];

const AUDIT_QUERY_META: CommandMeta = {
  id: 'audit.query',
  summary: 'Consultar auditoría persistida',
  longDescription: 'Consulta la tabla audit_log de SQLite para inspeccionar ejecuciones persistidas de la CLI.',
  examples: AUDIT_QUERY_EXAMPLES,
  related: ['history', 'logs', 'audit-tail', 'audit-export'],
  supportsVerify: false,
  supportsJson: true,
  supportsPlan: false,
  supportsExplain: false,
};

function getMemoryDb(): Database {
  const db = new Database(getMemoryDbPath());
  initializeSchema(db);
  return db;
}

function formatTimestamp(value: string): string {
  return new Date(value).toLocaleString();
}

export function createAuditQueryCommand(): Command {
  const cmd = new Command('query');

  cmd
    .description('Consultar la tabla audit_log')
    .option('-l, --limit <num>', 'Número máximo de entradas', '20')
    .option('--session <id>', 'Filtrar por sesión')
    .option('--device <device>', 'Filtrar por dispositivo')
    .option('--status <status>', 'Filtrar por estado: success, failed, rolled_back')
    .option('--json', 'Salida en JSON', false)
    .option('--examples', 'Mostrar ejemplos', false)
    .option('--explain', 'Explicar', false)
    .option('--plan', 'Mostrar plan', false)
    .action(async (options) => {
      const globalExamples = process.argv.includes('--examples');
      const globalExplain = process.argv.includes('--explain');
      const globalPlan = process.argv.includes('--plan');

      if (globalExamples) {
        console.log(printExamples(AUDIT_QUERY_META));
        return;
      }

      if (globalExplain) {
        console.log(AUDIT_QUERY_META.longDescription ?? AUDIT_QUERY_META.summary);
        return;
      }

      if (globalPlan) {
        console.log('Plan de ejecución:');
        console.log('  1. Abrir la base SQLite de memoria');
        console.log('  2. Filtrar audit_log por sesión/dispositivo/estado');
        console.log('  3. Ordenar por timestamp descendente');
        console.log('  4. Mostrar resultados');
        return;
      }

      const flags: GlobalFlags = {
        json: false, jq: null, output: 'text', verbose: false, quiet: false,
        trace: false, tracePayload: false, traceResult: false, traceDir: null,
        traceBundle: false, traceBundlePath: null, sessionId: null,
        examples: globalExamples, schema: false, explain: globalExplain, plan: globalPlan, verify: false,
      };

      const result = await runCommand<AuditQueryResult>({
        action: 'audit.query',
        meta: AUDIT_QUERY_META,
        flags,
        payloadPreview: {
          limit: options.limit,
          session: options.session,
          device: options.device,
          status: options.status,
        },
        execute: async (): Promise<CliResult<AuditQueryResult>> => {
          try {
            const db = getMemoryDb();
            let query = 'SELECT * FROM audit_log WHERE 1=1';
            const params: unknown[] = [];

            if (options.session) {
              query += ' AND session_id = ?';
              params.push(options.session);
            }

            if (options.device) {
              query += ' AND device_id = ?';
              params.push(options.device);
            }

            if (options.status) {
              query += ' AND status = ?';
              params.push(options.status);
            }

            query += ' ORDER BY timestamp DESC, id DESC LIMIT ?';
            params.push(parseInt(options.limit, 10) || 20);

            const entries = db.query(query).all(...(params as any[])) as AuditQueryRow[];
            db.close();

            return createSuccessResult('audit.query', {
              entries,
              count: entries.length,
            }, {
              advice: ['Usa pt audit tail para una vista rápida o pt history show para contexto de sesión'],
            });
          } catch (error) {
            return createErrorResult('audit.query', {
              message: error instanceof Error ? error.message : String(error),
            }) as CliResult<AuditQueryResult>;
          }
        },
      });

      const output = renderCliResult(result, flags.output);
      if (!flags.quiet || !result.ok) console.log(output);

      if (result.ok && result.data && !options.json) {
        console.log(`\n📄 Audit query (${result.data.count} entradas)\n`);
        console.log('  Fecha                   Sesión      Dispositivo   Estado   Comando');
        console.log('  ' + '-'.repeat(78));
        for (const entry of result.data.entries) {
          const date = formatTimestamp(entry.timestamp).padEnd(22);
          const sessionId = (entry.session_id ?? '').slice(0, 10).padEnd(10);
          const device = (entry.device_id ?? '-').padEnd(12);
          const status = entry.status === 'success'
            ? chalk.green(entry.status.padEnd(7))
            : entry.status === 'rolled_back'
              ? chalk.yellow(entry.status.padEnd(7))
              : chalk.red(entry.status.padEnd(7));
          const command = entry.command;
          console.log(`  ${date} ${sessionId} ${device} ${status} ${command}`);
        }
        console.log('');
      }

      if (!result.ok) process.exit(1);
    });

  return cmd;
}
