#!/usr/bin/env bun
/**
 * Comando planner - Change Planner con Rollback
 */

import { Command } from 'commander';
import chalk from 'chalk';

import type { CliResult } from '../contracts/cli-result.js';
import { createSuccessResult, createErrorResult } from '../contracts/cli-result.js';
import type { CommandMeta } from '../contracts/command-meta.js';
import type { GlobalFlags } from '../flags.js';

import { runCommand } from '../application/run-command.js';
import { createChangePlannerService } from '@cisco-auto/pt-control';

export const PLANNER_META: CommandMeta = {
  id: 'planner',
  summary: 'Planificador de operaciones con checkpoints y rollback',
  longDescription: 'Compila operaciones de alto nivel a planes ejecutables con verificación y rollback.',
  examples: [
    { command: 'pt planner compile router-on-a-stick R1 S1 --vlans 10 20', description: 'Compilar operación' },
    { command: 'pt planner list', description: 'Listar planes' },
    { command: 'pt planner execute <plan-id>', description: 'Ejecutar plan' },
  ],
  status: 'experimental',
  requiresPT: true,
};

export function createPlannerCommand(): Command {
  return new Command('planner')
    .description('Change Planner con checkpoints y rollback')
    .addCommand(
      new Command('compile')
        .description('Compilar operación a plan')
        .argument('<type>', 'Tipo de operación')
        .argument('<devices...>', 'Dispositivos')
        .option('--vlans <ids...>', 'VLANs')
        .option('--subnets <nets...>', 'Subredes')
        .option('--protocol <ospf|eigrp|bgp>', 'Protocolo de enrutamiento')
        .option('--pool <name>', 'Nombre de pool DHCP')
        .option('--network <subnet>', 'Subred')
        .action(async (type: string, devices: string[], options) => {
          await runCommand({
            action: 'planner',
            meta: PLANNER_META,
            flags: options,
            execute: async (ctx) => {
              const planner = createChangePlannerService();
              
              const intent: any = {
                type: type as any,
                devices,
                parameters: {
                  vlans: options.vlans?.split(' ').map(Number),
                  subnets: options.subnets,
                  protocol: options.protocol,
                  pool: options.pool,
                  network: options.network,
                },
              };
              
              const plan = planner.compileOperation(intent);
              
              console.log('\n═══ Plan Generado ═══\n');
              console.log(`  ID: ${plan.id}`);
              console.log(`  Tipo: ${plan.intent.type}`);
              console.log(`  Dispositivos: ${plan.intent.devices.join(', ')}`);
              console.log(`  Pasos: ${plan.steps.length}`);
              console.log(`  Checkpoints: ${plan.checkpoints.length}`);
              console.log(`  Prechecks: ${plan.prechecks.length}`);
              console.log(`  Duración estimada: ${plan.estimatedDuration}ms`);
              
              return createSuccessResult('planner-compile', {
                planId: plan.id,
                steps: plan.steps.length,
                checkpoints: plan.checkpoints.length,
              });
            }
          });
        })
    )
    .addCommand(
      new Command('list')
        .description('Listar todos los planes')
        .option('-t, --type <type>', 'Filtrar por tipo')
        .option('-j, --json', 'Salida JSON')
        .action(async (options) => {
          const planner = createChangePlannerService();
          const plans = options.type 
            ? planner.listPlansByType(options.type)
            : planner.listPlans();
          
          if (plans.length === 0) {
            console.log(chalk.yellow('  No hay planes registrados'));
            return;
          }
          
          console.log('\n═══ Planes Registrados ═══\n');
          for (const plan of plans) {
            console.log(`  ${chalk.cyan(plan.id)}`);
            console.log(`    Tipo: ${plan.intent.type}`);
            console.log(`    Dispositivos: ${plan.intent.devices.join(', ')}`);
            console.log(`    Pasos: ${plan.steps.length} | Checkpoints: ${plan.checkpoints.length}`);
            console.log('');
          }
        })
    )
    .addCommand(
      new Command('execute')
        .description('Ejecutar plan con checkpoints')
        .argument('<plan-id>', 'ID del plan')
        .option('-j, --json', 'Salida JSON')
        .action(async (planId: string, options) => {
          await runCommand({
            action: 'planner',
            meta: PLANNER_META,
            flags: options,
            execute: async (ctx) => {
              const planner = createChangePlannerService();
              const plan = planner.getPlan(planId);
              
              if (!plan) {
                return createErrorResult(`Plan ${planId} no encontrado`);
              }
              
              console.log(chalk.blue(`  Ejecutando plan ${planId}...`));
              const result = await planner.executeWithCheckpoint(plan);
              
              return createSuccessResult('planner-execute', {
                success: result.success,
                completedSteps: result.completedSteps,
                failedStep: result.failedStep,
                errors: result.errors,
                duration: result.executedAt,
              });
            }
          });
        })
    )
    .addCommand(
      new Command('show')
        .description('Mostrar detalles de un plan')
        .argument('<plan-id>', 'ID del plan')
        .option('-j, --json', 'Salida JSON')
        .action(async (planId: string, options) => {
          const planner = createChangePlannerService();
          const plan = planner.getPlan(planId);
          
          if (!plan) {
            console.log(chalk.red(`Plan ${planId} no encontrado`));
            return;
          }
          
          console.log(`\n═══ Plan ${planId} ═══\n`);
          console.log(`  Tipo: ${plan.intent.type}`);
          console.log(`  Dispositivos: ${plan.intent.devices.join(', ')}`);
          console.log(`\n  Prechecks (${plan.prechecks.length}):`);
          for (const pc of plan.prechecks) {
            console.log(`    - ${pc.type}: ${pc.check} (${pc.required ? 'required' : 'optional'})`);
          }
          console.log(`\n  Pasos (${plan.steps.length}):`);
          for (const step of plan.steps) {
            console.log(`    ${step.order}. ${step.device} [${step.surface}]`);
            console.log(`       ${step.commands.join(', ')}`);
          }
          console.log(`\n  Checkpoints (${plan.checkpoints.length}):`);
          for (const cp of plan.checkpoints) {
            console.log(`    Step ${cp.step}: ${cp.verify} (onFail: ${cp.onFail})`);
          }
          if (plan.rollback) {
            console.log(`\n  Rollback configurado: ${plan.rollback.actions.length} acciones`);
          }
        })
    )
    .addCommand(
      new Command('stats')
        .description('Ver estadísticas de planes')
        .action(async () => {
          const planner = createChangePlannerService();
          const stats = planner.getStats();
          
          console.log('\n═══ Estadísticas del Planner ═══\n');
          console.log(`  Total de planes: ${stats.totalPlans}`);
          console.log('\n  Por tipo:');
          for (const [type, count] of Object.entries(stats.byType)) {
            console.log(`    ${type}: ${count}`);
          }
        })
    );
}