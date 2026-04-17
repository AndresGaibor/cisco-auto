#!/usr/bin/env bun
import { Command } from 'commander';
import { createInspectTopologyCommand } from './topology.js';
import { createInspectNeighborsCommand } from './neighbors.js';
import { createInspectFreePortsCommand } from './free-ports.js';
import { createInspectDriftCommand } from './drift.js';
import { createInspectApiCommand } from './api.js';
import { createEvaluateCommand } from './eval.js';

export function createInspectCommand(): Command {
  const command = new Command('inspect')
    .description('Inspección canónica del estado del laboratorio y del twin');

  command.addCommand(createInspectTopologyCommand());
  command.addCommand(createInspectNeighborsCommand());
  command.addCommand(createInspectFreePortsCommand());
  command.addCommand(createInspectDriftCommand());
  command.addCommand(createInspectApiCommand());
  command.addCommand(createEvaluateCommand());

  return command;
}
