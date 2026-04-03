import { Command } from 'commander';
import { createDeviceListCommand } from './list.ts';
import { createDeviceGetCommand } from './get.ts';
import { createDeviceInteractiveCommand } from './interactive.ts';
import { createDeviceAddCommand } from './add.ts';
import { createDeviceRemoveCommand } from './remove.ts';

export function createDeviceCommand(): Command {
  const command = new Command('device')
    .description('Comandos para gestionar dispositivos');

  command.addCommand(createDeviceListCommand());
  command.addCommand(createDeviceGetCommand());
  command.addCommand(createDeviceInteractiveCommand());
  command.addCommand(createDeviceAddCommand());
  command.addCommand(createDeviceRemoveCommand());

  return command;
}
