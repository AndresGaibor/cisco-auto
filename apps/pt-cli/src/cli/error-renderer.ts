#!/usr/bin/env bun
import chalk from "chalk";
import { suggestClosest, suggestFlag } from "./suggest.js";

export interface CliErrorRenderInput {
  argv: string[];
  message: string;
  code?: string;
}

function getUserCommand(argv: string[]): string {
  return argv.slice(2).join(" ").trim();
}

function getFirstUserToken(argv: string[]): string {
  return argv.slice(2).find((part) => !part.startsWith("-")) ?? "";
}

function getBadFlag(message: string): string | null {
  const match = message.match(/'(--?[a-zA-Z0-9-]+)'/);
  return match?.[1] ?? null;
}

export function renderCliParseError(input: CliErrorRenderInput): string {
  const userCommand = getUserCommand(input.argv);
  const firstToken = getFirstUserToken(input.argv);

  const lines: string[] = [];
  lines.push("");
  lines.push(`${chalk.red("✗")} ${input.message}`);

  if (input.code === "commander.unknownCommand" && firstToken) {
    const suggestions = suggestClosest(firstToken, [
      "doctor",
      "runtime",
      "device",
      "dev",
      "link",
      "ln",
      "cmd",
      "set",
      "verify",
      "omni",
      "omniscience",
      "completion",
    ]);

    if (suggestions.length > 0) {
      lines.push("");
      lines.push(chalk.bold("¿Quisiste decir?"));
      for (const suggestion of suggestions) {
        lines.push(`  pt ${suggestion}`);
      }
    }
  }

  if (input.code === "commander.unknownOption") {
    const badFlag = getBadFlag(input.message);
    if (badFlag) {
      const flagSuggestions = suggestFlag(badFlag);
      if (flagSuggestions.length > 0) {
        lines.push("");
        lines.push(chalk.bold("Flags parecidas:"));
        for (const suggestion of flagSuggestions) {
          lines.push(`  ${suggestion}`);
        }
      }
    }
  }

  lines.push("");
  lines.push(chalk.bold("Ayuda útil:"));
  lines.push("  pt --help");
  lines.push("  pt cmd --help");
  lines.push("  pt set --help");
  lines.push("  pt verify --help");
  lines.push("  pt omni --help");
  lines.push("  pt doctor");

  if (userCommand) {
    lines.push("");
    lines.push(chalk.gray(`Comando recibido: pt ${userCommand}`));
  }

  lines.push("");
  return lines.join("\n");
}