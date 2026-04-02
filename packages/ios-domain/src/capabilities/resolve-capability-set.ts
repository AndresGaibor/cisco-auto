import { IOSFamily, getIosFamilyFromModel } from "./device-capabilities.js";
import { CapabilitySet } from "./capability-set.js";

/**
 * Resolve a rich CapabilitySet for a model.
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
