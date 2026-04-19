import type { PtDeps } from "./pt-deps";

export interface PtHelperMaps {
  PT_MODEL_MAP: Record<string, string>;
  PT_DEVICE_TYPE_MAP: Record<string, number>;
  PT_PORT_MAP: Record<string, Record<string, string>>;
  PT_MODULE_CATALOG: Record<string, { slotType: string; [k: string]: unknown }>;
  PT_DEVICE_MODULE_SLOTS: Record<string, Array<{ type: string; supportedModules?: string[] }>>;
  CABLE_CONNECTOR_COMPATIBILITY: Record<string, string[]>;
  CABLE_TYPES: Record<string, number>;
  DEVICE_TYPES: Record<string, number>;
}

export function normalizePortKey(name: string): string {
  const value = String(name || "").replace(/\s+/g, "").toLowerCase();
  const suffix = value.match(/(\d+(?:\/\d+)*(?:\.\d+)?)$/);
  return suffix ? suffix[1] : value;
}

export function getDevicePortNames(device: { getPortCount?: () => number; getPortAt?: (i: number) => { getName?: () => string } | null }): string[] {
  const names: string[] = [];
  let count = 0;
  try {
    count = device.getPortCount ? device.getPortCount() : 0;
  } catch {
    return names;
  }

  for (let i = 0; i < count; i++) {
    try {
      const port = device.getPortAt?.(i);
      if (port && port.getName) {
        const portName = port.getName?.();
        if (portName) names.push(String(portName));
      }
    } catch {
      // skip unreadable ports
    }
  }
  return names;
}

export function resolveDevicePortName(
  device: { getPortCount?: () => number; getPortAt?: (i: number) => { getName?: () => string } | null },
  requested: string
): string | null {
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

export function validatePortExists(
  maps: PtHelperMaps,
  deviceModel: string,
  portName: string
): { valid: true; connector: string | null } | { valid: false; error: string } {
  const modelKey = (deviceModel || "").toLowerCase();
  const ports = maps.PT_PORT_MAP[modelKey];

  if (!ports) {
    return {
      valid: false,
      error: "Modelo '" + deviceModel + "' no encontrado en PT_PORT_MAP. Available models: " +
        Object.keys(maps.PT_PORT_MAP).slice(0, 5).join(", ") + "..."
    };
  }

  const requestedLower = (portName || "").toLowerCase();
  if (ports[requestedLower] !== undefined) {
    return { valid: true, connector: ports[requestedLower] };
  }

  const availablePorts = Object.keys(ports).join(", ");
  return {
    valid: false,
    error: "Puerto '" + portName + "' no existe en " + deviceModel + ". Puertos validos: " + availablePorts
  };
}

export function getPortConnector(
  maps: PtHelperMaps,
  deviceModel: string,
  portName: string
): string | null {
  const modelKey = (deviceModel || "").toLowerCase();
  const ports = maps.PT_PORT_MAP[modelKey];
  if (!ports) return null;
  const requestedLower = (portName || "").toLowerCase();
  return ports[requestedLower] || null;
}

export function validateCablePortCompatibility(
  maps: PtHelperMaps,
  cableType: string,
  connectorType: string | null
): { valid: true } | { valid: false; error: string } {
  if (!cableType || cableType === "auto") return { valid: true };
  if (!connectorType) return { valid: true };

  const cableKey = (cableType || "").toLowerCase();
  const compatibleConnectors = maps.CABLE_CONNECTOR_COMPATIBILITY[cableKey];
  if (!compatibleConnectors) return { valid: true };

  if (compatibleConnectors.indexOf(connectorType) >= 0) return { valid: true };

  return {
    valid: false,
    error: "Cable tipo '" + cableType + "' no es compatible con conector '" + connectorType +
      "'. Conectores compatibles: " + compatibleConnectors.join(", ")
  };
}

export function validateModuleExists(
  maps: PtHelperMaps,
  moduleCode: string
): { valid: true; module: { slotType: string; [k: string]: unknown } } | { valid: false; error: string } {
  const moduleKey = (moduleCode || "").toUpperCase();
  const moduleInfo = maps.PT_MODULE_CATALOG[moduleKey];
  if (!moduleInfo) {
    return { valid: false, error: "Modulo '" + moduleCode + "' no encontrado en catalogo. Modulos disponibles: " + Object.keys(maps.PT_MODULE_CATALOG).join(", ") };
  }
  return { valid: true, module: moduleInfo };
}

export function validateModuleSlotCompatible(
  maps: PtHelperMaps,
  deviceModel: string,
  slot: string,
  moduleCode: string
): { valid: true } | { valid: false; error: string } {
  const modelKey = (deviceModel || "").toLowerCase();
  const deviceSlots = maps.PT_DEVICE_MODULE_SLOTS[modelKey];
  if (!deviceSlots) {
    return { valid: false, error: "Modelo '" + deviceModel + "' no tiene informacion de slots de modulos" };
  }

  const moduleValidation = validateModuleExists(maps, moduleCode);
  if (!moduleValidation.valid) return moduleValidation;

  const slotIndex = parseInt(String(slot).replace(/[^0-9]/g, ""), 10) || 0;
  const slotType = deviceSlots.length > slotIndex ? deviceSlots[slotIndex].type : null;
  if (!slotType) {
    return { valid: false, error: "Slot '" + slot + "' no existe en " + deviceModel + ". Slots disponibles: " + deviceSlots.length };
  }

  if (moduleValidation.module.slotType !== slotType) {
    const supportedForSlot = deviceSlots[slotIndex].supportedModules || [];
    return {
      valid: false,
      error: "Modulo '" + moduleCode + "' (tipo " + moduleValidation.module.slotType +
        ") no es compatible con slot " + slot + " (tipo " + slotType + ") en " + deviceModel +
        ". Modulos compatibles con este slot: " + (supportedForSlot.join(", ") || "ninguno")
    };
  }

  return { valid: true };
}

export function resolveModel(maps: PtHelperMaps, model: string): string {
  if (!model) return "1941";
  const key = model.toLowerCase();
  if (maps.PT_MODEL_MAP[key]) {
    return maps.PT_MODEL_MAP[key];
  }
  throw new Error(
    "Invalid device model: '" + model + "'. Check the validated PT catalog for valid models. " +
    "Available: " + Object.keys(maps.PT_MODEL_MAP).slice(0, 5).join(", ") + "..."
  );
}

export function getDeviceTypeForModel(maps: PtHelperMaps, model: string): number {
  const name = (model || "").toLowerCase();

  if (maps.PT_DEVICE_TYPE_MAP[name] !== undefined) {
    return maps.PT_DEVICE_TYPE_MAP[name];
  }

  if (name.indexOf("2960") === 0 || name.indexOf("3560") === 0 || name.indexOf("switch") >= 0) return maps.DEVICE_TYPES.switch;
  if (name.indexOf("wrt") >= 0 || name.indexOf("wireless") >= 0 || name.indexOf("accesspoint") >= 0) return maps.DEVICE_TYPES.wireless;
  if (name.indexOf("pc") === 0 || name.indexOf("laptop") === 0) return maps.DEVICE_TYPES.pc;
  if (name.indexOf("server") === 0) return maps.DEVICE_TYPES.server;
  if (name.indexOf("cloud") >= 0) return maps.DEVICE_TYPES.cloud;
  if (name.indexOf("printer") >= 0) return maps.DEVICE_TYPES.printer;

  return maps.DEVICE_TYPES.router;
}

export function getDeviceTypeCandidates(maps: PtHelperMaps, model: string): number[] {
  const normalized = (model || "").toLowerCase();

  const canonicalType = maps.PT_DEVICE_TYPE_MAP[normalized];
  if (canonicalType !== undefined) return [canonicalType];

  if (normalized.indexOf("2960") === 0 || normalized.indexOf("3560") === 0 || normalized.indexOf("switch") >= 0)
    return [maps.DEVICE_TYPES.switch];
  if (normalized.indexOf("wrt") >= 0 || normalized.indexOf("wireless") >= 0 || normalized.indexOf("accesspoint") >= 0)
    return [maps.DEVICE_TYPES.wireless];
  if (normalized.indexOf("pc") === 0 || normalized.indexOf("laptop") === 0)
    return [maps.DEVICE_TYPES.pc, maps.DEVICE_TYPES.laptop];
  if (normalized.indexOf("server") === 0)
    return [maps.DEVICE_TYPES.server];
  if (normalized.indexOf("printer") >= 0)
    return [maps.DEVICE_TYPES.printer];
  if (normalized.indexOf("cloud") >= 0)
    return [maps.DEVICE_TYPES.cloud];

  return [maps.DEVICE_TYPES.router];
}

export interface DeviceCreationResult {
  autoName: string;
  device: { getModel?: () => string; setName: (n: string) => void; skipBoot?: () => void; getType?: () => number };
  typeId: number;
}

export function createDeviceWithFallback(
  deps: PtDeps,
  maps: PtHelperMaps,
  model: string,
  x: number,
  y: number,
  typeList: number[]
): DeviceCreationResult | null {
  const lw = deps.getLW();
  const net = deps.getNet();

  deps.dprint("[createDeviceWithFallback] Trying model='" + model + "' with types=[" + typeList.join(",") + "]");

  for (const typeId of typeList) {
    deps.dprint("[createDeviceWithFallback] Attempting: typeId=" + typeId);

    const autoName = lw.addDevice(typeId, model, x, y);
    if (!autoName) {
      deps.dprint("[createDeviceWithFallback] lw.addDevice returned null/empty");
      continue;
    }
    deps.dprint("[createDeviceWithFallback] lw.addDevice returned: " + autoName);

    const device = net.getDevice(autoName);
    if (!device) {
      deps.dprint("[createDeviceWithFallback] net.getDevice('" + autoName + "') returned null");
      lw.removeDevice(autoName);
      continue;
    }

    let deviceModel = "";
    try { deviceModel = (device.getModel && device.getModel()) || ""; } catch (e) {
      deps.dprint("[createDeviceWithFallback] Error getting model: " + e);
    }

    deps.dprint("[createDeviceWithFallback] Device model='" + deviceModel + "', expected='" + model + "'");

    if (deviceModel && deviceModel.toLowerCase() === model.toLowerCase()) {
      deps.dprint("[createDeviceWithFallback] SUCCESS with typeId=" + typeId);
      return { autoName, device, typeId };
    }

    deps.dprint("[createDeviceWithFallback] Model mismatch, removing and trying next type");
    lw.removeDevice(autoName);
  }

  deps.dprint("[createDeviceWithFallback] ALL ATTEMPTS FAILED");
  return null;
}

export function getDeviceTypeString(typeId: number, maps: PtHelperMaps): string {
  if (typeId === 0) return "router";
  if (typeId === 1 || typeId === 16) return "switch";
  if (typeId === 8) return "pc";
  if (typeId === 9) return "server";
  if (typeId === 7) return "cloud";
  if (typeId === 10) return "printer";
  return "generic";
}

export class LinkRegistry {
  private registry: Record<string, {
    device1: string; port1: string;
    device2: string; port2: string;
    linkType: string;
  }> = {};
  private dirty = false;

  load(deps: PtDeps, devDir: string): void {
    const fm = deps.getFM();
    const linkFile = devDir + "/links.json";
    try {
      if (!fm.fileExists(linkFile)) {
        this.registry = {};
        return;
      }
      const content = fm.getFileContents(linkFile);
      if (!content) { this.registry = {}; return; }
      const loaded = JSON.parse(content);
      this.registry = (loaded && typeof loaded === "object") ? loaded : {};
    } catch {
      this.registry = {};
      deps.dprint("[LinkRegistry.load] Error loading registry");
    }
  }

  save(deps: PtDeps, devDir: string): void {
    const fm = deps.getFM();
    const linkFile = devDir + "/links.json";
    try {
      fm.writePlainTextToFile(linkFile, JSON.stringify(this.registry, null, 2));
    } catch (e) {
      deps.dprint("[LinkRegistry.save] Error: " + e);
    }
  }

  recordLink(key: string, link: { device1: string; port1: string; device2: string; port2: string; linkType: string }): void {
    this.registry[key] = link;
    this.dirty = true;
  }

  removeLinksFor(devicePort: string): void {
    for (const linkId in this.registry) {
      if (linkId.indexOf(devicePort) >= 0) {
        delete this.registry[linkId];
        this.dirty = true;
      }
    }
  }

  getAll(): Record<string, { device1: string; port1: string; device2: string; port2: string; linkType: string }> {
    return this.registry;
  }

  isDirty(): boolean {
    return this.dirty;
  }

  getLink(key: string): { device1: string; port1: string; device2: string; port2: string; linkType: string } | null {
    return this.registry[key] || null;
  }
}
