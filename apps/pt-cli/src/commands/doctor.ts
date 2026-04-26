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
import type { CliResult } from "../contracts/cli-result.ts";
import type { CommandMeta } from "../contracts/command-meta.ts";
import { createSuccessResult } from "../contracts/cli-result.ts";
import { runCommand } from "../application/run-command.ts";
import { COMMAND_CATALOG } from "./command-catalog.ts";

export { type DoctorCheckResult };

export function createDoctorCommand(): Command {
  return new Command("doctor")
    .description("Diagnóstico del sistema - verifica el entorno de PT")
    .option("-v, --verbose", "Salida detallada", false)
    .option("-j, --json", "Salida JSON", false)
    .action(async (options: any) => {
      await runCommand({
        action: "doctor",
        meta: COMMAND_CATALOG["doctor"] as unknown as CommandMeta,
        flags: options,
        execute: async (ctx) => {
          const paths = {
            ptDevDir: process.env.PT_DEV_DIR ?? getDefaultDevDir(),
            logsDir: getLogsDir(),
            historyDir: getHistoryDir(),
            resultsDir: getResultsDir(),
          };

          const checks = await runAllDoctorChecks(ctx.controller, paths, options.verbose);
          const ok = checks.every((c) => c.ok);

          const result = createSuccessResult("doctor", {
            checks: checks.map((c) => ({
              name: c.name,
              ok: c.ok,
              severity: c.severity,
              message: c.message,
              details: c.details,
            })),
          });

          result.verification = {
            executed: true,
            verified: ok,
            verificationSource: checks.map((c) => c.name),
            checks: checks.map((c) => ({
              name: c.name,
              ok: c.ok,
              severity: c.severity,
              details: { message: c.message, details: c.details },
            })),
          };

          if (!ok) {
            result.warnings = ["Algunas verificaciones de diagnóstico fallaron."];
            result.advice = [
              'Ejecuta "pt build" para desplegar archivos a ~/pt-dev/',
              "Asegúrate de que Packet Tracer esté ejecutándose",
              "Verifica que el script generado esté cargado en Packet Tracer",
              'Revisa "pt logs errors" para errores recientes',
            ];
          }

          return result;
        },
      });

      // Fallback human-readable output for direct invocation
      const paths = {
        ptDevDir: process.env.PT_DEV_DIR ?? getDefaultDevDir(),
        logsDir: getLogsDir(),
        historyDir: getHistoryDir(),
        resultsDir: getResultsDir(),
      };

      console.log("");
      console.log("═══ Diagnóstico del sistema ═══");
      console.log("");

      const mockController = {
        getHeartbeat: () => null,
        getHeartbeatHealth: () => ({ state: "unknown" }),
        getSystemContext: () => ({
          bridgeReady: false,
          topologyMaterialized: false,
          deviceCount: 0,
          linkCount: 0,
          heartbeat: { state: "unknown" },
          warnings: [],
        }),
      };

      const checks = await runAllDoctorChecks(mockController, paths, options.verbose);

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
    });
}