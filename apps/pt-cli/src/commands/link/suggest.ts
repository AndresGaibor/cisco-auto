#!/usr/bin/env bun
import { Command } from "commander";
import chalk from "chalk";
import { createDefaultPTController } from "../../application/controller-provider.js";
import { PortPlannerService } from "@cisco-auto/pt-control/services";

export function createLinkSuggestCommand(): Command {
  return new Command("suggest")
    .description("Sugerir puertos libres para conectar dos dispositivos")
    .argument("<sourceDevice>", "Dispositivo origen")
    .argument("<targetDevice>", "Dispositivo destino")
    .option("--json", "Salida en JSON", false)
    .action(async (sourceDevice, targetDevice, options) => {
      const controller = createDefaultPTController();
      const planner = new PortPlannerService();

      await controller.start();
      try {
        const snapshot = await controller.snapshot();
        const sourcePlan = planner.suggestPorts(snapshot, sourceDevice, targetDevice);
        const targetPlan = planner.suggestPorts(snapshot, targetDevice, sourceDevice);
        const source = sourcePlan.sourceCandidates.find((candidate: any) => !candidate.occupied) ?? sourcePlan.sourceCandidates[0] ?? null;
        const target = targetPlan.sourceCandidates.find((candidate: any) => !candidate.occupied) ?? targetPlan.sourceCandidates[0] ?? null;
        const score = Math.max(source?.score ?? 0, target?.score ?? 0);

        if (options.json) {
          console.log(JSON.stringify({ sourceDevice, targetDevice, source, target, score, reasons: [...sourcePlan.warnings, ...targetPlan.warnings] }, null, 2));
          return;
        }

        console.log(chalk.bold(`\n🔗 Sugerencia de enlace ${sourceDevice} → ${targetDevice}\n`));
        if (source && target) {
          console.log(`Recomendado:\n${source.device}:${source.port} ↔ ${target.device}:${target.port}`);
          console.log(`Score: ${score}`);
        }
        if (sourcePlan.sourceCandidates.length > 0) {
          console.log("\nAlternativas:");
          for (const candidate of sourcePlan.sourceCandidates.slice(0, 3)) {
            console.log(`- ${candidate.device}:${candidate.port} (${candidate.score})`);
          }
        }
      } finally {
        await controller.stop();
      }
    });
}
