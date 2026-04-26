#!/usr/bin/env bun
/**
 * Comando diagnose - Diagnosis Service para troubleshooting
 */

import { Command } from 'commander';
import chalk from 'chalk';

import type { CliResult } from '../contracts/cli-result.js';
import { createSuccessResult, createErrorResult } from '../contracts/cli-result.js';
import type { CommandMeta } from '../contracts/command-meta.js';
import type { GlobalFlags } from '../flags.js';

import { runCommand } from '../application/run-command.js';
import { createDiagnosisService } from '@cisco-auto/pt-control/pt/diagnosis';

export const DIAGNOSE_META: CommandMeta = {
  id: 'diagnose',
  summary: 'Diagnóstico causal de problemas en el lab',
  longDescription: 'Analiza síntomas y determina causas raíz con recomendaciones de remediación.',
  examples: [
    { command: 'pt diagnose ping-fails R1', description: 'Diagnosticar falla de ping' },
    { command: 'pt diagnose no-dhcp PC1', description: 'Diagnosticar problema DHCP' },
    { command: 'pt diagnose history', description: 'Ver historial de diagnósticos' },
  ],
  status: 'experimental',
  requiresPT: true,
  related: ['ping', 'omniscience'],
};

const SYMPTOM_TYPES = ['ping-fails', 'no-dhcp', 'no-access', 'slow-performance', 'packet-loss', 'acl-block'];

export function createDiagnoseCommand(): Command {
  return new Command('diagnose')
    .description('Diagnóstico causal de problemas')
    .addCommand(
      new Command('ping-fails')
        .description('Diagnosticar falla de conectividad')
        .argument('<device>', 'Dispositivo afectado')
        .option('-d, --deep', 'Diagnóstico profundo')
        .option('-j, --json', 'Salida JSON')
        .action(async (device: string, options) => {
          await runCommand({
            action: 'diagnose',
            meta: DIAGNOSE_META,
            flags: options,
            execute: async (ctx) => {
              const diagnose = createDiagnosisService();
              const result = await diagnose.diagnose([{
                type: 'ping-fails',
                devices: [device],
                details: options.deep ? 'Deep diagnosis requested' : undefined,
              }], { deep: options.deep });
              
              return createSuccessResult('diagnose', {
                id: result.id,
                symptoms: result.symptoms.map(s => s.type),
                rootCauses: result.rootCauses.map(r => ({
                  device: r.device,
                  category: r.category,
                  description: r.description,
                  confidence: r.confidence,
                })),
                recommendations: result.recommendations,
                probability: result.resolutionProbability,
                executionTime: result.executionTimeMs,
              });
            }
          });
        })
    )
    .addCommand(
      new Command('no-dhcp')
        .description('Diagnosticar problema DHCP')
        .argument('<device>', 'Dispositivo sin IP')
        .option('-d, --deep', 'Diagnóstico profundo')
        .option('-j, --json', 'Salida JSON')
        .action(async (device: string, options) => {
          await runCommand({
            action: 'diagnose',
            meta: DIAGNOSE_META,
            flags: options,
            execute: async (ctx) => {
              const diagnose = createDiagnosisService();
              const result = await diagnose.diagnose([{
                type: 'no-dhcp',
                devices: [device],
              }], { deep: options.deep });
              
              return createSuccessResult('diagnose', {
                id: result.id,
                rootCauses: result.rootCauses,
                recommendations: result.recommendations,
                probability: result.resolutionProbability,
              });
            }
          });
        })
    )
    .addCommand(
      new Command('no-access')
        .description('Diagnosticar problema de acceso a red')
        .argument('<device>', 'Dispositivo afectado')
        .option('-d, --deep', 'Diagnóstico profundo')
        .action(async (device: string, options) => {
          await runCommand({
            action: 'diagnose',
            meta: DIAGNOSE_META,
            flags: options,
            execute: async (ctx) => {
              const diagnose = createDiagnosisService();
              const result = await diagnose.diagnose([{
                type: 'no-access',
                devices: [device],
              }], { deep: options.deep });
              
              console.log('\n═══ Diagnóstico ═══\n');
              console.log(`  ID: ${result.id}`);
              console.log(`  Probabilidad de resolución: ${Math.round(result.resolutionProbability * 100)}%`);
              console.log(`  Tiempo: ${result.executionTimeMs}ms\n`);
              
              if (result.rootCauses.length > 0) {
                console.log('  Causas raíz:');
                for (const rc of result.rootCauses) {
                  const conf = Math.round(rc.confidence * 100);
                  console.log(`    - ${rc.category} en ${rc.device} (confianza: ${conf}%)`);
                  console.log(`      ${rc.description}`);
                }
                console.log('');
              }
              
              if (result.recommendations.length > 0) {
                console.log('  Recomendaciones:');
                for (const rec of result.recommendations) {
                  const riskColor = rec.risk === 'high' ? chalk.red : rec.risk === 'medium' ? chalk.yellow : chalk.green;
                  console.log(`    ${rec.priority}. ${rec.description}`);
                  console.log(`       Acción: ${rec.action}`);
                  console.log(`       Riesgo: ${riskColor(rec.risk)}`);
                }
              }
              
              return createSuccessResult('diagnose-complete', { id: result.id });
            }
          });
        })
    )
    .addCommand(
      new Command('packet-loss')
        .description('Diagnosticar pérdida de paquetes')
        .argument('<device>', 'Dispositivo afectado')
        .action(async (device: string) => {
          const diagnose = createDiagnosisService();
          const result = await diagnose.diagnose([{ type: 'packet-loss', devices: [device] }]);
          
          console.log('\n═══ Diagnóstico de Packet Loss ═══\n');
          for (const rc of result.rootCauses) {
            console.log(`  ${chalk.yellow('⚠')} ${rc.category}: ${rc.description}`);
          }
          for (const rec of result.recommendations) {
            console.log(`  ${chalk.cyan(rec.priority + '.')} ${rec.description}`);
          }
        })
    )
    .addCommand(
      new Command('acl-block')
        .description('Diagnosticar bloqueo por ACL')
        .argument('<device>', 'Dispositivo afectado')
        .action(async (device: string) => {
          const diagnose = createDiagnosisService();
          const result = await diagnose.diagnose([{ type: 'acl-block', devices: [device] }]);
          
          console.log('\n═══ Diagnóstico de ACL Block ═══\n');
          for (const rc of result.rootCauses) {
            console.log(`  ${chalk.red('🔴')} ${rc.category}: ${rc.description}`);
          }
        })
    )
    .addCommand(
      new Command('history')
        .description('Ver historial de diagnósticos')
        .option('-l, --limit <n>', 'Límite', '10')
        .action(async (options) => {
          const diagnose = createDiagnosisService();
          const history = diagnose.getHistory();
          const limit = parseInt(options.limit);
          
          console.log('\n═══ Historial de Diagnósticos ═══\n');
          for (const d of history.slice(0, limit)) {
            const prob = Math.round(d.resolutionProbability * 100);
            const probColor = prob >= 70 ? chalk.green : prob >= 40 ? chalk.yellow : chalk.red;
            console.log(`  ${chalk.cyan(d.id)}`);
            console.log(`    Síntomas: ${d.symptoms.map(s => s.type).join(', ')}`);
            console.log(`    Probabilidad: ${probColor(prob + '%')}`);
            console.log(`    Tiempo: ${d.executionTimeMs}ms | ${d.timestamp.toISOString()}`);
            console.log('');
          }
        })
    )
    .addCommand(
      new Command('stats')
        .description('Ver estadísticas de diagnósticos')
        .action(async () => {
          const diagnose = createDiagnosisService();
          const stats = diagnose.getStats();
          
          console.log('\n═══ Estadísticas de Diagnóstico ═══\n');
          console.log(`  Total diagnósticos: ${stats.total}`);
          console.log(`  Probabilidad promedio: ${Math.round(stats.avgResolutionProbability * 100)}%`);
          console.log(`  Tiempo promedio: ${stats.avgExecutionTimeMs}ms`);
          console.log('\n  Por categoría:');
          for (const [cat, count] of Object.entries(stats.byCategory)) {
            console.log(`    ${cat}: ${count}`);
          }
        })
    );
}