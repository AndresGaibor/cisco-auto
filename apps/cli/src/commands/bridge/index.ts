import { Command } from 'commander';
import { createStartCommand } from './start.ts';
import { createStatusCommand } from './status.ts';
import { createInstallCommand } from './install.ts';
import { createUninstallCommand } from './uninstall.ts';
import { createBridgeCommand } from './command.ts';

export function createBridgeCommandGroup(): Command {
  const command = new Command('bridge')
    .description('Comandos para gestión del Bridge Server');

  command.addCommand(createStartCommand());
  command.addCommand(createStatusCommand());
  command.addCommand(createInstallCommand());
  command.addCommand(createUninstallCommand());
  command.addCommand(createBridgeCommand());

  return command;
}
