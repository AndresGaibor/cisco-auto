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
      stdio: "ignore", // No heredar stdio para que pueda morir independientemente
      cwd: process.cwd(),
    });

    const pid = child.pid;
    if (!pid) {
      reject(new Error("No se pudo obtener PID del supervisor"));
      return;
    }

    // Desacoplar proceso - permitir que el parent muera sin matar el child
    child.unref();

    // Dar tiempo para que el supervisor adquiera el lock y el lease
    setTimeout(() => {
      resolve(pid);
    }, 2000);
  });
}

/**
 * Asegura que el supervisor esté corriendo
 * - Si ya corre, no hace nada
 * - Si no corre, lo arranca
 */
export async function ensureSupervisorRunning(): Promise<void> {
  // Verificar si ya está corriendo
  if (isSupervisorRunning()) {
    console.debug("[bootstrap] Supervisor ya está corriendo");
    return;
  }

  console.debug("[bootstrap] Arrancando supervisor...");

  try {
    const pid = await launchSupervisor();
    console.debug(`[bootstrap] Supervisor arrancado con PID ${pid}`);
  } catch (e) {
    console.warn("[bootstrap] Error arrancando supervisor:", e);
    // No fallar completamente, la CLI puede funcionar sin supervisor
    // aunque el contexto no sea persistente
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
