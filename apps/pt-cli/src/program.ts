#!/usr/bin/env bun

import { Command } from "commander";
import chalk from "chalk";
import { addGlobalFlags } from "./flags.js";
import { ExitCodes } from "./errors/index.js";
import { COMMAND_DEFINITIONS, PUBLIC_COMMAND_DEFINITIONS } from "./commands/command-registry.js";
import { renderRootHelp } from "./cli/help-renderer.js";
import { renderCliParseError } from "./cli/error-renderer.js";
import { suggestClosest } from "./cli/suggest.js";

const ROOT_COMMAND_NAMES = [
  "doctor",
  "runtime",
  "lab",
  "device",
  "dev",
  "link",
  "ln",
  "cmd",
  "set",
  "verify",
  "completion",
];

export function createProgram(): Command {
  const program = new Command();

  program
    .name("pt")
    .description("CLI profesional para automatizar Cisco Packet Tracer")
    .version("0.3.0")
    .exitOverride()
    .showHelpAfterError(false)
    .showSuggestionAfterError(false)
    .configureOutput({
      writeOut: (str) => process.stdout.write(str),
      writeErr: (str) => process.stderr.write(str),
      outputError: (str, write) => write(str),
    });

  addGlobalFlags(program);

  program.addHelpText("beforeAll", () => renderRootHelp(PUBLIC_COMMAND_DEFINITIONS));

  const registered = new Set<string>();

  for (const definition of COMMAND_DEFINITIONS) {
    if (definition.hidden && process.env.PT_CLI_LEGACY !== "1") continue;

    const command = definition.factory();

    if (registered.has(command.name())) continue;
    program.addCommand(command);
    registered.add(command.name());
  }

  program.arguments("<command> [args...]").action((commandName: string, _args: string[]) => {
    const suggestions = suggestClosest(commandName, ROOT_COMMAND_NAMES);
    const lines: string[] = [];
    lines.push("");
    lines.push(`${chalk.red("✗")} Comando desconocido: ${commandName}`);
    if (suggestions.length > 0) {
      lines.push("");
      lines.push(chalk.bold("¿Quisiste decir?"));
      for (const s of suggestions) {
        lines.push(`  pt ${s}`);
      }
    }
    lines.push("");
    lines.push(chalk.bold("Ayuda útil:"));
    lines.push("  pt --help");
    lines.push("  pt cmd --help");
    lines.push("  pt verify --help");
    lines.push("  pt doctor");
    lines.push("");
    process.stderr.write(lines.join("\n"));
    process.exit(ExitCodes.INVALID_USAGE);
  });

  return program;
}

export async function parseProgram(argv = process.argv): Promise<void> {
  const program = createProgram();

  try {
    await program.parseAsync(argv);
  } catch (error) {
    const commanderError = error as Error & { code?: string; exitCode?: number };

    if (
      commanderError.code === "commander.helpDisplayed" ||
      commanderError.code === "commander.help" ||
      commanderError.code === "commander.version" ||
      commanderError.exitCode === 0
    ) {
      process.exit(ExitCodes.SUCCESS);
    }

    if (
      commanderError.code === "commander.unknownCommand" ||
      commanderError.code === "commander.unknownOption" ||
      commanderError.code === "commander.missingArgument" ||
      commanderError.code === "commander.missingMandatoryOptionValue"
    ) {
      process.stderr.write(
        renderCliParseError({
          argv,
          message: commanderError.message,
          code: commanderError.code,
        }),
      );
      process.exit(ExitCodes.INVALID_USAGE);
    }

    process.stderr.write("");
    process.stderr.write(`${chalk.red("✗")} ${commanderError.message ?? String(error)}\n`);
    process.stderr.write("Ejecuta: pt doctor\n");
    process.stderr.write("O revisa ayuda: pt --help\n\n");
    process.exit(ExitCodes.ERROR);
  }
}