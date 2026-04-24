#!/usr/bin/env bun
/**
 * Comando lint - Validación de topología y detección de drift
 */

import { Command } from 'commander';
import chalk from 'chalk';

import type { CliResult } from '../contracts/cli-result.js';
import { createSuccessResult, createErrorResult } from '../contracts/cli-result.js';
import type { CommandMeta } from '../contracts/command-meta.js';
import type { GlobalFlags } from '../flags.js';

import { runCommand } from '../application/run-command.js';
import { createTopologyLintService } from '@cisco-auto/pt-control';

export const LINT_META: CommandMeta = {
  id: 'lint',
  summary: 'Validar topología y detectar drift',
  longDescription: 'Comandos para validar la topología del lab contra el blueprint y detectar drift.',
  examples: [
    { command: 'pt lint topology', description: 'Validar topología completa' },
    { command: 'pt lint drift', description: 'Mostrar drift detectado' },
    { command: 'pt lint blueprint', description: 'Ver blueprint actual' },
  ],
  status: 'experimental',
  requiresPT: true,
  related: ['validate', 'topology'],
};

export function createLintCommand(): Command {
  return new Command('lint')
    .description('Validación de topología y detección de drift')
    .addCommand(
      new Command('topology')
        .description('Validar topología completa')
        .option('-j, --json', 'Salida JSON')
        .option('-v, --verbose', 'Salida detallada')
        .action(async (options) => {
          await runCommand({
            action: 'lint',
            meta: LINT_META,
            flags: options,
            execute: async (ctx) => {
              const lintService = createTopologyLintService();
              const results = await lintService.lint();
              
              return createSuccessResult('lint', {
                totalRules: results.length,
                passed: results.filter(r => r.severity !== 'critical').length,
                failed: results.filter(r => r.severity === 'critical').length,
                results: results.map(r => ({
                  rule: r.rule,
                  severity: r.severity,
                  message: r.message,
                  device: r.device,
                })),
              });
            }
          });
        })
    )
    .addCommand(
      new Command('drift')
        .description('Mostrar drift detectado')
        .option('-s, --severity <level>', 'Filtrar por severidad', 'all')
        .option('-j, --json', 'Salida JSON')
        .action(async (options) => {
          await runCommand({
            action: 'lint',
            meta: LINT_META,
            flags: options,
            execute: async (ctx) => {
              const lintService = createTopologyLintService();
              const drift = await lintService.queryDrift({ 
                severity: options.severity as any 
              });
              
              return createSuccessResult('lint-drift', {
                totalDrift: drift.length,
                drift: drift.map(d => ({
                  category: d.category,
                  severity: d.severity,
                  description: d.description,
                  device: d.device,
                  expected: d.expected,
                  observed: d.observed,
                })),
              });
            }
          });
        })
    )
    .addCommand(
      new Command('blueprint')
        .description('Ver blueprint actual')
        .option('-j, --json', 'Salida JSON')
        .action(async (options) => {
          await runCommand({
            action: 'lint',
            meta: LINT_META,
            flags: options,
            execute: async (ctx) => {
              const lintService = createTopologyLintService();
              const blueprint = lintService.getBlueprint();
              
              return createSuccessResult('lint-blueprint', {
                operations: blueprint.operations.length,
                blueprint,
              });
            }
          });
        })
    )
    .addCommand(
      new Command('rules')
        .description('Listar reglas de lint disponibles')
        .action(async () => {
          const lintService = createTopologyLintService();
          const rules = lintService.listRules();
          
          console.log('\n═══ Reglas de Lint ═══\n');
          for (const rule of rules) {
            console.log(`  ${chalk.cyan(rule.id)} - ${rule.description}`);
            console.log(`     Severidad: ${rule.severity}`);
            console.log('');
          }
        })
    );
}