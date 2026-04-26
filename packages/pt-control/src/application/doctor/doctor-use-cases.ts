/**
 * Doctor use cases - Pure filesystem checks for system diagnostics.
 * These functions are synchronous and require no PT controller access.
 */

import { existsSync, readdirSync, statSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import type { DoctorCheckResult, DoctorPaths } from "./doctor-types.js";

/**
 * Check if the pt-dev directory exists and is accessible.
 */
export function checkPtDevDirectory(ptDevDir: string, _verbose: boolean): DoctorCheckResult {
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
      details: `Modo: ${statSync(ptDevDir).mode.toString(8)}`,
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

/**
 * Check if the logs directory exists and is writable.
 * Creates it if missing.
 */
export function checkLogDirectory(logsDir: string, _verbose: boolean): DoctorCheckResult {
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
    details: `${readdirSync(logsDir).length} archivos`,
  };
}

/**
 * Check if the history directory exists and is writable.
 * Creates it if missing.
 */
export function checkHistoryDirectory(historyDir: string, _verbose: boolean): DoctorCheckResult {
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
    details: `${readdirSync(historyDir).length} archivos`,
  };
}

/**
 * Check if the results directory exists and is writable.
 * Creates it if missing.
 */
export function checkResultsDirectory(resultsDir: string, _verbose: boolean): DoctorCheckResult {
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
    details: `${readdirSync(resultsDir).length} archivos`,
  };
}

/**
 * Check if runtime files (main.js and runtime.js) exist in pt-dev.
 */
export function checkRuntimeFiles(ptDevDir: string, _verbose: boolean): DoctorCheckResult {
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
    details: `Ruta: ${ptDevDir}`,
  };
}

/**
 * Check bridge queues (commands, in-flight, dead-letter).
 */
export function checkBridgeQueues(ptDevDir: string, _verbose: boolean): DoctorCheckResult {
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
    details: JSON.stringify({ queued, inFlight, dead }, null, 2),
  };
}

/**
 * Run all filesystem-based doctor checks.
 */
export function runDoctorFsChecks(
  paths: DoctorPaths,
  verbose: boolean,
): DoctorCheckResult[] {
  const { ptDevDir, logsDir, historyDir, resultsDir } = paths;

  return [
    checkPtDevDirectory(ptDevDir, verbose),
    checkLogDirectory(logsDir, verbose),
    checkHistoryDirectory(historyDir, verbose),
    checkResultsDirectory(resultsDir, verbose),
    checkRuntimeFiles(ptDevDir, verbose),
    checkBridgeQueues(ptDevDir, verbose),
  ];
}

/**
 * Run all doctor checks including controller-based health checks.
 */
export async function runAllDoctorChecks(
  controller: {
    getHeartbeat: () => unknown;
    getHeartbeatHealth: () => { state: string; ageMs?: number };
    getSystemContext: () => {
      bridgeReady: boolean;
      topologyMaterialized: boolean;
      deviceCount: number;
      linkCount: number;
      heartbeat: { state: string; ageMs?: number; lastSeenTs?: number };
      warnings: string[];
    };
  },
  paths: DoctorPaths,
  verbose: boolean,
): Promise<DoctorCheckResult[]> {
  const checks = runDoctorFsChecks(paths, verbose);

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