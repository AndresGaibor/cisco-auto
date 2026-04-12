#!/usr/bin/env bun
import { Command } from 'commander';

export function createAgentCommand(): Command {
  return new Command('agent')
    .description('Flujo de trabajo explícito para agentes');
}
