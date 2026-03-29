import { IOSFamily, getDeviceModel, getIosFamilyFromModel } from "./device-capabilities";

export interface DeviceCapabilities {
  model: string;
  family: IOSFamily;
  supportsTrunkEncapsulation: boolean;
  supportsSubinterfaces: boolean;
  supportsDot1qEncapsulation: boolean;
  supportsSvi: boolean;
  supportsIpRouting: boolean;
  supportsDhcpRelay: boolean;
  supportsAcl: boolean;
  supportsNat: boolean;
  supportsVlan: boolean;
  maxVlanCount: number;
}

function createRouterCapabilities(model: string): DeviceCapabilities {
  return {
    model,
    family: IOSFamily.ROUTER,
    supportsTrunkEncapsulation: true,
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
    supportsTrunkEncapsulation: false,
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
    supportsTrunkEncapsulation: true,
    supportsSubinterfaces: true,
    supportsDot1qEncapsulation: true,
    supportsSvi: true,
    supportsIpRouting: true,
    supportsDhcpRelay: true,
    supportsAcl: true,
    supportsNat: true,
    supportsVlan: true,
    maxVlanCount: 255,
  };
}

function createUnknownCapabilities(model: string): DeviceCapabilities {
  return {
    model,
    family: IOSFamily.UNKNOWN,
    supportsTrunkEncapsulation: false,
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
