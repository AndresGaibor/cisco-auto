#!/usr/bin/env bun
/**
 * Comando bench - Benchmark de comandos IOS en dispositivos.
 */

import { Command } from "commander";
import type { BenchmarkCommandResult } from "@cisco-auto/pt-control/application/bench";
import { runBenchmark, parseCommandString, summarizeBenchmarkResults } from "@cisco-auto/pt-control/application/bench";
import { createDefaultPTController } from "../application/controller-provider.js";

export function createBenchCommand(): Command {
  return new Command("bench")
    .description("Benchmark de comandos IOS - mide latencia y throughput")
    .argument("<device>", "Dispositivo destino: R1, SW1, PC1, Server1")
    .requiredOption("--commands <string>", "Comandos separados por coma: show version,show ip interface brief")
    .option("--runs <number>", "Número de ejecuciones por comando", "3")
    .option("-j, --json", "Salida JSON para agentes", false)
    .action(async (device: string, options: { commands: string; runs?: string; json?: boolean }) => {
      const commands = parseCommandString(options.commands);

      if (commands.length === 0) {
        process.stderr.write("Error: no se pudo parsear comandos\n");
        process.exit(1);
        return;
      }

      const runs = parseInt(options.runs ?? "3", 10);

      const controller = createDefaultPTController();
      try {
        await controller.start();

        const results = await runBenchmark({ device, commands, runs, controller });
        const summary = summarizeBenchmarkResults(results);

        const report = {
          schemaVersion: "1.0" as const,
          action: "bench.cmd",
          device,
          commands: results.map((r: BenchmarkCommandResult) => ({
            command: r.command,
            runs: r.runs,
            medianMs: r.medianMs,
            p95Ms: r.p95Ms,
            minMs: r.minMs,
            maxMs: r.maxMs,
            okCount: r.okCount,
            errorCount: r.errorCount,
            timings: r.timings,
          })),
          summary: {
            totalRuns: summary.totalRuns,
            totalCommands: summary.totalCommands,
            overallMedianMs: summary.overallMedianMs,
            overallP95Ms: summary.overallP95Ms,
            errors: summary.errors,
          },
        };

        if (options.json) {
          process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
        } else {
          console.log(`\nBenchmark: ${device}`);
          console.log("────────────────────────────────────────");
          for (const r of results) {
            console.log(`  ${r.command}`);
            console.log(`    median: ${r.medianMs}ms | p95: ${r.p95Ms}ms | errors: ${r.errorCount}/${r.runs}`);
          }
          console.log("────────────────────────────────────────");
          console.log(`Total: ${summary.totalRuns} runs, errors: ${summary.errors}`);
        }
      } finally {
        await controller.stop();
      }
    });
}