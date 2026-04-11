#!/usr/bin/env bun
/**
 * Context Supervisor Lock Manager
 *
 * Maneja PID y lock para evitar múltiples supervisores ejecutándose.
 * - Verifica si el supervisor anterior sigue vivo
 * - Limpia lock si el PID es stale
 * - Permite arrancar nuevo supervisor
 */

import { existsSync, readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { getContextDir } from "./paths.js";

interface LockInfo {
  pid: number;
  timestamp: number;
  version: "1.0";
}

const LOCK_FILE = "context-supervisor.pid";
const LOCK_STALE_MS = 60000; // 60 segundos sin actualizar = stale

/**
 * Obtiene la ruta del archivo de lock
 */
function getLockPath(): string {
  return join(getContextDir(), LOCK_FILE);
}

/**
 * Verifica si un PID sigue vivo
 */
function isPidAlive(pid: number): boolean {
  try {
    // En Unix, enviar señal 0 es un test sin efectos
    // En Windows, usamos tasklist para verificar
    if (process.platform === "win32") {
      const { execSync } = require("child_process");
      try {
        execSync(`tasklist /FI "PID eq ${pid}"`, { stdio: "pipe" });
        return true;
      } catch {
        return false;
      }
    } else {
      // Unix: usar kill con signal 0
      process.kill(pid, 0);
      return true;
    }
  } catch {
    return false;
  }
}

/**
 * Lee la información de lock actual
 */
export function readLock(): LockInfo | null {
  const path = getLockPath();
  if (!existsSync(path)) {
    return null;
  }

  try {
    const content = readFileSync(path, "utf-8");
    return JSON.parse(content) as LockInfo;
  } catch {
    return null;
  }
}

/**
 * Verifica si hay un supervisor vivo ya corriendo
 */
export function isSupervisorLocked(): boolean {
  const lock = readLock();
  if (!lock) {
    return false;
  }

  // Verificar si es reciente (no stale)
  const ageMs = Date.now() - lock.timestamp;
  if (ageMs > LOCK_STALE_MS) {
    // Lock es stale, limpiar
    try {
      unlinkSync(getLockPath());
    } catch {
      // Ignorar si ya fue eliminado
    }
    return false;
  }

  // Verificar si el PID sigue vivo
  if (!isPidAlive(lock.pid)) {
    try {
      unlinkSync(getLockPath());
    } catch {
      // Ignorar
    }
    return false;
  }

  return true;
}

/**
 * Escribe lock con el PID actual
 */
export function acquireLock(): void {
  const path = getLockPath();
  const lockInfo: LockInfo = {
    pid: process.pid,
    timestamp: Date.now(),
    version: "1.0",
  };

  writeFileSync(path, JSON.stringify(lockInfo, null, 2), "utf-8");
}

/**
 * Actualiza el timestamp del lock (heartbeat del proceso supervisor)
 */
export function updateLock(): void {
  const lock = readLock();
  if (!lock) {
    acquireLock();
    return;
  }

  // Solo actualizar si es nuestro PID
  if (lock.pid === process.pid) {
    lock.timestamp = Date.now();
    const path = getLockPath();
    writeFileSync(path, JSON.stringify(lock, null, 2), "utf-8");
  }
}

/**
 * Limpia el lock (llamar al apagarse)
 */
export function releaseLock(): void {
  const path = getLockPath();
  try {
    if (existsSync(path)) {
      unlinkSync(path);
    }
  } catch {
    // Ignorar errores al limpiar
  }
}

/**
 * Obtiene el PID del supervisor que está corriendo (si existe)
 */
export function getRunningPid(): number | null {
  const lock = readLock();
  if (!lock) {
    return null;
  }

  if (isPidAlive(lock.pid)) {
    return lock.pid;
  }

  return null;
}
