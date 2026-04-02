import { IOSFamily, getDeviceModel, getIosFamilyFromModel, CapabilitySet } from "@cisco-auto/ios-domain";

export interface DeviceCapabilities {
  model: string;
  family: IOSFamily;
  /** Whether device supports switchport trunk encapsulation command (dot1q, isl) */
  supportsTrunkEncapsulationCmd: boolean;
  /** Whether device supports switchport mode trunk */
  supportsTrunkMode: boolean;
  /** Legacy: combined trunk support (encapsulation + mode) */
  supportsTrunkEncapsulation: boolean;
  /** Router subinterfaces (not SVI) - for routers only */
  supportsRouterSubinterfaces: boolean;
  /** Legacy: combined subinterface support */
  supportsSubinterfaces: boolean;
  supportsDot1qEncapsulation: boolean;
  supportsSvi: boolean;
  supportsIpRouting: boolean;
  supportsDhcpRelay: boolean;
  supportsAcl: boolean;
  /** NAT is primarily for routers; L3 switches have limited NAT */
  supportsNat: boolean;
  supportsVlan: boolean;
  maxVlanCount: number;
}

function createRouterCapabilities(model: string): DeviceCapabilities {
  return {
    model,
    family: IOSFamily.ROUTER,
    supportsTrunkEncapsulationCmd: true,
    supportsTrunkMode: true,
    supportsTrunkEncapsulation: true,
    supportsRouterSubinterfaces: true,
    supportsSubinterfaces: true,
    supportsDot1qEncapsulation: true,
    supportsSvi: false,
    supportsIpRouting: true,
    supportsDhcpRelay: true,
    supportsAcl: true,
    supportsNat: true,
    supportsVlan: false,
    maxVlanCount: 0,
  };
}

function createL2SwitchCapabilities(model: string): DeviceCapabilities {
  return {
    model,
    family: IOSFamily.SWITCH_L2,
    supportsTrunkEncapsulationCmd: false,
    supportsTrunkMode: true,
    supportsTrunkEncapsulation: false,
    supportsRouterSubinterfaces: false,
    supportsSubinterfaces: false,
    supportsDot1qEncapsulation: true,
    supportsSvi: false,
    supportsIpRouting: false,
    supportsDhcpRelay: false,
    supportsAcl: true,
    supportsNat: false,
    supportsVlan: true,
    maxVlanCount: 255,
  };
}

function createL3SwitchCapabilities(model: string): DeviceCapabilities {
  return {
    model,
    family: IOSFamily.SWITCH_L3,
    supportsTrunkEncapsulationCmd: true,
    supportsTrunkMode: true,
    supportsTrunkEncapsulation: true,
    /** L3 switches use SVI, not router subinterfaces */
    supportsRouterSubinterfaces: false,
    supportsSubinterfaces: false,
    supportsDot1qEncapsulation: true,
    supportsSvi: true,
    supportsIpRouting: true,
    supportsDhcpRelay: true,
    supportsAcl: true,
    /** L3 switches have limited NAT - prefer router for NAT */
    supportsNat: false,
    supportsVlan: true,
    maxVlanCount: 255,
  };
}

function createUnknownCapabilities(model: string): DeviceCapabilities {
  return {
    model,
    family: IOSFamily.UNKNOWN,
    supportsTrunkEncapsulationCmd: false,
    supportsTrunkMode: false,
    supportsTrunkEncapsulation: false,
    supportsRouterSubinterfaces: false,
    supportsSubinterfaces: false,
    supportsDot1qEncapsulation: false,
    supportsSvi: false,
    supportsIpRouting: false,
    supportsDhcpRelay: false,
    supportsAcl: false,
    supportsNat: false,
    supportsVlan: false,
    maxVlanCount: 0,
  };
}

/**
 * Resolve legacy DeviceCapabilities for a model
 * @deprecated Use resolveCapabilitySet for new code
 */
export function resolveCapabilities(modelId: string): DeviceCapabilities {
  const family = getIosFamilyFromModel(modelId);

  switch (family) {
    case IOSFamily.ROUTER:
      return createRouterCapabilities(modelId);
    case IOSFamily.SWITCH_L2:
      return createL2SwitchCapabilities(modelId);
    case IOSFamily.SWITCH_L3:
      return createL3SwitchCapabilities(modelId);
    case IOSFamily.UNKNOWN:
    default:
      return createUnknownCapabilities(modelId);
  }
}

/**
 * Resolve CapabilitySet for a model (rich capability model)
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

// Re-export CapabilitySet for convenience
export { CapabilitySet } from "@cisco-auto/ios-domain";
