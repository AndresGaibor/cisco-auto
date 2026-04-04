// ============================================================================
// PT Runtime Value Objects - Exports
// ============================================================================

export {
  DeviceName,
  parseDeviceName,
  tryParseDeviceName,
  isValidDeviceName,
} from "./device-name.js";

export {
  InterfaceName,
  parseInterfaceName,
  tryParseInterfaceName,
  isValidInterfaceName,
  type InterfaceType,
} from "./interface-name.js";

export {
  SessionMode,
  parseSessionMode,
  inferSessionMode,
  isValidSessionMode,
  type IosMode,
} from "./session-mode.js";

export {
  CableType,
  parseCableType,
  parseCableTypeId,
  getCableTypeId,
  getCableTypeName,
  isValidCableType,
  isValidCableTypeId,
  CABLE_TYPE_IDS,
  CABLE_RECOMMENDATIONS,
  type CableTypeName,
} from "./cable-type.js";

export {
  PT_MODEL_MAP,
  PT_DEVICE_TYPE_MAP,
  getPTDeviceType,
  validatePTModel,
  getAllValidModels,
} from "./validated-models.js";
