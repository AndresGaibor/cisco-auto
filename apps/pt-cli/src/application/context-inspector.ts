#!/usr/bin/env bun
/**
 * Inspector de contexto de ejecución para comandos de la CLI.
 * Recolecta el estado operativo del controller/bridge/topología
 * y lo expone como CommandRuntimeContext.
 */

import type { PTController } from '@cisco-auto/pt-control';

export interface CommandRuntimeContext {
  bridgeReady: boolean;
  topologyMaterialized: boolean;
  deviceCount: number;
  linkCount: number;
  heartbeat: {
    state: 'ok' | 'stale' | 'missing' | 'unknown';
    ageMs?: number;
    lastSeenTs?: number;
  };
  bridge: {
    ready: boolean;
    leaseValid?: boolean;
    queuedCount?: number;
    inFlightCount?: number;
    warnings?: string[];
  };
  warnings: string[];
  notes: string[];
}

/**
 * Inspecciona el contexto operativo actual del controller y retorna
 * un resumen con información útil + warnings contextuales.
 */
export async function inspectCommandContext(
  controller: PTController,
): Promise<CommandRuntimeContext> {
  const summary = controller.getContextSummary();
  const heartbeat = controller.getHeartbeatHealth();
  const bridge = controller.getBridgeStatus();
  const warnings: string[] = [];
  const notes: string[] = [];

  if (!summary.bridgeReady) {
    warnings.push('Bridge no está listo; el comando puede operar con contexto parcial.');
    notes.push('El bridge todavía no está listo para una ejecución totalmente confiable.');
  }

  if (!summary.topologyMaterialized) {
    warnings.push('Topología virtual aún no materializada; la verificación de estado puede ser incompleta.');
    notes.push(`Topología en calentamiento: ${summary.deviceCount} dispositivos / ${summary.linkCount} enlaces.`);
  }

  if (heartbeat.state === 'stale') {
    warnings.push('Heartbeat stale; Packet Tracer puede no estar respondiendo.');
  } else if (heartbeat.state === 'missing') {
    warnings.push('Heartbeat missing; Packet Tracer probablemente no está disponible.');
  }

  if (bridge.warnings && bridge.warnings.length > 0) {
    warnings.push(...bridge.warnings);
  }

  notes.push(`Bridge: ${bridge.ready ? 'ready' : 'not ready'}; heartbeat: ${heartbeat.state}`);

  return {
    bridgeReady: summary.bridgeReady,
    topologyMaterialized: summary.topologyMaterialized,
    deviceCount: summary.deviceCount,
    linkCount: summary.linkCount,
    heartbeat,
    bridge: {
      ready: bridge.ready,
      leaseValid: bridge.leaseValid,
      queuedCount: bridge.queuedCount,
      inFlightCount: bridge.inFlightCount,
      warnings: bridge.warnings ?? [],
    },
    warnings,
    notes,
  };
}
