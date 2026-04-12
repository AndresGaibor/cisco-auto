#!/usr/bin/env bun
import { Command } from 'commander';
import { createAgentContextCommand } from './context.js';
import { createAgentPlanCommand } from './plan.js';
import { createAgentApplyCommand } from './apply.js';
import { createAgentVerifyCommand } from './verify.js';

export function createAgentCommand(): Command {
  const command = new Command('agent').description('Flujo de trabajo explícito para agentes');

  command.addCommand(createAgentContextCommand());
  command.addCommand(createAgentPlanCommand());
  command.addCommand(createAgentApplyCommand());
  command.addCommand(createAgentVerifyCommand());

  return command;
}
