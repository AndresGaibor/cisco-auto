#!/usr/bin/env bun
/**
 * Supervisor de contexto - Fase 3
 * Recolecta resumen desde PTController y persiste un archivo simple de estado
 */

import type { PTController } from '@cisco-auto/pt-control';
import { getContextStatusPath, getContextDir } from '../system/paths.js';
import type { ContextStatus } from '../contracts/context-status.js';
import { computeTopologyHealth } from './topology-health.js';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { promises as fs } from 'node:fs';

export async function collectContextStatus(controller: PTController): Promise<ContextStatus> {
  // Refrescar el estado vivo antes de consolidar el contexto persistido
  let liveSnapshot: Awaited<ReturnType<PTController['snapshot']>> | null = null;
  try {
    liveSnapshot = await controller.snapshot();
  } catch {
    // Si la snapshot viva falla, seguimos con el contexto disponible
  }

  // Prefer the consolidated system context exposed by PTController (Phase 5)
  const sys = controller.getSystemContext();
  const deviceCount = liveSnapshot?.devices ? Object.keys(liveSnapshot.devices).length : sys.deviceCount;
  const linkCount = liveSnapshot?.links ? Object.keys(liveSnapshot.links).length : sys.linkCount;

  const warnings: string[] = Array.isArray(sys.warnings) ? [...sys.warnings] : [];

  const topologyHealth = computeTopologyHealth({
    topologyMaterialized: sys.topologyMaterialized,
    deviceCount: sys.deviceCount,
    linkCount: sys.linkCount,
    warnings,
  });

  const status: ContextStatus = {
    schemaVersion: '1.0',
    updatedAt: new Date().toISOString(),
    heartbeat: {
      state: sys.heartbeat.state,
      ageMs: sys.heartbeat.ageMs,
      lastSeenTs: sys.heartbeat.lastSeenTs,
    },
    bridge: {
      ready: sys.bridgeReady,
    },
    topology: {
      materialized: sys.topologyMaterialized || Boolean(liveSnapshot),
      deviceCount,
      linkCount,
      health: topologyHealth,
    },
    warnings,
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
    await fs.writeFile(tmp, JSON.stringify(status, null, 2), 'utf-8');
    await fs.rename(tmp, path);
  } catch (err) {
    console.warn('No se pudo escribir context-status:', err);
  }
}

export async function loadContextStatus(): Promise<ContextStatus | null> {
  const path = getContextStatusPath();
  try {
    const content = await fs.readFile(path, 'utf-8');
    const parsed = JSON.parse(content) as ContextStatus;
    return parsed;
  } catch (err) {
    return null;
  }
}
