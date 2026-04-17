#!/usr/bin/env bun
/**
 * Comando doctor - Diagnóstico del sistema PT
 * Valida el estado del entorno de desarrollo y runtime.
 */

import { Command } from "commander";
import { existsSync, readdirSync, statSync, mkdirSync, readFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { getDefaultDevDir, getLogsDir, getHistoryDir, getResultsDir } from "../system/paths.ts";
import type { CliResult } from "../contracts/cli-result.ts";
import type { CommandMeta } from "../contracts/command-meta.ts";
import { createSuccessResult } from "../contracts/cli-result.ts";
import { runCommand } from "../application/run-command.ts";
import { COMMAND_CATALOG } from "./command-catalog.ts";
import { loadContextStatus } from "../application/context-supervisor.js";

interface DoctorCheckResult {
  name: string;
  ok: boolean;
  severity: "info" | "warning" | "critical";
  message: string;
  details?: string;
}

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
          const checks = await performDoctorChecks(ctx.controller, options.verbose);
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
              "Carga ~/pt-dev/main.js en Packet Tracer",
              'Revisa "pt logs errors" para errores recientes',
            ];
          }

          return result;
        },
      });

      const criticals = 0;
      const warnings = 0;
      console.log("");
      console.log("═══ Diagnóstico del sistema ═══");
      console.log("");

      const ptDevDir = process.env.PT_DEV_DIR ?? getDefaultDevDir();
      const checks = await performDoctorChecks(
        {
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
        },
        options.verbose,
      );

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

async function performDoctorChecks(
  controller: any,
  verbose: boolean,
): Promise<DoctorCheckResult[]> {
  const checks: DoctorCheckResult[] = [];
  const ptDevDir = process.env.PT_DEV_DIR ?? getDefaultDevDir();

  checks.push(checkPtDevDirectory(ptDevDir, verbose));
  checks.push(checkLogDirectory(getLogsDir(), verbose));
  checks.push(checkHistoryDirectory(getHistoryDir(), verbose));
  checks.push(checkResultsDirectory(getResultsDir(), verbose));
  checks.push(checkRuntimeFiles(ptDevDir, verbose));
  checks.push(checkBridgeQueues(ptDevDir, verbose));
  checks.push(await checkContextCache(ptDevDir, verbose));

  try {
    const hb = controller.getHeartbeat();
    const hbHealth = controller.getHeartbeatHealth();
    const systemCtx = controller.getSystemContext();

    checks.push({
      name: "heartbeat-present",
      ok: hb !== null,
      severity: "info",
      message: hb ? `Heartbeat encontrado` : "Archivo heartbeat.json no encontrado",
      details: verbose ? JSON.stringify(hb, null, 2) : undefined,
    });

    checks.push({
      name: "heartbeat-health",
      ok: hbHealth.state === "ok",
      severity: hbHealth.state === "ok" ? "info" : "warning",
      message: `Heartbeat estado: ${hbHealth.state}${hbHealth.ageMs ? ` (${hbHealth.ageMs}ms)` : ""}`,
      details: verbose ? JSON.stringify(hbHealth, null, 2) : undefined,
    });

    checks.push({
      name: "bridge-status",
      ok: systemCtx.bridgeReady,
      severity: systemCtx.bridgeReady ? "info" : "warning",
      message: `Bridge ready: ${systemCtx.bridgeReady ? "yes" : "no"}`,
      details: verbose ? JSON.stringify(systemCtx, null, 2) : undefined,
    });

    checks.push({
      name: "topology-materialized",
      ok: systemCtx.topologyMaterialized,
      severity: systemCtx.topologyMaterialized ? "info" : "warning",
      message: systemCtx.topologyMaterialized
        ? "Topología materializada"
        : "Topología no materializada",
      details: verbose
        ? `devices: ${systemCtx.deviceCount}, links: ${systemCtx.linkCount}`
        : undefined,
    });
  } catch (err) {
    checks.push({
      name: "bridge-connect",
      ok: false,
      severity: "critical",
      message: "No se pudo obtener información del controller/bridge",
      details: String(err),
    });
  }

  return checks;
}

function checkPtDevDirectory(ptDevDir: string, verbose: boolean): DoctorCheckResult {
  const name = "pt-dev-accessible";

  if (!existsSync(ptDevDir)) {
    return {
      name,
      ok: false,
      severity: "critical",
      message: `El directorio ${ptDevDir} no existe`,
      details: 'Ejecuta "pt build" para crear el directorio y desplegar archivos',
    };
  }

  try {
    statSync(ptDevDir);
    return {
      name,
      ok: true,
      severity: "info",
      message: `Directorio pt-dev accesible: ${ptDevDir}`,
      details: verbose ? `Modo: ${statSync(ptDevDir).mode.toString(8)}` : undefined,
    };
  } catch (e) {
    return {
      name,
      ok: false,
      severity: "critical",
      message: `No se puede acceder a ${ptDevDir}`,
      details: String(e),
    };
  }
}

function checkLogDirectory(logsDir: string, verbose: boolean): DoctorCheckResult {
  const name = "logs-writable";

  if (!existsSync(logsDir)) {
    try {
      mkdirSync(logsDir, { recursive: true });
      return {
        name,
        ok: true,
        severity: "warning",
        message: `Directorio de logs creado: ${logsDir}`,
      };
    } catch (e) {
      return {
        name,
        ok: false,
        severity: "warning",
        message: "No se pudo crear el directorio de logs",
        details: String(e),
      };
    }
  }

  return {
    name,
    ok: true,
    severity: "info",
    message: `Directorio de logs accesible: ${logsDir}`,
    details: verbose ? `${readdirSync(logsDir).length} archivos` : undefined,
  };
}

function checkHistoryDirectory(historyDir: string, verbose: boolean): DoctorCheckResult {
  const name = "history-writable";

  if (!existsSync(historyDir)) {
    try {
      mkdirSync(historyDir, { recursive: true });
      return {
        name,
        ok: true,
        severity: "warning",
        message: `Directorio de historial creado: ${historyDir}`,
      };
    } catch (e) {
      return {
        name,
        ok: false,
        severity: "warning",
        message: "No se pudo crear el directorio de historial",
        details: String(e),
      };
    }
  }

  return {
    name,
    ok: true,
    severity: "info",
    message: `Directorio de historial accesible: ${historyDir}`,
    details: verbose ? `${readdirSync(historyDir).length} archivos` : undefined,
  };
}

function checkResultsDirectory(resultsDir: string, verbose: boolean): DoctorCheckResult {
  const name = "results-writable";

  if (!existsSync(resultsDir)) {
    try {
      mkdirSync(resultsDir, { recursive: true });
      return {
        name,
        ok: true,
        severity: "warning",
        message: `Directorio de resultados creado: ${resultsDir}`,
      };
    } catch (e) {
      return {
        name,
        ok: false,
        severity: "warning",
        message: "No se pudo crear el directorio de resultados",
        details: String(e),
      };
    }
  }

  return {
    name,
    ok: true,
    severity: "info",
    message: `Directorio de resultados accesible: ${resultsDir}`,
    details: verbose ? `${readdirSync(resultsDir).length} archivos` : undefined,
  };
}

function checkRuntimeFiles(ptDevDir: string, verbose: boolean): DoctorCheckResult {
  const name = "runtime-present";

  const mainJs = join(ptDevDir, "main.js");
  const runtimeJs = join(ptDevDir, "runtime.js");

  const files: string[] = [];
  if (existsSync(mainJs)) files.push("main.js");
  if (existsSync(runtimeJs)) files.push("runtime.js");

  if (files.length === 0) {
    return {
      name,
      ok: false,
      severity: "critical",
      message: "Archivos de runtime no encontrados",
      details: 'Ejecuta "pt build" para generar los archivos',
    };
  }
  if (files.length < 2) {
    return {
      name,
      ok: false,
      severity: "warning",
      message: `Runtime parcial: ${files.join(", ")}`,
      details: 'Ejecuta "pt build" para completar',
    };
  }

  return {
    name,
    ok: true,
    severity: "info",
    message: `Archivos de runtime presentes: ${files.join(", ")}`,
    details: verbose ? `Ruta: ${ptDevDir}` : undefined,
  };
}

function checkBridgeQueues(ptDevDir: string, verbose: boolean): DoctorCheckResult {
  const commandsDir = join(ptDevDir, "commands");
  const inFlightDir = join(ptDevDir, "in-flight");
  const deadLetterDir = join(ptDevDir, "dead-letter");

  const queued = existsSync(commandsDir)
    ? readdirSync(commandsDir).filter((f) => f.endsWith(".json")).length
    : 0;
  const inFlight = existsSync(inFlightDir)
    ? readdirSync(inFlightDir).filter((f) => f.endsWith(".json")).length
    : 0;
  const dead = existsSync(deadLetterDir)
    ? readdirSync(deadLetterDir).filter((f) => f.endsWith(".json")).length
    : 0;

  const ok = dead === 0 && inFlight < 10;
  const severity: DoctorCheckResult["severity"] =
    dead > 0 ? "critical" : inFlight > 5 ? "warning" : "info";

  return {
    name: "bridge-queues",
    ok,
    severity,
    message: `Queue: ${queued} queued / ${inFlight} in-flight / ${dead} dead-letter`,
    details: verbose ? JSON.stringify({ queued, inFlight, dead }, null, 2) : undefined,
  };
}

async function checkContextCache(ptDevDir: string, verbose: boolean): Promise<DoctorCheckResult> {
  const status = await loadContextStatus();
  if (!status) {
    return {
      name: "context-cache",
      ok: true,
      severity: "info",
      message: "Cache de contexto no presente (se generará con el próximo comando)",
    };
  }

  const ok = status.bridge.ready || status.topology.materialized;
  return {
    name: "context-cache",
    ok,
    severity: ok ? "info" : "warning",
    message: ok ? "Cache de contexto disponible" : "Cache de contexto todavía en calentamiento",
    details: verbose ? JSON.stringify(status, null, 2) : undefined,
  };
}
