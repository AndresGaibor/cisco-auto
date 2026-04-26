#!/usr/bin/env bun
/**
 * Supervisor de contexto - Fase 3
 * Recolecta resumen desde PTController y persiste un archivo simple de estado
 */

import { type PTController } from "@cisco-auto/pt-control/controller";
import { getContextStatusPath, getContextDir } from "../system/paths.js";
import type { ContextStatus } from "../contracts/context-status.js";
import { computeTopologyHealth } from "./topology-health.js";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { promises as fs } from "node:fs";

export async function collectContextStatus(controller: PTController): Promise<ContextStatus> {
  // Use the cached snapshot only — never send a new command to PT here.
  // This runs in the finally block of runCommand(), after execute() already queried PT.
  // Calling controller.snapshot() again would add another 30s timeout when PT is offline.
  let liveSnapshot = controller.getCachedSnapshot?.() ?? null;

  // Prefer the consolidated system context exposed by PTController (Phase 5)
  const sys = controller.getSystemContext?.() ?? {
    bridgeReady: false,
    topologyMaterialized: false,
    deviceCount: 0,
    linkCount: 0,
    heartbeat: { state: "unknown" as const },
    warnings: [] as string[],
  };
  const bridge = controller.getBridgeStatus?.() ?? {
    ready: false,
    queuedCount: 0,
    inFlightCount: 0,
    warnings: [],
  };

  if (!liveSnapshot && bridge.ready && typeof controller.snapshot === "function") {
    liveSnapshot = await controller.snapshot().catch(() => null);
  }

  const deviceCount = liveSnapshot?.devices
    ? Object.keys(liveSnapshot.devices).length
    : sys.deviceCount;
  const linkCount = liveSnapshot?.links ? Object.keys(liveSnapshot.links).length : sys.linkCount;
  const bridgeReady = bridge.ready && sys.bridgeReady;
  const warnings: string[] = Array.isArray(sys.warnings) ? [...sys.warnings] : [];

  // FORCE MATERIALIZATION: Si hay dispositivos, la topología está materializada aunque el flag diga warming
  const isMaterialized = sys.topologyMaterialized || deviceCount > 0 || Boolean(liveSnapshot);

  const topologyHealth = computeTopologyHealth({
    topologyMaterialized: isMaterialized,
    deviceCount,
    linkCount,
    warnings,
  });

  const now = Date.now();
  const status: ContextStatus = {
    schemaVersion: "1.0",
    updatedAt: new Date().toISOString(),
    mode: bridgeReady ? "active" : "waiting-for-pt",
    gracePeriod: {
      active: !bridgeReady,
      startedAt: new Date(now).toISOString(),
      endsAt: new Date(now).toISOString(),
      remainingMs: 0,
    },
    heartbeat: {
      state: sys.heartbeat.state,
      ageMs: sys.heartbeat.ageMs,
      lastSeenTs: sys.heartbeat.lastSeenTs,
    },
    bridge: {
      ready: bridgeReady,
      queuedCount: bridge.queuedCount,
      inFlightCount: bridge.inFlightCount,
      warnings: bridge.warnings ?? [],
    },
    topology: {
      materialized: isMaterialized,
      deviceCount,
      linkCount,
      health: topologyHealth,
    },
    warnings,
    notes: [
      "Context refreshed from PTController",
      `Snapshot: ${deviceCount} devices / ${linkCount} links`,
      `Bridge: ${bridgeReady ? "ready" : "not ready"}; heartbeat: ${sys.heartbeat.state}`,
    ],
  };

  return status;
}

export async function writeContextStatus(status: ContextStatus): Promise<void> {
  const path = getContextStatusPath();
  try {
    // Ensure dir exists
    const dir = dirname(path);
    mkdirSync(dir, { recursive: true });
    // Atomic-ish write: write to temp then rename
    const tmp = `${path}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(status, null, 2), "utf-8");
    await fs.rename(tmp, path);
  } catch (err) {
    console.warn("No se pudo escribir context-status:", err);
  }
}

export async function loadContextStatus(): Promise<ContextStatus | null> {
  const path = getContextStatusPath();
  try {
    const content = await fs.readFile(path, "utf-8");
    const parsed = JSON.parse(content) as ContextStatus;
    return parsed;
  } catch (err) {
    return null;
  }
}
