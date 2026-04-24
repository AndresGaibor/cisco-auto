#!/usr/bin/env bun
import { Command } from 'commander';
import chalk from 'chalk';
import { writeFileSync } from 'node:fs';
import { listAuditEntries } from './audit-data.js';

export function createAuditExportCommand(): Command {
  return new Command('export')
    .description('Exportar auditoria a archivo')
    .option('--format <format>', 'Formato: json, csv, markdown', 'json')
    .option('--output <path>', 'Archivo de salida', 'audit-export.json')
    .option('--device <device>', 'Filtrar por dispositivo')
    .option('--since <date>', 'Filtrar desde fecha (YYYY-MM-DD)')
    .action((options) => {
      const since = options.since ? new Date(options.since).toISOString() : undefined;
      const entries = listAuditEntries({
        device: options.device,
        since,
      });

      let content: string;
      switch (options.format) {
        case 'csv': {
          const headers = 'timestamp,device,command,status,output\n';
          const rows = entries.map((e: any) =>
            `${e.timestamp},${e.hostname || e.device_id},"${(e.command as string).replace(/"/g, '""')}",${e.status},"${((e.output as string) || '').replace(/"/g, '""')}"`
          ).join('\n');
          content = headers + rows;
          break;
        }
        case 'markdown': {
          content = `# Audit Export\n\n| Fecha | Dispositivo | Comando | Estado |\n|-------|------------|---------|--------|\n`;
          for (const e of entries) {
            const date = new Date((e.timestamp as string)).toISOString();
            content += `| ${date} | ${e.hostname || e.device_id} | ${e.command} | ${e.status} |\n`;
          }
          break;
        }
        case 'json':
        default:
          content = JSON.stringify(entries, null, 2);
          break;
      }

      writeFileSync(options.output, content, 'utf-8');
      console.log(chalk.green(`\n✓ Auditoria exportada a ${chalk.cyan(options.output)} (${entries.length} entradas, ${options.format})\n`));
    });
}
