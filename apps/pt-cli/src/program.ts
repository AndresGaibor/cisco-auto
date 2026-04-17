#!/usr/bin/env bun

import { Command } from "commander";
import { addGlobalFlags } from "./flags";
import { COMMAND_FACTORIES } from "./commands/command-registry";
import { ExitCodes } from "./errors";

export function createProgram(): Command {
  const program = new Command();

  program
    .name("cisco-auto")
    .description("CLI de cisco-auto para automatización de Packet Tracer")
    .version("0.2.0")
    .exitOverride()
    .configureOutput({
      outputError: (str, write) => write(str),
    });

  addGlobalFlags(program);

  for (const factory of COMMAND_FACTORIES) {
    program.addCommand(factory());
  }

  return program;
}

export interface CommandTimingState {
  startedAt: number;
  commandName: string;
}

function formatCommandPath(command: Command): string {
  const parts: string[] = [];
  let current: Command | null | undefined = command;

  while (current) {
    const name = current.name();
    if (name) {
      parts.unshift(name);
    }
    current = current.parent;
  }

  return parts.join(" ");
}

function finishCommandTiming(timing: CommandTimingState, write: (message: string) => void): void {
  if (timing.startedAt <= 0) {
    return;
  }

  const elapsedMs = Date.now() - timing.startedAt;
  const duration = elapsedMs >= 1000 ? `${(elapsedMs / 1000).toFixed(1)}s` : `${elapsedMs}ms`;
  write(`⏱ ${timing.commandName || "comando"} · ${duration}\n`);
  timing.startedAt = 0;
  timing.commandName = "";
}

export function attachCommandTiming(
  program: Command,
  write: (message: string) => void = (message: string) => process.stderr.write(message),
): CommandTimingState {
  const timing: CommandTimingState = {
    startedAt: 0,
    commandName: "",
  };

  program.hook("preAction", (_thisCommand, actionCommand) => {
    timing.startedAt = Date.now();
    timing.commandName = formatCommandPath(actionCommand);
  });

  program.hook("postAction", () => {
    finishCommandTiming(timing, write);
  });

  return timing;
}

export async function parseProgram(argv = process.argv): Promise<void> {
  const program = createProgram();
  const timing = attachCommandTiming(program);

  try {
    await program.parseAsync(argv);
  } catch (error) {
    if (error instanceof Error) {
      const commanderError = error as { code?: string; exitCode?: number };
      const errorCode = commanderError.code;
      switch (errorCode) {
        case "commander.unknownCommand":
        case "commander.unknownOption":
          process.exit(ExitCodes.INVALID_USAGE);
          break;
        case "commander.helpDisplayed":
        case "commander.help":
        case "commander.version":
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
  } finally {
    finishCommandTiming(timing, (message) => process.stderr.write(message));
  }
}
