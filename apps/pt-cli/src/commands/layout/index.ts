#!/usr/bin/env bun
import { Command } from 'commander';
import { createLayoutPlaceCommand } from './place.js';
import { createLayoutAlignCommand } from './align.js';
import { createLayoutGridCommand } from './grid.js';
import { createLayoutZoneCommand } from './zone.js';

export function createLayoutCommand(): Command {
  const command = new Command('layout')
    .description('Comandos canónicos para disposición espacial del laboratorio');

  command.addCommand(createLayoutPlaceCommand());
  command.addCommand(createLayoutAlignCommand());
  command.addCommand(createLayoutGridCommand());
  command.addCommand(createLayoutZoneCommand());

  return command;
}
