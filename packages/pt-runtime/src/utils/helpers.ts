// ============================================================================
// Runtime Helpers - Pure utility functions
// ============================================================================

import { DEVICE_TYPES, MODEL_ALIASES } from "./constants.js";
import { validatePTModel, getPTDeviceType } from "../value-objects/validated-models.js";
import type { DeviceName } from "../value-objects/device-name.js";
import type { InterfaceName } from "../value-objects/interface-name.js";
import type { SessionMode } from "../value-objects/session-mode.js";
import type { CableType } from "../value-objects/cable-type.js";
import type { PtDeps } from "../pt-api/pt-deps.js";
import type { PtResult } from "../pt-api/pt-results.js";

/** Logical workspace interface */
export interface PTLogicalWorkspace {
  addDevice(type: number, model: string, x: number, y: number): string | null;
  removeDevice(name: string): void;
  createLink(dev1: string, port1: string, dev2: string, port2: string, cableType: number): boolean;
  deleteLink(device: string, port: string): void;
}

/** Network interface */
export interface PTNetwork {
  getDeviceCount(): number;
  getDeviceAt(index: number): PTDevice | null;
  getDevice(name: string): PTDevice | null;
}

/** Device interface */
export interface PTDevice {
  getName(): string;
  getModel(): string;
  getType(): number;
  getPower(): boolean;
  setPower(on: boolean): void;
  setName(name: string): void;
  skipBoot(): void;
  getCommandLine(): PTCommandLine | null;
  getPortCount(): number;
  getPortAt(index: number): PTPort | null;
  addModule(slot: string, module: string): boolean;
  removeModule(slot: string): boolean;
  enterCommand?(cmd: string, prompt?: string): [number, string];
}

/** Port interface */
export interface PTPort {
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

/** HostPort interface - for PC/Server ports with DHCP support (PT official API) */
export interface PTHostPort extends PTPort {
  isDhcpClientOn(): boolean;
  setDhcpClientFlag(enabled: boolean): void;
}

/** PC/Server device interface with DHCP flag (PT official API) */
export interface PTPcLikeDevice extends PTDevice {
  setDhcpFlag(enabled: boolean): void;
  getDhcpFlag(): boolean;
}

/** DHCP Pool interface (PT official API) */
export interface PTDhcpPool {
  getPoolName(): string;
  getNetworkAddress(): string;
  getNetworkMask(): string;
  getDefaultRouter(): string;
  getDnsServerIp(): string;
  getStartIp(): string;
  getEndIp(): string;
  getMaxUsers(): number;
  setNetworkAddress(ip: string): void;
  setNetworkMask(mask: string): void;
  setDefaultRouter(router: string): void;
  setDnsServerIp(dns: string): void;
  setStartIp(ip: string): void;
  setEndIp(ip: string): void;
  setMaxUsers(count: number): void;
  getLeaseCount(): number;
  getLeaseAt(index: number): { mac: string; ip: string; expires: string } | null;
}

/** DHCP Server Process interface (PT official API) */
export interface PTDhcpServerProcess {
  setEnable(enabled: boolean): void;
  isEnabled(): boolean;
  addNewPool(name: string): PTDhcpPool | null;
  addPool(pool: PTDhcpPool): boolean;
  getPoolCount(): number;
  getPoolAt(index: number): PTDhcpPool | null;
  getPoolByName(name: string): PTDhcpPool | null;
  removePool(name: string): boolean;
  addExcludedAddress(start: string, end: string): void;
  getExcludedAddressCount(): number;
  getExcludedAddressAt(index: number): { start: string; end: string } | null;
}

/** DHCP Server Main Process interface (PT official API) */
export interface PTDhcpServerMainProcess {
  getDhcpServerProcessByPortName(portName: string): PTDhcpServerProcess | null;
  getDhcpServerProcessCount(): number;
}

/** VLAN Manager interface (PT official API) */
export interface PTVlanManager {
  addVlan(vlanId: number, name?: string): boolean;
  removeVlan(vlanId: number): boolean;
  getVlanCount(): number;
  getVlanAt(index: number): { id: number; name: string } | null;
  addVlanInt(vlanId: number): boolean;
  getVlanInt(vlanId: number): PTHostPort | null;
}

/** Router Port interface (extends HostPort for IP config) (PT official API) */
export interface PTRouterPort extends PTHostPort {
}

/** Extended Device interface with process access (PT official API) */
export interface PTDeviceWithProcesses extends PTDevice {
  getProcess(name: string): unknown | null;
}

/** Normalize a port name for comparison across interface families. */
function normalizePortKey(name: string): string {
  const value = String(name || "").replace(/\s+/g, "").toLowerCase();
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
  const wanted = String(requested || "").replace(/\s+/g, "").toLowerCase();
  const names = getDevicePortNames(device);

  for (const candidate of names) {
    const candidateValue = String(candidate || "").replace(/\s+/g, "").toLowerCase();
    if (candidateValue === wanted) return candidate;
  }

  const wantedKey = normalizePortKey(requested);
  for (const candidate of names) {
    if (normalizePortKey(candidate) === wantedKey) return candidate;
  }

  return null;
}

/** Command line interface */
export interface PTCommandLine {
  enterCommand(cmd: string, prompt?: string): [number, string];
  getPrompt?(): string;
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

export type HandlerErrorCode = (typeof HandlerErrorCode)[keyof typeof HandlerErrorCode] | string | undefined;

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
  details?: unknown
): HandlerError {
  return { ok: false, error, code, details };
}

/** Resolve model name from alias or return as-is */
export function resolveModel(model: string | undefined): string {
  if (!model) return "1941"; // default router from validated catalog
  const key = model.toLowerCase();
  
  // Try alias first
  if (key in MODEL_ALIASES) {
    model = MODEL_ALIASES[key];
  }
  
  // Validate against catalog - THROWS if invalid
  try {
    return validatePTModel(model);
  } catch (error) {
    throw new Error(
      `Invalid device model: "${model}". Check packages/core/src/catalog/ for valid models.`
    );
  }
}

/** Get device type ID for a model name - uses validated catalog */
export function getDeviceTypeForModel(model: string): number {
  try {
    return getPTDeviceType(model) ?? DEVICE_TYPES.router;
  } catch {
    return DEVICE_TYPES.router; // fallback
  }
}

/** Get list of device type candidates to try (fallback mechanism) */
export function getDeviceTypeCandidates(model: string): number[] {
  const normalized = (model || "").toLowerCase();

  // Switches
  if (normalized.indexOf("2960") === 0 || normalized.indexOf("3560") === 0 || normalized.indexOf("switch") >= 0) {
    return [DEVICE_TYPES.switch, DEVICE_TYPES.router];
  }

  // PCs/Laptops - try multiple types as PT versions vary
  if (normalized.indexOf("pc") === 0 || normalized.indexOf("laptop") === 0) {
    const candidates: number[] = [DEVICE_TYPES.pc];
    for (let t = 8; t <= 60; t++) {
      if (!candidates.includes(t)) candidates.push(t);
    }
    return candidates;
  }

  // Servers
  if (normalized.indexOf("server") === 0) {
    const candidates: number[] = [DEVICE_TYPES.server];
    for (let t = 8; t <= 60; t++) {
      if (!candidates.includes(t)) candidates.push(t);
    }
    return candidates;
  }

  // Default: try router type then others
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
  net: PTNetwork
): CreateDeviceResult | null {
  for (const typeId of typeList) {
    const autoName = lw.addDevice(typeId, model, x, y);
    if (!autoName) continue;

    const device = net.getDevice(autoName);
    if (!device) {
      lw.removeDevice(autoName);
      continue;
    }

    // Verify the model matches
    let deviceModel = "";
    try {
      deviceModel = (device.getModel && device.getModel()) || "";
    } catch {
      // ignore
    }

    if (deviceModel && deviceModel.toLowerCase() === model.toLowerCase()) {
      return { autoName, device, typeId };
    }

    // Model didn't match, try next type
    lw.removeDevice(autoName);
  }
  return null;
}

/** Convert device type number to string (DeviceType enum value) */
export function getDeviceTypeString(typeId: number): string {
  const typeMap: Record<number, string> = {
    [DEVICE_TYPES.router]: 'router',
    [DEVICE_TYPES.switch]: 'switch',
    [DEVICE_TYPES.hub]: 'generic',
    [DEVICE_TYPES.pc]: 'pc',
    [DEVICE_TYPES.server]: 'server',
    [DEVICE_TYPES.printer]: 'generic',
    [DEVICE_TYPES.wireless]: 'access_point',
    [DEVICE_TYPES.cloud]: 'cloud',
  };
  return typeMap[typeId] || 'generic';
}
