// ============================================================================
// Runtime Helpers - Pure utility functions
// ============================================================================

import { PT_MODEL_MAP, PT_DEVICE_TYPE_MAP } from "@cisco-auto/pt-runtime/value-objects/validated-models";

// Device type IDs (from PT schema)
const DEVICE_TYPES = {
  router: 0,
  switch: 1,
  generic: 2,
  pc: 3,
  server: 4,
  end: 5,
  wireless: 6,
  cloud: 7,
};

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

/** Command line interface */
export interface PTCommandLine {
  enterCommand(cmd: string, prompt?: string): [number, string];
  getPrompt?(): string;
}

/** Dependencies injected into handlers */
export interface HandlerDeps {
  getLW: () => PTLogicalWorkspace;
  getNet: () => PTNetwork;
  dprint: (msg: string) => void;
}

/** Handler result type */
export interface HandlerResult {
  ok: boolean;
  error?: string;
  [key: string]: unknown;
}

/** 
 * Valida y resuelve modelo contra catálogo de core
 * THROWS si modelo inválido
 */
export function validatePTModel(model: string): string {
  const key = model.toLowerCase();
  if (!(key in PT_MODEL_MAP)) {
    throw new Error(
      `Invalid device model: "${model}". ` +
      `Check packages/core/src/catalog/ for valid models. ` +
      `Available aliases: pc, server, cloud, ap, router, switch, 1941, 2960, ...`
    );
  }
  return PT_MODEL_MAP[key];
}

/** Resolve model name from alias - VALIDATES against catalog */
export function resolveModel(model: string | undefined): string {
  if (!model) return "1941"; // default router from catalog
  return validatePTModel(model);
}

/** Get device type ID for a model name */
export function getDeviceTypeForModel(model: string): number {
  const name = (model || "").toLowerCase();
  if (name.indexOf("2960") === 0 || name.indexOf("3560") === 0 || name.indexOf("switch") >= 0) {
    return DEVICE_TYPES.switch;
  }
  if (name.indexOf("pc") === 0 || name.indexOf("laptop") === 0) {
    return DEVICE_TYPES.pc;
  }
  if (name.indexOf("server") === 0) {
    return DEVICE_TYPES.server;
  }
  if (name.indexOf("accesspoint") >= 0 || name.indexOf("wireless") >= 0) {
    return DEVICE_TYPES.wireless;
  }
  if (name.indexOf("cloud") >= 0) {
    return DEVICE_TYPES.cloud;
  }
  return DEVICE_TYPES.router;
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
    const candidates: number[] = [DEVICE_TYPES.pc, DEVICE_TYPES.end];
    for (let t = 8; t <= 60; t++) {
      if (!candidates.includes(t)) candidates.push(t);
    }
    return candidates;
  }

  // Servers
  if (normalized.indexOf("server") === 0) {
    const candidates: number[] = [DEVICE_TYPES.server, DEVICE_TYPES.end];
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
