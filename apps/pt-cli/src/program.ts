#!/usr/bin/env bun

import { Command } from "commander";
import chalk from "chalk";
import { addGlobalFlags } from "./flags.js";
import { ExitCodes } from "./errors/index.js";
import { COMMAND_DEFINITIONS, PUBLIC_COMMAND_DEFINITIONS } from "./commands/command-registry.js";
import { renderRootHelp } from "./cli/help-renderer.js";
import { renderCliParseError } from "./cli/error-renderer.js";
import { suggestClosest } from "./cli/suggest.js";

export function attachCommandTiming(
  program: Command,
  write: (message: string) => void = (message) => process.stdout.write(message),
): Command {
  let startedAt = 0;
  let commandPath = program.name();

  const buildCommandPath = (command: Command): string => {
    const names: string[] = [];
    let current: Command | null = command;

    while (current) {
      names.unshift(current.name());
      current = current.parent;
    }

    return names.join(" ");
  };

  program.hook("preAction", (_thisCommand, actionCommand) => {
    startedAt = Date.now();
    commandPath = buildCommandPath(actionCommand);
  });

  program.hook("postAction", () => {
    if (!startedAt) return;

    const elapsedSeconds = (Date.now() - startedAt) / 1000;
    write(`⏱ ${commandPath} · ${elapsedSeconds.toFixed(1)}s\n`);
    startedAt = 0;
  });

  return program;
}

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
  "omni",
  "omniscience",
  "logs",
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

  // Configurar ayuda personalizada al estilo gh
  program.configureHelp({
    formatHelp: (cmd, helper) => {
      const cmdName = cmd.name();
      
      // Solo mostrar ayuda raíz si es el comando pt
      if (cmdName === "pt" || !cmd.parent) {
        return renderRootHelp(PUBLIC_COMMAND_DEFINITIONS);
      }
      
      // Para subcomandos, usar el formato por defecto de Commander
      // pero sin heredar la ayuda del padre
      const usage = helper.commandUsage(cmd);
      const help = helper.visibleOptions(cmd).map((opt) => helper.optionTerm(opt) + "  " + opt.description).join("\n");
      const subcommands = helper.visibleCommands(cmd);
      
      let output = `Usage: ${usage}\n\n`;
      output += `${cmd.description()}\n\n`;
      
      if (subcommands.length > 0) {
        output += "Commands:\n";
        for (const sub of subcommands) {
          output += `  ${helper.subcommandTerm(sub).padEnd(30)} ${sub.description()}\n`;
        }
        output += "\n";
      }
      
      if (help.trim()) {
        output += "Options:\n" + help + "\n\n";
      }
      
      return output;
    },
  });

  addGlobalFlags(program);
  attachCommandTiming(program);

  const registered = new Set<string>();

  for (const definition of COMMAND_DEFINITIONS) {
    if (definition.hidden && process.env.PT_CLI_LEGACY !== "1") continue;

    const command = definition.factory();

    if (registered.has(command.name())) continue;
    program.addCommand(command);
    registered.add(command.name());
  }

  program.action(() => {
    process.stdout.write(renderRootHelp(PUBLIC_COMMAND_DEFINITIONS));
  });

  program.on("command:*", ([commandName]) => {
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
    lines.push("  pt omni --help");
    lines.push("  pt verify --help");
    lines.push("  pt doctor");
    lines.push("");
    process.stderr.write(lines.join("\n"));
    process.exit(ExitCodes.INVALID_USAGE);
  });

  return program;
}

export async function parseProgram(argv = process.argv): Promise<void> {
  // Extraer primer argumento que parece comando (no empieza con -)
  const attemptedCommand = argv.slice(2).find((arg) => !arg.startsWith("-"));
  const hasHelpFlag = argv.slice(2).some((arg) => arg === "--help" || arg === "-h");
  const isKnownCommand = attemptedCommand && ROOT_COMMAND_NAMES.includes(attemptedCommand);

  // Interceptar --help con comando desconocido antes de que Commander procese
  if (attemptedCommand && hasHelpFlag && !isKnownCommand) {
    const suggestions = suggestClosest(attemptedCommand, ROOT_COMMAND_NAMES);
    const lines: string[] = [];
    lines.push("");
    lines.push(`${chalk.red("✗")} Comando desconocido: ${attemptedCommand}`);
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
    lines.push("  pt doctor");
    lines.push("");
    process.stderr.write(lines.join("\n"));
    process.exit(ExitCodes.INVALID_USAGE);
  }

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

    // Manejar "too many arguments" (Commander dispara esto para comandos desconocidos)
    if (commanderError.message?.includes("too many arguments") && attemptedCommand && !isKnownCommand) {
      const suggestions = suggestClosest(attemptedCommand, ROOT_COMMAND_NAMES);
      const lines: string[] = [];
      lines.push("");
      lines.push(`${chalk.red("✗")} Comando desconocido: ${attemptedCommand}`);
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
      lines.push("  pt omni --help");
      lines.push("  pt verify --help");
      lines.push("  pt doctor");
      lines.push("");
      process.stderr.write(lines.join("\n"));
      process.exit(ExitCodes.INVALID_USAGE);
    }

    process.stderr.write("");
    process.stderr.write(`${chalk.red("✗")} ${commanderError.message ?? String(error)}\n`);
    process.stderr.write("Ejecuta: pt doctor\n");
    process.stderr.write("O revisa ayuda: pt --help\n\n");
    process.exit(ExitCodes.ERROR);
  }
}
