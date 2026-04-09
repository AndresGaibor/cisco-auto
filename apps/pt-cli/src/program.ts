#!/usr/bin/env bun

import { Command } from 'commander';
import { addGlobalFlags } from './flags';
import { COMMAND_FACTORIES } from './commands/command-registry';

export function createProgram(): Command {
  const program = new Command();

  addGlobalFlags(program);

  program
    .name('pt')
    .description('CLI para controlar Cisco Packet Tracer en tiempo real')
    .version('0.2.0')
    .exitOverride()
    .configureOutput({
      writeErr: (str) => console.error(str.trim()),
    });

  program.addCommand(createBuildCommand());
  for (const factory of COMMAND_FACTORIES) {
    program.addCommand(factory());
  }

  return program;
}

export function parseProgram(argv = process.argv): void {
  const program = createProgram();

  try {
    program.parse(argv);
  } catch (error) {
    if (error instanceof Error) {
      const commanderError = error as { code?: string; exitCode?: number };
      const errorCode = commanderError.code;
      switch (errorCode) {
        case 'commander.unknownCommand':
        case 'commander.unknownOption':
          process.exit(ExitCodes.INVALID_USAGE);
          break;
        case 'commander.helpDisplayed':
        case 'commander.help':
        case 'commander.version':
          process.exit(ExitCodes.SUCCESS);
          break;
        default:
          if (commanderError.exitCode === 0) {
            process.exit(ExitCodes.SUCCESS);
            break;
          }
          process.exit(ExitCodes.ERROR);
      }
    }
    process.exit(ExitCodes.ERROR);
  }
}
