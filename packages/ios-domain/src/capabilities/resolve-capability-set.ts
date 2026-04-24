import { IOSFamily, getIosFamilyFromModel } from "./device-capabilities.js";
import { CapabilitySet } from "./capability-set.js";

/**
 * Resuelve el CapabilitySet completo para un modelId dado.
 * Usa el catálogo de dispositivos para determinar la familia y luego
 * construye el conjunto de capabilities apropiado.
 * @param modelId - Identificador del modelo (e.g., "1941", "2960-24TT")
 * @returns CapabilitySet con todas las capabilities del dispositivo
 */
export function resolveCapabilitySet(modelId: string): CapabilitySet {
  const family = getIosFamilyFromModel(modelId);

  switch (family) {
    case IOSFamily.ROUTER:
      return CapabilitySet.router(modelId);
    case IOSFamily.SWITCH_L2:
      return CapabilitySet.l2Switch(modelId);
    case IOSFamily.SWITCH_L3:
      return CapabilitySet.l3Switch(modelId);
    case IOSFamily.UNKNOWN:
    default:
      return CapabilitySet.unknown(modelId);
  }
}
