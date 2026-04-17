#!/usr/bin/env bun
import { Command } from "commander";
import { createDefaultPTController } from "@cisco-auto/pt-control";
import { loadContextStatus, collectContextStatus } from "../application/context-supervisor.js";
import { getGlobalFlags } from "../flags.js";
import type { ContextStatus } from "../contracts/context-status.js";
import { historyStore } from "../telemetry/history-store.js";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { getDefaultDevDir } from "../system/paths.js";

export function createStatusCommand(): Command {
  return new Command("status")
    .description("Muestra el estado operativo y salud del contexto CLI (pt status)")
    .option("--json", "Salida en JSON", false)
    .action(async function (this: Command, opts: { json?: boolean }) {
      // Preferir una lectura viva cuando el bridge responda
      let status: ContextStatus | null = null;
      const controller = createDefaultPTController();
      try {
        await controller.start();
        status = await collectContextStatus(controller);
      } catch (err) {
        console.debug("[status] No se pudo obtener estado vivo:", err);
        status = await loadContextStatus();
      } finally {
        try {
          await controller.stop();
        } catch (e) {
          console.debug("[status] Error deteniendo controller:", e);
        }
      }

      if (!status) {
        console.log(
          "No hay estado de contexto disponible. Ejecuta un comando para inicializar el contexto o usa pt doctor.",
        );
        return;
      }

      const programFlags = getGlobalFlags(this as unknown as Command);
      const jsonOutput = opts.json === true || programFlags.json === true;

      if (jsonOutput) {
        console.log(JSON.stringify(status, null, 2));
        return;
      }

      const lastEntry = (await historyStore.list({ limit: 20 })).find(
        (entry) => entry.verificationSummary || (entry.warnings && entry.warnings.length > 0),
      );
      const lastFailed = (await historyStore.list({ limit: 20, failedOnly: true }))[0];

      const ptDevDir = process.env.PT_DEV_DIR ?? getDefaultDevDir();
      const deadLetterDir = join(ptDevDir, "dead-letter");
      const deadCount = existsSync(deadLetterDir)
        ? readdirSync(deadLetterDir).filter((f) => f.endsWith(".json")).length
        : 0;

      console.log("");
      console.log(
        `Heartbeat             : ${status.heartbeat.state}${status.heartbeat.ageMs ? ` (age ${status.heartbeat.ageMs}ms)` : ""}`,
      );
      console.log(`Bridge                : ${status.bridge.ready ? "ready" : "not ready"}`);
      console.log(
        `Queue                 : ${status.bridge.queuedCount ?? 0} queued / ${status.bridge.inFlightCount ?? 0} in-flight / ${deadCount} dead-letter`,
      );
      console.log(
        `Topology              : ${status.topology.materialized ? "materialized" : "warming"}`,
      );
      console.log(`Topology health       : ${status.topology.health}`);
      console.log(`Devices               : ${status.topology.deviceCount}`);
      console.log(`Links                 : ${status.topology.linkCount}`);

      if (lastFailed) {
        console.log(
          `\nÚltimo fallo          : ${lastFailed.action} (${lastFailed.startedAt?.slice(0, 19)})`,
        );
        if (lastFailed.errorMessage)
          console.log(`  Error: ${lastFailed.errorMessage.slice(0, 80)}`);
      }

      if (status.warnings && status.warnings.length > 0) {
        console.log("\nWarnings:");
        for (const w of status.warnings) {
          console.log(" -", w);
        }
      } else {
        console.log("\nWarnings: none");
      }

      if (status.notes && status.notes.length > 0) {
        console.log("\nNotas de contexto:");
        for (const n of status.notes.slice(-5)) {
          console.log(" -", n);
        }
      }

      if (lastEntry) {
        console.log("\nÚltima verificación / advertencia en historial:");
        if (lastEntry.verificationSummary) console.log(`  - ${lastEntry.verificationSummary}`);
        if (lastEntry.warnings && lastEntry.warnings.length)
          console.log(`  - warnings: ${lastEntry.warnings.join("; ")}`);
      }
    });
}
