#!/usr/bin/env bun
/**
 * Comando pt bridge - Muestra estado del bridge CLI ↔ Packet Tracer
 */

import { Command } from "commander";
import { loadContextStatus } from "../application/context-supervisor.js";
import { runBridgeDoctor, printBridgeDoctorReport, type BridgeDoctorReport } from "@cisco-auto/pt-control";

export function createBridgeCommand(): Command {
  return new Command("bridge")
    .description("Mostrar estado del bridge CLI ↔ Packet Tracer")
    .addCommand(
      new Command("doctor")
        .description("Diagnóstico profundo del bridge CLI ↔ PT")
        .action(() => {
          const report = runBridgeDoctor();
          printBridgeDoctorReport(report);
        }),
    )
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
      console.log("Para más detalles: bun run pt status");
    });
}
