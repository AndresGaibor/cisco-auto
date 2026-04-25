import chalk from "chalk";
import type { TerminalCommandResult } from "@cisco-auto/terminal-contracts";

export interface TerminalPresenterOptions {
  outputFormat: "human" | "json";
  colorize: boolean;
}

export function createTerminalCommandPresenter(
  options: TerminalPresenterOptions
) {
  function present(result: TerminalCommandResult): void {
    if (options.outputFormat === "json") {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    if (result.ok) {
      printSuccess(result);
    } else {
      printError(result);
    }
  }

  function printSuccess(result: TerminalCommandResult): void {
    console.log(`\n📟 SALIDA DE CONSOLA (${result.device}):`);
    console.log("━".repeat(60));

    if (result.output) {
      console.log(result.output);
    } else {
      console.log(chalk.italic.gray("  (Salida vacía o filtrada por el sistema)"));
    }

    console.log("━".repeat(60));
  }

  function printError(result: TerminalCommandResult): void {
    console.error(`\n📟 SALIDA DE CONSOLA (${result.device}):`);
    console.error("━".repeat(60));

    if (result.output.trim()) {
      console.error(result.output);
    } else {
      console.error(
        chalk.italic.gray("  (No se capturó salida de consola para este error)")
      );
    }

    console.error("━".repeat(60));
  }

  return { present };
}
