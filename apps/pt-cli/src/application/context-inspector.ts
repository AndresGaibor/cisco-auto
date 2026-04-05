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
  warnings: string[];
}

/**
 * Inspecciona el contexto operativo actual del controller y retorna
 * un resumen con información útil + warnings contextuales.
 */
export async function inspectCommandContext(
  controller: PTController,
): Promise<CommandRuntimeContext> {
  const summary = controller.getContextSummary();
  const warnings: string[] = [];

  if (!summary.bridgeReady) {
    warnings.push('Bridge no está listo; el comando puede operar con contexto parcial.');
  }

  if (!summary.topologyMaterialized) {
    warnings.push('Topología virtual aún no materializada; la verificación de estado puede ser incompleta.');
  }

  return {
    bridgeReady: summary.bridgeReady,
    topologyMaterialized: summary.topologyMaterialized,
    deviceCount: summary.deviceCount,
    linkCount: summary.linkCount,
    warnings,
  };
}
