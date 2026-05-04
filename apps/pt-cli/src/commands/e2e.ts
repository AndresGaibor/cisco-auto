#!/usr/bin/env bun
/**
 * Comando e2e - Smoke tests E2E contra PT real.
 */

import { Command } from "commander";
import { E2eRunner, ReportGenerator } from "@cisco-auto/pt-control/application/e2e";
import { getDefaultDevDir, getLogsDir, getHistoryDir, getResultsDir } from "../system/paths.ts";
import { createDefaultPTController } from "../application/controller-provider.js";
import { resolve, join } from "node:path";
import { existsSync, readdirSync, readFileSync } from "node:fs";

function getReportsDir(): string {
  return resolve(process.cwd(), ".reports");
}

export function createE2eCommand(): Command {
  const e2e = new Command("e2e")
    .description("Suite E2E smoke tests contra Packet Tracer real");

  e2e
    .command("smoke")
    .description("Ejecutar suite smoke (doctor, device-list, show-version)")
    .option("-j, --json", "Salida JSON", false)
    .option("--no-report", "No generar reportes en .reports/", false)
    .action(async (opts: { json?: boolean; noReport?: boolean }) => {
      const paths = {
        ptDevDir: process.env.PT_DEV_DIR ?? getDefaultDevDir(),
        logsDir: getLogsDir(),
        historyDir: getHistoryDir(),
        resultsDir: getResultsDir(),
      };

      const reportsDir = getReportsDir();

      const controller = createDefaultPTController();
      try {
        const runner = new E2eRunner({ controller, paths });
        const result = await runner.runSmoke();

        if (!opts.noReport) {
          const generator = new ReportGenerator({ reportsDir });
          const { jsonPath, mdPath } = generator.generate(result);
          console.log("\nReportes guardados:");
          console.log(`  JSON: ${jsonPath}`);
          console.log(`  MD:   ${mdPath}`);
        }

        if (opts.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          const icon = result.status === "pass" ? "✅" : result.status === "degraded" ? "⚠️" : "❌";
          console.log(`\nSmoke suite: ${icon} ${result.status.toUpperCase()}`);
          console.log(`Duration: ${result.durationMs}ms`);
          console.log("");
          for (const c of result.cases) {
            const cIcon = c.severity === "pass" ? "✅" : c.severity === "degraded" ? "⚠️" : "❌";
            const errorMsg = c.error ? ` — ${c.error}` : "";
            console.log(`  ${cIcon} ${c.name}${errorMsg}`);
          }
        }

        process.exit(result.status === "fail" ? 1 : 0);
      } finally {
        try {
          await controller.stop();
        } catch {}
      }
    });

  e2e
    .command("report")
    .description("Mostrar último reporte E2E (busca en .reports/pt-e2e/)")
    .option("--json", "Salida JSON", false)
    .action(async (opts: { json?: boolean }) => {
      const reportsBase = join(getReportsDir(), "pt-e2e");

      if (!existsSync(reportsBase)) {
        console.log("No se encontraron reportes. Ejecuta primero: pt e2e smoke");
        process.exit(1);
      }

      const entries = readdirSync(reportsBase, { withFileTypes: true })
        .filter((d: DirEnt) => d.isDirectory())
        .sort()
        .reverse();

      if (entries.length === 0) {
        console.log("No se encontraron reportes.");
        process.exit(1);
      }

      const latestDir = join(reportsBase, entries[0]!.name);
      const jsonPath = join(latestDir, "report.json");

      if (!existsSync(jsonPath)) {
        console.log(`Reporte JSON no encontrado en: ${jsonPath}`);
        process.exit(1);
      }

      const content = readFileSync(jsonPath, "utf-8");
      const report = JSON.parse(content);

      if (opts.json) {
        console.log(JSON.stringify(report, null, 2));
      } else {
        const icon = report.status === "pass" ? "✅" : report.status === "degraded" ? "⚠️" : "❌";
        console.log(`\nÚltimo reporte: ${entries[0]!.name}`);
        console.log(`Status: ${icon} ${report.status.toUpperCase()}`);
        console.log(`Duración: ${report.timing?.durationMs ?? "?"}ms`);
        console.log("");
        for (const c of report.cases ?? []) {
          const cIcon = c.severity === "pass" ? "✅" : c.severity === "degraded" ? "⚠️" : "❌";
          console.log(`  ${cIcon} ${c.name}`);
        }
        console.log(`\nRuta: ${jsonPath}`);
      }
    });

  return e2e;
}

interface DirEnt {
  isDirectory(): boolean;
  name: string;
}