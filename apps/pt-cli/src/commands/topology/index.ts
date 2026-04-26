import { Command } from 'commander';
import { createTopologyCleanCommand } from './clean.ts';
import { createTopologyShowCommand } from './show.ts';

/**
 * Comando principal 'topology' - Gestión de topologías de red
 */
export function createTopologyCommand(): Command {
  const command = new Command('topology')
    .description('Comandos para gestionar topologías de red');

  // Subcomandos
  command.addCommand(createTopologyCleanCommand());
  command.addCommand(createTopologyShowCommand());

  return command;
}
