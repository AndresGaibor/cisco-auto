#!/usr/bin/env bun
/**
 * Context Supervisor Bootstrap
 *
 * Helpers para que la CLI arranque y gestione el supervisor persistente.
 * - ensureSupervisorRunning(): arrancar si no está corriendo
 * - isSupervisorRunning(): verificar estado
 * - readContextStatus(): leer estado persistido
 */

import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  isSupervisorLocked,
  getRunningPid,
  acquireLock,
} from "./context-supervisor-lock.js";
import { getContextStatusPath } from "./paths.js";
import type { ContextStatus } from "../contracts/context-status.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Verifica si el supervisor está corriendo
 */
export function isSupervisorRunning(): boolean {
  return isSupervisorLocked();
}

/**
 * Lee el estado de contexto persistido
 */
export function readContextStatus(): ContextStatus | null {
  const path = getContextStatusPath();
  if (!existsSync(path)) {
    return null;
  }

  try {
    const content = readFileSync(path, "utf-8");
    return JSON.parse(content) as ContextStatus;
  } catch (e) {
    console.error("[bootstrap] Error leyendo context-status.json:", e);
    return null;
  }
}

/**
 * Obtiene el estado del supervisor
 */
export function getSupervisorPid(): number | null {
  return getRunningPid();
}

/**
 * Arranca el supervisor en background
 * Usa Bun spawn con detached = true
 */
async function launchSupervisor(): Promise<number> {
  return new Promise((resolve, reject) => {
    const supervisorPath = join(__dirname, "context-supervisor-process.ts");

    const child = spawn("bun", ["run", supervisorPath], {
      detached: true,
      stdio: "ignore", // No heredar stdio — supervisor corre 100% en background
      cwd: process.cwd(),
    });

    const pid = child.pid;
    if (!pid) {
      reject(new Error("No se pudo obtener PID del supervisor"));
      return;
    }

    // Desacoplar proceso — el parent puede terminar sin matar el child
    child.unref();

    // Resolvemos inmediatamente — el supervisor adquiere su lock de forma independiente.
    // No hay razón para bloquear la CLI esperando que el supervisor se inicialice.
    resolve(pid);
  });
}

/**
 * Asegura que el supervisor esté corriendo
 * - Si ya corre, no hace nada
 * - Si no corre, lo arranca
 */
export async function ensureSupervisorRunning(): Promise<void> {
  if (isSupervisorRunning()) {
    // Already running — silently return
    return;
  }

  try {
    await launchSupervisor();
    // No logs here — the CLI should be silent on normal operation
  } catch (e) {
    // Don't fail the command if the supervisor can't start
    // The CLI works without it, just without persistent context
  }
}

/**
 * Obtiene información resumida del supervisor
 */
export function getSupervisorStatus(): {
  running: boolean;
  pid: number | null;
  contextStatus: ContextStatus | null;
} {
  return {
    running: isSupervisorRunning(),
    pid: getRunningPid(),
    contextStatus: readContextStatus(),
  };
}

/**
 * Info para logging
 */
export function debugSupervisorInfo(): string {
  const status = getSupervisorStatus();
  return `Supervisor(running=${status.running}, pid=${status.pid}, context=${status.contextStatus?.heartbeat.state ?? "null"})`;
}
