#!/usr/bin/env bun
import { Command } from "commander";
import chalk from "chalk";

export function withLegacyWarning(command: Command, replacement: string): Command {
  command.hook("preAction", () => {
    process.stderr.write(`${chalk.yellow("⚠")} Comando legacy. Usa: ${replacement}\n`);
  });
  return command;
}