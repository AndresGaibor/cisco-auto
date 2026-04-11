import { Command } from 'commander';
import { createTopologyVisualizeCommand } from './visualize.ts';
import { createTopologyAnalyzeCommand } from './analyze.ts';
import { createTopologyExportCommand } from './export.ts';
import { createTopologyCleanCommand } from './clean.ts';
import { createTopologyShowCommand } from './show.ts';

/**
 * Comando principal 'topology' - Gestión de topologías de red
 */
export function createTopologyCommand(): Command {
  const command = new Command('topology')
    .description('Comandos para gestionar topologías de red');

  // Subcomandos
  command.addCommand(createTopologyVisualizeCommand());
  command.addCommand(createTopologyAnalyzeCommand());
  command.addCommand(createTopologyExportCommand());
  command.addCommand(createTopologyCleanCommand());
  command.addCommand(createTopologyShowCommand());

  return command;
}
