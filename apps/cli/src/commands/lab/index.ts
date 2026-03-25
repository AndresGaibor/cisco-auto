import { Command } from 'commander';
import { createLabParseCommand } from './parse.ts';
import { createLabValidateCommand } from './validate.ts';
import { createLabCreateCommand } from './create.ts';
import { createLabListCommand } from './list.ts';
import { createLabInteractiveCommand } from './interactive.ts';
import { createLabPipelineCommand } from './pipeline.ts';
import { createLabFullBuildCommand } from './full-build.ts';
import { createRoutingCommand } from '../routing.ts';
import { createACLCommand } from '../acl.ts';
import { createLabVlanCommand } from '../vlan.ts';

export function createLabCommand(): Command {
  const command = new Command('lab')
    .description('Comandos para gestionar laboratorios Cisco');

  command.addCommand(createLabParseCommand());
  command.addCommand(createLabValidateCommand());
  command.addCommand(createLabCreateCommand());
  command.addCommand(createLabListCommand());
  command.addCommand(createLabInteractiveCommand());
  command.addCommand(createLabPipelineCommand());
  command.addCommand(createLabFullBuildCommand());
  command.addCommand(createLabVlanCommand());
  command.addCommand(createRoutingCommand());
  command.addCommand(createACLCommand());

  return command;
}
