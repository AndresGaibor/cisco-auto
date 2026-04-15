#!/usr/bin/env bun
/**
 * Context Supervisor Process
 *
 * Proceso separado que:
 * - Mantiene vivo PTController y TopologyCache
 * - Recolecta contexto y health
 * - Escribe context-status.json
 * - Se auto-apaga cuando heartbeat es stale/missing
 *
 * Loop cada 3-5 segundos.
 */

import { FileBridgeV2 } from "@cisco-auto/file-bridge";
import { PTController } from "@cisco-auto/pt-control";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { ContextStatus } from "../contracts/context-status.js";
import { getDefaultDevDir, getContextStatusPath, getContextDir } from "./paths.js";
import {
  acquireLock,
  updateLock,
  releaseLock,
} from "./context-supervisor-lock.js";

const LOOP_INTERVAL_MS = 4000; // 4 segundos
const HEARTBEAT_STALE_MS = 15000; // 15 segundos sin actualización
const FAILURE_THRESHOLD = 3; // Apagar después de 3 ciclos seguidos fallando

// Grace periods para esperar a que PT conecte
const STARTUP_GRACE_PERIOD_MS = 120000; // 2 minutos al inicio
const POST_DISCONNECT_GRACE_MS = 60000; // 1 minuto después de desconectar PT

// Link sync cada 10 ciclos = 40 segundos
const LINK_SYNC_INTERVAL_CYCLES = 10;

interface SupervisorState {
  startedAt: number;
  inGracePeriod: boolean;
  gracePeriodEndsAt: number;
  consecutiveHeartbeatFailures: number;
  consecutiveBridgeFailures: number;
  lastHealthyTs: number;
  ptWasConnected: boolean;
  lastLinkCount: number;
}

let state: SupervisorState = {
  startedAt: Date.now(),
  inGracePeriod: true,
  gracePeriodEndsAt: Date.now() + STARTUP_GRACE_PERIOD_MS,
  consecutiveHeartbeatFailures: 0,
  consecutiveBridgeFailures: 0,
  lastHealthyTs: Date.now(),
  ptWasConnected: false,
  lastLinkCount: 0,
};

let running = true;
let controller: PTController | null = null;
let supervisorDevDir = getDefaultDevDir();
let cycleCount = 0;

/**
 * Maneja salida limpia del proceso
 */
function setupSignalHandlers() {
  const cleanup = async () => {
    console.log("[supervisor] Señal recibida, apagando...");
    running = false;

    if (controller) {
      try {
        await controller.stop();
      } catch (e) {
        console.error("[supervisor] Error al detener controller:", e);
      }
    }

    releaseLock();
    process.exit(0);
  };

  process.on("SIGTERM", cleanup);
  process.on("SIGINT", cleanup);
  process.on("SIGHUP", cleanup);
}

async function restartController(reason: string): Promise<void> {
  console.log(`[supervisor] Reiniciando controller (${reason})...`);
  try {
    if (controller) {
      await controller.stop();
    }
  } catch (e) {
    console.error("[supervisor] Error al detener controller para reinicio:", e);
  }

  controller = new PTController({ devDir: supervisorDevDir });
  await controller.start();
  state.consecutiveHeartbeatFailures = 0;
  state.consecutiveBridgeFailures = 0;
  state.lastHealthyTs = Date.now();
  console.log("[supervisor] Controller reiniciado");
}

/**
 * Recolecta health del heartbeat
 */
async function collectHeartbeatHealth(): Promise<Pick<ContextStatus["heartbeat"], "state" | "ageMs" | "lastSeenTs">> {
  try {
    if (!controller) {
      return { state: "unknown" };
    }

    // Prefer PTController facade for heartbeat health (Phase 5)
    const hbHealth = controller.getHeartbeatHealth();
    return {
      state: hbHealth.state,
      ageMs: hbHealth.ageMs,
      lastSeenTs: hbHealth.lastSeenTs,
    };
  } catch (e) {
    console.error("[supervisor] Error recolectando heartbeat:", e);
    return { state: "unknown" };
  }
}

/**
 * Recolecta health de la topología
 */
async function collectTopologyHealth(): Promise<ContextStatus["topology"]> {
  try {
    if (!controller) {
      return {
        materialized: false,
        deviceCount: 0,
        linkCount: 0,
        health: "unknown",
      };
    }

    // Use cached snapshot when available, otherwise request a fresh one
    const cached = controller.getCachedSnapshot();
    const snapshot = cached ?? (await controller.snapshot());
    const materialized = !!snapshot;

    if (!materialized) {
      return {
        materialized: false,
        deviceCount: 0,
        linkCount: 0,
        health: "warming",
      };
    }

    const deviceCount = Object.keys(snapshot.devices ?? {}).length;
    const linkCount = Object.keys(snapshot.links ?? {}).length;

    const health = deviceCount > 0 ? "healthy" : "warming";

    return {
      materialized,
      deviceCount,
      linkCount,
      health,
    };
  } catch (e) {
    console.error("[supervisor] Error recolectando topología:", e);
    return {
      materialized: false,
      deviceCount: 0,
      linkCount: 0,
      health: "unknown",
    };
  }
}

/**
 * Recolecta health del bridge
 */
async function collectBridgeHealth(): Promise<ContextStatus["bridge"]> {
  try {
    if (!controller) {
      return { ready: false };
    }

    return controller.getBridgeStatus();
  } catch (e) {
    console.error("[supervisor] Error recolectando bridge health:", e);
    return { ready: false };
  }
}

/**
 * Escribe context-status.json
 */
function writeContextStatus(status: ContextStatus) {
  try {
    const dir = getContextDir();
    mkdirSync(dir, { recursive: true });

    const path = getContextStatusPath();
    writeFileSync(path, JSON.stringify(status, null, 2), "utf-8");

    console.log(
      `[supervisor] Context status actualizado: heartbeat=${status.heartbeat.state}, topology=${status.topology.health}`
    );
  } catch (e) {
    console.error("[supervisor] Error escribiendo context-status.json:", e);
  }
}

/**
 * Sincroniza links.json con la topología actual de PT
 */
async function syncLinksFromPT(): Promise<void> {
  if (!controller) return;

  try {
    const cached = controller.getCachedSnapshot();
    if (!cached) {
      dprint("[supervisor] No cached snapshot available for link sync");
      return;
    }

    const currentLinkCount = Object.keys(cached.links || {}).length;

    if (currentLinkCount === state.lastLinkCount) {
      dprint("[supervisor] Link count unchanged (" + currentLinkCount + "), skipping sync");
      return;
    }

    dprint("[supervisor] Link count changed: " + state.lastLinkCount + " -> " + currentLinkCount + ", syncing...");

    const bridge = controller.getBridge();
    const result = await bridge.sendCommandAndWait('syncLinks', {
      links: cached.links,
    }, 10000);

    const value = result?.value;
    if (value?.ok) {
      console.log(
        "[supervisor] Links synced: +" + (value.added || 0) + " added, -" + (value.removed || 0) + " removed, total=" + (value.totalLinks || 0)
      );
    } else {
      console.error("[supervisor] Link sync failed: " + (value?.error || 'unknown error'));
    }

    state.lastLinkCount = currentLinkCount;
  } catch (e) {
    console.error("[supervisor] Error syncing links:", e);
  }
}

/**
 * Recolecta y escribe el estado completo
 */
async function cycle() {
  try {
    cycleCount++;

    // Recolectar todos los datos
    const heartbeat = await collectHeartbeatHealth();
    const topology = await collectTopologyHealth();
    const bridge = await collectBridgeHealth();

    const now = Date.now();
    const elapsedSinceStart = now - state.startedAt;
    const inGracePeriod = state.inGracePeriod && now < state.gracePeriodEndsAt;

    // Sync links cada N ciclos (solo fuera del grace period)
    if (!inGracePeriod && cycleCount % LINK_SYNC_INTERVAL_CYCLES === 0) {
      await syncLinksFromPT();
    }

    // Detectar conexión/desconexión de PT
    const ptJustConnected = heartbeat.state === "ok" && !state.ptWasConnected;
    const ptJustDisconnected = heartbeat.state !== "ok" && state.ptWasConnected;

    if (ptJustConnected) {
      state.ptWasConnected = true;
      state.inGracePeriod = false;
      state.consecutiveHeartbeatFailures = 0;
      state.consecutiveBridgeFailures = 0;
      state.lastHealthyTs = now;
      console.log("[supervisor] PT connected, exiting grace period");
    }

    if (ptJustDisconnected) {
      state.ptWasConnected = false;
      state.inGracePeriod = true;
      state.gracePeriodEndsAt = now + POST_DISCONNECT_GRACE_MS;
      console.log("[supervisor] PT disconnected, entering grace period");
    }

    // Calcular grace period remaining para logging
    const graceRemainingSec = inGracePeriod 
      ? Math.round((state.gracePeriodEndsAt - now) / 1000) 
      : 0;

    // Actualizar contadores de fallos (solo fuera del grace period)
    if (!inGracePeriod) {
      if (heartbeat.state !== "ok") {
        state.consecutiveHeartbeatFailures++;
      } else {
        state.consecutiveHeartbeatFailures = 0;
      }

      if (!bridge.ready || bridge.leaseValid === false) {
        state.consecutiveBridgeFailures++;
      } else {
        state.consecutiveBridgeFailures = 0;
      }
    }

    // Compilar estado
    const status: ContextStatus = {
      schemaVersion: "1.0",
      updatedAt: new Date().toISOString(),
      mode: inGracePeriod 
        ? "waiting-for-pt" 
        : (heartbeat.state === "ok" ? "active" : "shutting-down"),
      gracePeriod: {
        active: inGracePeriod,
        startedAt: new Date(state.startedAt).toISOString(),
        endsAt: new Date(state.gracePeriodEndsAt).toISOString(),
        remainingMs: inGracePeriod ? Math.max(0, state.gracePeriodEndsAt - now) : 0,
      },
      heartbeat,
      bridge,
      topology,
      warnings: inGracePeriod
        ? [`Waiting for PT (${Math.round(elapsedSinceStart / 1000)}s / ${STARTUP_GRACE_PERIOD_MS / 1000}s grace period)`]
        : (heartbeat.state === "stale" ? ["Heartbeat stale - PT no responde"] : []),
      notes: [
        `Supervisor PID: ${process.pid}`,
        `Health: ${state.consecutiveHeartbeatFailures} HB fails, ${state.consecutiveBridgeFailures} bridge fails`,
        inGracePeriod ? `Grace period: ${graceRemainingSec}s remaining` : "Grace period: inactive",
      ],
    };

    writeContextStatus(status);

    // Actualizar lock del supervisor
    updateLock();

    // Decidir si continuar
    if (inGracePeriod) {
      // Durante grace period: no apagar, mantener bridge vivo
      if (graceRemainingSec > 0 && graceRemainingSec % 30 === 0) {
        console.log(
          `[supervisor] Grace period active (${graceRemainingSec}s remaining), waiting for PT...`
        );
      }
    } else {
      // Fuera del grace period: comportamiento normal
      if (bridge.leaseValid === false) {
        console.log("[supervisor] Lease inválida, reiniciando controller...");
        try {
          await restartController("lease-invalid");
        } catch (e) {
          console.error("[supervisor] No se pudo reiniciar el controller:", e);
          running = false;
        }
      } else if (state.consecutiveBridgeFailures >= FAILURE_THRESHOLD) {
        console.log(
          `[supervisor] Bridge inestable, reiniciando controller (failures: ${state.consecutiveBridgeFailures})`
        );
        try {
          await restartController("bridge-failures");
        } catch (e) {
          console.error("[supervisor] No se pudo reiniciar el controller:", e);
          running = false;
        }
      } else if (state.consecutiveHeartbeatFailures >= FAILURE_THRESHOLD) {
        console.log(
          `[supervisor] PT no disponible después del grace period, apagando (failures: ${state.consecutiveHeartbeatFailures})`
        );
        running = false;
      }
    }
  } catch (e) {
    console.error("[supervisor] Error en cycle:", e);
  }
}

/**
 * Loop principal del supervisor
 */
async function mainLoop() {
  while (running) {
    await cycle();

    if (!running) {
      break;
    }

    // Esperar antes del próximo ciclo
    await new Promise((resolve) => setTimeout(resolve, LOOP_INTERVAL_MS));
  }

  // Limpieza final
  if (controller) {
    try {
      await controller.stop();
    } catch (e) {
      console.error("[supervisor] Error al detener controller:", e);
    }
  }

  releaseLock();
  console.log("[supervisor] Proceso terminado");
  process.exit(0);
}

/**
 * Inicia el supervisor
 */
async function start() {
  setupSignalHandlers();

  try {
    acquireLock();
    console.log(
      `[supervisor] Supervisor iniciado con PID ${process.pid}`
    );

    supervisorDevDir = getDefaultDevDir();
    console.log(`[supervisor] Usando devDir: ${supervisorDevDir}`);

    controller = new PTController({ devDir: supervisorDevDir });
    await controller.start();

    console.log("[supervisor] Controller iniciado, comenzando loop principal");

    await mainLoop();
  } catch (e) {
    console.error("[supervisor] Error fatal:", e);
    releaseLock();
    process.exit(1);
  }
}

start();
