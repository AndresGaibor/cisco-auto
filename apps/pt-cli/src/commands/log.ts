// Alias para `pt log` (singular) — re-exporta createLogsCommand renombrado
import { createLogsCommand } from "./logs.js";
import { Command } from "commander";
import { existsSync } from "node:fs";
import { getPtDebugLogPath } from "../system/paths.js";
import { createDebugLogStream } from "../telemetry/debug-log-stream.js";

export function createLogCommand(): Command {
  const cmd = createLogsCommand();
  cmd.name("log");

  cmd.option("--live", "Seguir logs en tiempo real (equivale a: pt log tail --live)", false);

  cmd.action(function (this: Command) {
    const opts = this.opts() as { live?: boolean };
    if (!opts.live) {
      console.log("Usa 'pt log tail' o 'pt log tail --live' para ver logs");
      return;
    }

    const lines = 20;
    const debugLogPath = getPtDebugLogPath();

    if (!existsSync(debugLogPath)) {
      console.log("Esperando logs...");
      console.log(
        "(El archivo de debug log aún no existe. Asegúrate de que Packet Tracer esté corriendo.)",
      );
      return;
    }

    const stream = createDebugLogStream(debugLogPath);
    const initialEntries = stream.tail(lines);

    console.log(`\n=== Últimos ${lines} entradas de debug ===\n`);
    for (const entry of initialEntries) {
      const time = entry.timestamp.split("T")[1]?.split(".")[0]?.slice(0, 8) ?? "";
      const scopeColor = getScopeColor(entry.scope);
      console.log(`[${time}] ${scopeColor}${entry.scope.padEnd(10)}\x1b[0m ${entry.message}`);
    }

    console.log("\n⏳ Listening for new entries... (Ctrl+C para salir)\n");

    const stopFollow = stream.follow(
      (entry) => {
        const time = entry.timestamp.split("T")[1]?.split(".")[0]?.slice(0, 8) ?? "";
        const scopeColor = getScopeColor(entry.scope);
        console.log(`[${time}] ${scopeColor}${entry.scope.padEnd(10)}\x1b[0m ${entry.message}`);
      },
      (err) => {
        console.error("Error en stream de debug:", err.message);
      },
    );

    process.on("SIGINT", () => {
      stopFollow();
      console.log("\n\nDetenido.");
      process.exit(0);
    });
  });

  return cmd;
}

function getScopeColor(scope: string): string {
  switch (scope) {
    case "kernel":
      return "\x1b[36m";
    case "loader":
      return "\x1b[33m";
    case "runtime":
      return "\x1b[32m";
    default:
      return "\x1b[37m";
  }
}
