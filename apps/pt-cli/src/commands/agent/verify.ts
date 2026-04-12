#!/usr/bin/env bun
import { Command } from 'commander';
import { runAgentWorkflow, type AgentWorkflowOptions } from './context.js';

export function createAgentVerifyCommand(): Command {
  return new Command('verify')
    .description('Verificar el subgrafo seleccionado con la misma sesión de agente')
    .option('--snapshot <path>', 'Cargar el twin desde un snapshot JSON')
    .option('--goal <goal>', 'Objetivo a verificar')
    .option('-d, --device <device>', 'Dispositivo seleccionado')
    .option('-z, --zone <zone>', 'Zona seleccionada')
    .option('--json', 'Salida en JSON', false)
    .action(async function (options: AgentWorkflowOptions) {
      await runAgentWorkflow('verify', options);
    });
}
