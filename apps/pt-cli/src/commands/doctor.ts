#!/usr/bin/env bun
/**
 * Comando doctor - Diagnóstico del sistema PT
 * Thin CLI that delegates filesystem checks to pt-control use cases.
 */

import { Command } from "commander";
import {
  runAllDoctorChecks,
  type DoctorCheckResult,
} from "@cisco-auto/pt-control/application/doctor";
import { getDefaultDevDir, getLogsDir, getHistoryDir, getResultsDir } from "../system/paths.ts";
import { createDefaultPTController } from "../application/controller-provider.js";

export { type DoctorCheckResult };

export function createDoctorCommand(): Command {
  return new Command("doctor")
    .description("Diagnóstico del sistema - verifica el entorno de PT")
    .option("-v, --verbose", "Salida detallada", false)
    .option("-j, --json", "Salida JSON", false)
    .action(async (options: any) => {
      const paths = {
        ptDevDir: process.env.PT_DEV_DIR ?? getDefaultDevDir(),
        logsDir: getLogsDir(),
        historyDir: getHistoryDir(),
        resultsDir: getResultsDir(),
      };

      const controller = createDefaultPTController();
      try {
        const checks = await runAllDoctorChecks(controller, paths, options.verbose);
        const ok = checks.every((c) => c.ok);

        if (options.json) {
          const output = {
            ok,
            action: "doctor",
            checks: checks.map((c) => ({
              name: c.name,
              ok: c.ok,
              severity: c.severity,
              message: c.message,
              details: c.details,
            })),
          };

          process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
          process.exit(ok ? 0 : 1);
          return;
        }

        console.log("");
        console.log("═══ Diagnóstico del sistema ═══");
        console.log("");

        const sevIcons: Record<string, string> = { info: "ℹ", warning: "⚠", critical: "🔴" };
        for (const c of checks) {
          const icon = c.ok ? "✓" : "✗";
          const sev = sevIcons[c.severity] ?? "·";
          console.log(`  ${icon} [${sev}] ${c.message}`);
          if (c.details && options.verbose) {
            console.log(`     ${c.details}`);
          }
        }

        const criticalsCount = checks.filter((c) => !c.ok && c.severity === "critical").length;
        const warningsCount = checks.filter((c) => !c.ok && c.severity === "warning").length;
        const okCount = checks.filter((c) => c.ok).length;

        console.log("");
        console.log(`Resumen: ${okCount} OK, ${warningsCount} warning, ${criticalsCount} critical`);
        if (criticalsCount > 0) {
          console.log("→ Acción requerida: hay problemas críticos.");
        } else if (warningsCount > 0) {
          console.log("→ Revisar warnings para mejorar la operación.");
        } else {
          console.log("→ Sistema operativo.");
        }
        console.log("");
      } finally {
        try {
          await controller.stop();
        } catch {
          // Ignorar fallos de cierre del controller
        }
      }
    });
}
