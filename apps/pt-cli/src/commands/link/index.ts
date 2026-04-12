import { Command } from 'commander';
import { createLinkAddCommand } from './add.js';
import { createLinkRemoveCommand } from './remove.js';
import { createLinkListCommand } from './list.js';
import { createLinkSuggestCommand } from './suggest.js';
import { createLinkVerifyCommand } from './verify.js';

export function createLinkCommand(): Command {
  const command = new Command('link')
    .description('Comandos para gestionar conexiones entre dispositivos');

  command.addCommand(createLinkAddCommand());
  command.addCommand(createLinkRemoveCommand());
  command.addCommand(createLinkListCommand());
  command.addCommand(createLinkSuggestCommand());
  command.addCommand(createLinkVerifyCommand());

  return command;
}
