import { DEVICE_TYPES, MODEL_ALIASES } from "./constants.js";
import { validatePTModel, getPTDeviceType } from "../value-objects/validated-models.js";
import type { PTLogicalWorkspace, PTNetwork, PTDevice } from "../pt-api/pt-api-registry.js";

/** Resolve model name from alias or return as-is */
export function resolveModel(model: string | undefined): string {
  if (!model) return "1941";
  const key = model.toLowerCase();

  if (key in MODEL_ALIASES) {
    model = MODEL_ALIASES[key];
  }

  try {
    return validatePTModel(model);
  } catch (error) {
    throw new Error(
      `Invalid device model: "${model}". Check packages/core/src/catalog/ for valid models.`,
    );
  }
}

/** Get device type ID for a model name - uses validated catalog */
export function getDeviceTypeForModel(model: string): number {
  try {
    return getPTDeviceType(model) ?? DEVICE_TYPES.router;
  } catch {
    return DEVICE_TYPES.router;
  }
}

/** Get list of device type candidates to try (fallback mechanism) */
export function getDeviceTypeCandidates(model: string): number[] {
  const normalized = (model || "").toLowerCase();

  if (
    normalized.indexOf("2960") === 0 ||
    normalized.indexOf("3560") === 0 ||
    normalized.indexOf("switch") >= 0
  ) {
    return [DEVICE_TYPES.switch, DEVICE_TYPES.router];
  }

  if (normalized.indexOf("pc") === 0 || normalized.indexOf("laptop") === 0) {
    const candidates: number[] = [DEVICE_TYPES.pc];
    for (let t = 8; t <= 60; t++) {
      if (!candidates.includes(t)) candidates.push(t);
    }
    return candidates;
  }

  if (normalized.indexOf("server") === 0) {
    const candidates: number[] = [DEVICE_TYPES.server];
    for (let t = 8; t <= 60; t++) {
      if (!candidates.includes(t)) candidates.push(t);
    }
    return candidates;
  }

  return [DEVICE_TYPES.router, DEVICE_TYPES.switch, DEVICE_TYPES.pc];
}

/** Result of device creation with fallback */
export interface CreateDeviceResult {
  autoName: string;
  device: PTDevice;
  typeId: number;
}

/** Create device with fallback mechanism - tries multiple device types */
export function createDeviceWithFallback(
  model: string,
  x: number,
  y: number,
  typeList: number[],
  lw: PTLogicalWorkspace,
  net: PTNetwork,
): CreateDeviceResult | null {
  for (const typeId of typeList) {
    const autoName = lw.addDevice(typeId, model, x, y);
    if (!autoName) continue;

    const device = net.getDevice(autoName);
    if (!device) {
      lw.removeDevice(autoName);
      continue;
    }

    let deviceModel = "";
    try {
      deviceModel = (device.getModel && device.getModel()) || "";
    } catch {
      // PT API puede fallar en getModel, continuar sin modelo
    }

    if (deviceModel && deviceModel.toLowerCase() === model.toLowerCase()) {
      return { autoName, device, typeId };
    }

    lw.removeDevice(autoName);
  }
  return null;
}

/** Convert device type number to string (DeviceType enum value) */
export function getDeviceTypeString(typeId: number): string {
  const typeMap: Record<number, string> = {
    [DEVICE_TYPES.router]: "router",
    [DEVICE_TYPES.switch]: "switch",
    [DEVICE_TYPES.hub]: "generic",
    [DEVICE_TYPES.pc]: "pc",
    [DEVICE_TYPES.server]: "server",
    [DEVICE_TYPES.printer]: "generic",
    [DEVICE_TYPES.wireless]: "access_point",
    [DEVICE_TYPES.cloud]: "cloud",
  };
  return typeMap[typeId] || "generic";
}
