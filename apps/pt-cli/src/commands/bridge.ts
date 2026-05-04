#!/usr/bin/env bun
/**
 * Comando pt bridge - Muestra estado del bridge CLI ↔ Packet Tracer
 */

import { Command } from "commander";
import { loadContextStatus } from "../application/context-supervisor.js";
import { runBridgeDoctor, printBridgeDoctorReport } from "@cisco-auto/pt-control/commands/bridge-doctor";
import { getBridgeStats, cleanBridge } from "@cisco-auto/pt-control/application/bridge";
import { getRuntimeTrace } from "@cisco-auto/pt-control/application/bridge";
import { getDefaultDevDir } from "../system/paths.js";

export function createBridgeCommand(): Command {
  const bridge = new Command("bridge")
    .description("Mostrar estado del bridge CLI ↔ Packet Tracer");

  bridge
    .command("stats")
    .description("Estadísticas del bridge (comandos, in-flight, dead-letter)")
    .option("-j, --json", "Salida JSON", false)
    .action(async (options: { json?: boolean }) => {
      const ptDevDir = process.env.PT_DEV_DIR ?? getDefaultDevDir();
      const stats = getBridgeStats(ptDevDir);

      if (options.json) {
        process.stdout.write(`${JSON.stringify(stats, null, 2)}\n`);
      } else {
        console.log("=== Bridge Stats ===\n");
        console.log(`pt-dev: ${stats.ptDevDir}`);
        console.log(`commands: ${stats.commands.count} (oldest: ${stats.commands.oldest ?? "n/a"})`);
        console.log(`in-flight: ${stats.inFlight.count} (oldest: ${stats.inFlight.oldest ?? "n/a"})`);
        console.log(`dead-letter: ${stats.deadLetter.count}`);
        if (stats.deadLetter.count > 0) {
          console.log("\n⚠ dead-letter tiene archivos. Ejecuta: pt bridge clean");
        }
      }
    });

  bridge
    .command("clean")
    .description("Limpia archivos dead-letter y stalled in-flight")
    .option("--dry-run", "Solo muestra qué se eliminaría", false)
    .action(async (options: { dryRun?: boolean }) => {
      const ptDevDir = process.env.PT_DEV_DIR ?? getDefaultDevDir();
      const result = cleanBridge(Boolean(options.dryRun), ptDevDir);

      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);

      if (result.removed.length > 0 && !result.dryRun) {
        console.log(`\nLimpiados: ${result.removed.length} archivos`);
      }
    });

  bridge
    .command("doctor")
    .description("Diagnóstico profundo del bridge CLI ↔ PT")
    .action(() => {
      const report = runBridgeDoctor();
      printBridgeDoctorReport(report);
    });

  bridge
    .action(async () => {
      const status = await loadContextStatus();

      console.log("=== Bridge Status ===\n");

      if (!status) {
        console.log("Bridge: sin cache de contexto");
        console.log("Status: espera a ejecutar un comando pt");
        return;
      }

      console.log(`Bridge       : ${status.bridge.ready ? "ready" : "not ready"}`);
      console.log(`Heartbeat    : ${status.heartbeat.state}`);
      console.log(`Topology     : ${status.topology.materialized ? "materialized" : "warming"}`);
      console.log(`Devices      : ${status.topology.deviceCount}`);
      console.log(`Links        : ${status.topology.linkCount}`);
      console.log("");
      console.log("Para más detalles: bun run pt doctor");
      console.log("Para estadísticas: bun run pt bridge stats");
    });

  return bridge;
}