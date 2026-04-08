import { Command } from 'commander';
import { createRouterAddCommand } from './add.js';

export function createRouterCommand(): Command {
  const command = new Command('router')
    .description('Comandos para gestionar routers Cisco');

  command.addCommand(createRouterAddCommand());

  return command;
}