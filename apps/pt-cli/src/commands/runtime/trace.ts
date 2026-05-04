#!/usr/bin/env bun
/**
 * Comando runtime trace - Últimas entradas de trace del runtime.
 */

import { Command } from "commander";
import { getRuntimeTrace } from "@cisco-auto/pt-control/application/bridge";

export function createRuntimeTraceCommand(): Command {
  return new Command("trace")
    .description("Ver últimas entradas de trace del runtime")
    .option("--last <number>", "Número de entradas a mostrar", "20")
    .option("-j, --json", "Salida JSON", false)
    .action(async (options: { last?: string; json?: boolean }) => {
      const last = parseInt(options.last ?? "20", 10);
      const entries = getRuntimeTrace(last);

      const report = {
        schemaVersion: "1.0" as const,
        action: "runtime.trace",
        entries,
        count: entries.length,
      };

      if (options.json) {
        process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
      } else {
        console.log(`=== Runtime Trace (últimas ${entries.length}) ===\n`);
        for (const e of entries) {
          const ts = e.ts ? new Date(e.ts).toISOString() : "n/a";
          console.log(`[${ts}] ${e.type} | ok=${e.ok ?? "?"} | status=${e.status ?? "?"}`);
        }
        if (entries.length === 0) {
          console.log("No hay entradas de trace.");
          console.log("Ejecuta un comando pt para generar trazas.");
        }
      }
    });
}