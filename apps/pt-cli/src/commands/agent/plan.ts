#!/usr/bin/env bun
import { Command } from 'commander';
import { runAgentWorkflow, type AgentWorkflowOptions } from './context.js';

export function createAgentPlanCommand(): Command {
  return new Command('plan')
    .description('Generar un plan explícito para la tarea actual')
    .option('--snapshot <path>', 'Cargar el twin desde un snapshot JSON')
    .option('--goal <goal>', 'Objetivo a planificar')
    .option('-d, --device <device>', 'Dispositivo seleccionado')
    .option('-z, --zone <zone>', 'Zona seleccionada')
    .option('--json', 'Salida en JSON', false)
    .action(async function (options: AgentWorkflowOptions) {
      await runAgentWorkflow('plan', options);
    });
}
