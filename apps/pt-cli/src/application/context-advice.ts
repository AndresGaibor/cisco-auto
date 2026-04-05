/**
 * Traduce el contexto técnico de ejecución a avisos entendibles.
 * Fase 2: reglas simples sin lógica de heartbeat.
 */

import type { CommandRuntimeContext } from './context-inspector.js';

/**
 * Genera warnings legibles basados en el estado del contexto operativo.
 */
export function buildContextWarnings(ctx: CommandRuntimeContext): string[] {
  const warnings: string[] = [];

  if (!ctx.bridgeReady) {
    warnings.push(
      'Bridge no está listo; el comando puede operar con contexto parcial.',
    );
  }

  if (!ctx.topologyMaterialized) {
    warnings.push(
      'Topología virtual aún no materializada; la verificación de estado puede ser incompleta.',
    );
  }

  return warnings;
}
