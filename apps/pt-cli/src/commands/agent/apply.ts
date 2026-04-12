#!/usr/bin/env bun
import { Command } from 'commander';
import { runAgentWorkflow, type AgentWorkflowOptions } from './context.js';

export function createAgentApplyCommand(): Command {
  return new Command('apply')
    .description('Preparar la aplicación de una tarea de agente')
    .option('--snapshot <path>', 'Cargar el twin desde un snapshot JSON')
    .option('--goal <goal>', 'Objetivo a aplicar')
    .option('-d, --device <device>', 'Dispositivo seleccionado')
    .option('-z, --zone <zone>', 'Zona seleccionada')
    .option('--json', 'Salida en JSON', false)
    .action(async function (options: AgentWorkflowOptions) {
      await runAgentWorkflow('apply', options);
    });
}
