import { Command } from 'commander';
import { createLinkAddCommand } from './add.ts';
import { createLinkRemoveCommand } from './remove.ts';
import { createLinkListCommand } from './list.ts';

export function createLinkCommand(): Command {
  const command = new Command('link')
    .description('Comandos para gestionar conexiones entre dispositivos');

  command.addCommand(createLinkAddCommand());
  command.addCommand(createLinkRemoveCommand());
  command.addCommand(createLinkListCommand());

  return command;
}
