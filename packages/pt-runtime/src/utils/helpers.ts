// ============================================================================
// Runtime Helpers - Pure utility functions
// Re-exporta tipos desde pt-api-registry y pt-processes para mantener compatibilidad
// ============================================================================

import { DEVICE_TYPES, MODEL_ALIASES } from "./constants.js";
import { validatePTModel, getPTDeviceType } from "../value-objects/validated-models.js";
import type { DeviceName } from "../value-objects/device-name.js";
import type { InterfaceName } from "../value-objects/interface-name.js";
import type { SessionMode } from "../value-objects/session-mode.js";
import type { CableType } from "../value-objects/cable-type.js";
import type { PtDeps } from "../pt-api/pt-deps.js";
import type { PtResult } from "../pt-api/pt-results.js";
import type {
  PTLogicalWorkspace,
  PTNetwork,
  PTDevice,
  PTPort,
  PTCommandLine,
  PTLink,
  PTIpc,
  PTAppWindow,
  PTWorkspace,
  PTFileManager,
  PTGlobalScope,
} from "../pt-api/pt-api-registry";

export type {
  PTLogicalWorkspace,
  PTNetwork,
  PTDevice,
  PTPort,
  PTCommandLine,
  PTLink,
} from "../pt-api/pt-api-registry";

export type {
  PTIpc,
  PTAppWindow,
  PTWorkspace,
  PTFileManager,
  PTGlobalScope,
} from "../pt-api/pt-api-registry";

export {
  PT_API_METHOD_INDEX,
  PT_DEVICE_TYPE_CONSTANTS,
  PT_CABLE_TYPE_CONSTANTS,
} from "../pt-api/pt-api-registry";

// ============================================================================
// Re-exportar tipos de procesos desde pt-processes
// ============================================================================

import type {
  PTDhcpServerMainProcess,
  PTDhcpServerProcess,
  PTDhcpPoolProcess,
  PTDhcpLease,
  PTVlanManager,
  PTDeviceWithProcesses,
} from "../pt-api/pt-processes.js";
import type { PTHostPort } from "../pt-api/pt-processes.js";

export type {
  PTDhcpServerMainProcess,
  PTDhcpServerProcess,
  PTDhcpPoolProcess,
  PTDhcpLease,
  PTVlanManager,
  PTHostPort,
  PTDeviceWithProcesses,
};

export { PT_PROCESS_NAMES } from "../pt-api/pt-processes.js";
export {
  getProcessByName,
  getProcessByCandidates,
  getDhcpServerMainProcess,
  getVlanManager,
  ptHasMethod,
  ptSafeGet,
} from "../pt-api/pt-processes.js";

// Tipos únicos de helpers (no duplicados en pt-processes)

/** Port interface extendido con métodos adicionales para backward compatibility */
export interface PTPortExtended {
  getName(): string;
  getIpAddress(): string;
  getSubnetMask(): string;
  getMacAddress(): string;
  getDefaultGateway(): string;
  setIpSubnetMask(ip: string, mask: string): void;
  setDefaultGateway(gw: string): void;
  setDnsServerIp(dns: string): void;
  setDhcpEnabled(enabled: boolean): void;
  getLink(): unknown;
}

/** PC/Server device interface with DHCP flag (PT official API) */
export interface PTPcLikeDevice extends PTDevice {
  setDhcpFlag(enabled: boolean): void;
  getDhcpFlag(): boolean;
}

/** Router Port interface (extends HostPort for IP config) (PT official API) */
export interface PTRouterPort extends PTHostPort {}
// PTHostPort viene re-exportado desde pt-processes.js y está disponible vía el export type de arriba

/** Normalize a port name for comparison across interface families. */
function normalizePortKey(name: string): string {
  const value = String(name || "")
    .replace(/\s+/g, "")
    .toLowerCase();
  const suffix = value.match(/(\d+(?:\/\d+)*(?:\.\d+)?)$/);
  return suffix ? suffix[1] : value;
}

/** Get the available port names for a device. */
export function getDevicePortNames(device: PTDevice): string[] {
  const names: string[] = [];
  const count = device.getPortCount?.() ?? 0;

  for (let i = 0; i < count; i++) {
    const port = device.getPortAt(i);
    if (port) {
      const portName = port.getName?.();
      if (portName) names.push(String(portName));
    }
  }

  return names;
}

/** Resolve a requested port name against the device ports.
 * Two-pass strategy:
 * - Pass 1: exact match across ALL ports (case-insensitive, whitespace-normalized)
 * - Pass 2: suffix match as fallback (for abbreviated names like Gi0/1 matching GigabitEthernet0/1)
 */
export function resolveDevicePortName(device: PTDevice, requested: string): string | null {
  const wanted = String(requested || "")
    .replace(/\s+/g, "")
    .toLowerCase();
  const names = getDevicePortNames(device);

  for (const candidate of names) {
    const candidateValue = String(candidate || "")
      .replace(/\s+/g, "")
      .toLowerCase();
    if (candidateValue === wanted) return candidate;
  }

  const wantedKey = normalizePortKey(requested);
  for (const candidate of names) {
    if (normalizePortKey(candidate) === wantedKey) return candidate;
  }

  return null;
}

/** Dependencies injected into handlers */
export type HandlerDeps = PtDeps;

/** Handler result type */
export type HandlerResult = PtResult;

/** Error codes for structured error handling */
export const HandlerErrorCode = {
  DEVICE_NOT_FOUND: "DEVICE_NOT_FOUND",
  DEVICE_NOT_READY: "DEVICE_NOT_READY",
  INVALID_INPUT: "INVALID_INPUT",
  COMMAND_FAILED: "COMMAND_FAILED",
  SESSION_ERROR: "SESSION_ERROR",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  RECT_NOT_FOUND: "RECT_NOT_FOUND",
  DEVICE_CREATION_FAILED: "DEVICE_CREATION_FAILED",
  INVALID_PORT: "INVALID_PORT",
  UNSUPPORTED_OPERATION: "UNSUPPORTED_OPERATION",
} as const;

export type HandlerErrorCode =
  | (typeof HandlerErrorCode)[keyof typeof HandlerErrorCode]
  | string
  | undefined;

/** Structured error interface */
export interface HandlerError {
  ok: false;
  error: string;
  code: HandlerErrorCode;
  details?: unknown;
}

/** Helper function to create structured errors */
export function makeHandlerError(
  code: HandlerErrorCode,
  error: string,
  details?: unknown,
): HandlerError {
  return { ok: false, error, code, details };
}

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
