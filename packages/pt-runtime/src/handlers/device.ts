// ============================================================================
// Device Handlers - Pure functions for device operations
// ============================================================================

import type { HandlerDeps, HandlerResult, PTDevice } from "../utils/helpers";
import type { PTFileManager } from "../utils/helpers";
import {
  resolveModel,
  getDeviceTypeCandidates,
  createDeviceWithFallback,
  getDeviceTypeString,
} from "../utils/helpers";

const LINK_REGISTRY = "link-registry.json";

interface LinkRegistryEntry {
  device1: string;
  port1: string;
  device2: string;
  port2: string;
  source: string;
  createdAt: number;
}

type LinkRegistry = Record<string, LinkRegistryEntry>;

function loadLinksJson(dir: string, fm: PTFileManager): LinkRegistry {
  const legacyPath = dir + "/links.json";
  try {
    if (!fm.fileExists(legacyPath)) return {};
    const content = fm.getFileContents(legacyPath);
    const raw = JSON.parse(content);
    const result: LinkRegistry = {};
    for (const [key, val] of Object.entries(raw)) {
      const entry = val as Record<string, unknown>;
      result[key] = {
        device1: String(entry.device1 ?? entry.dev1 ?? ""),
        port1: String(entry.port1 ?? entry.p1 ?? ""),
        device2: String(entry.device2 ?? entry.dev2 ?? ""),
        port2: String(entry.port2 ?? entry.p2 ?? ""),
        source: String(entry.source ?? entry.linkType ?? "legacy-links-json"),
        createdAt: typeof entry.createdAt === "number" ? entry.createdAt : Date.now(),
      };
    }
    return result;
  } catch {
    return {};
  }
}

function getLinkRegistry(dir: string, fm: PTFileManager): LinkRegistry {
  const regPath = dir + "/" + LINK_REGISTRY;
  try {
    if (!fm.fileExists(regPath)) return {};
    const content = fm.getFileContents(regPath);
    return JSON.parse(content) as LinkRegistry;
  } catch {
    return {};
  }
}

function mergeRegistries(primary: LinkRegistry, legacy: LinkRegistry): LinkRegistry {
  const merged = { ...primary };
  for (const [key, entry] of Object.entries(legacy)) {
    if (!merged[key]) {
      merged[key] = entry;
    }
  }
  return merged;
}

export type ConnectionInfo = {
  localPort: string | null;
  remoteDevice: string | null;
  remotePort: string | null;
  confidence: "exact" | "registry" | "ambiguous" | "unknown";
  evidence?: {
    localCandidates?: string[];
    remoteCandidates?: string[];
    source?: string;
  };
};

export type ListDevicesResult = HandlerResult & {
  devices: Array<{ name: string; model: string; type: string; power: boolean; ports: unknown[] }>;
  count: number;
  connectionsByDevice: Record<string, ConnectionInfo[]>;
  unresolvedLinks: Array<{
    port1Name: string;
    port2Name: string;
    candidates1: string[];
    candidates2: string[];
  }>;
  ptLinkDebug: {
    getLinkCountResult: number;
    getLinkAtExists: boolean;
    ptLinksFound: number;
    registryEntries: number;
  };
};

// ============================================================================
// Payload Types
// ============================================================================

export interface AddDevicePayload {
  type: "addDevice";
  model?: string;
  name?: string;
  x?: number;
  y?: number;
  deviceType?: number;
}

export interface RemoveDevicePayload {
  type: "removeDevice";
  name: string;
}

export interface ListDevicesPayload {
  type: "listDevices";
}

export interface RenameDevicePayload {
  type: "renameDevice";
  oldName: string;
  newName: string;
}

export interface MoveDevicePayload {
  type: "moveDevice";
  name: string;
  x: number;
  y: number;
}

// ============================================================================
// Handlers
// ============================================================================

/**
 * Add a new device to the canvas
 * Uses fallback mechanism to try multiple device types if needed
 * VALIDATES model against catalog - throws if invalid
 */
export function handleAddDevice(payload: AddDevicePayload, deps: HandlerDeps): HandlerResult {
  const { getLW, getNet } = deps;
  const lw = getLW();
  const net = getNet();

  let model: string;
  try {
    model = resolveModel(payload.model);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return { ok: false, error: msg, code: "INVALID_INPUT" };
  }

  const name = payload.name || model;
  const x = payload.x ?? 100;
  const y = payload.y ?? 100;

  // Use provided deviceType or get candidates for fallback
  const typeList =
    payload.deviceType !== undefined ? [payload.deviceType] : getDeviceTypeCandidates(model);

  // Use fallback mechanism for robust device creation
  const created = createDeviceWithFallback(model, x, y, typeList, lw, net);
  if (!created) {
    return {
      ok: false,
      error: `Failed to add device for model: ${model}`,
      code: "DEVICE_CREATION_FAILED",
    };
  }

  const { autoName, device, typeId } = created;

  device.setName(name);
  if (device.skipBoot) {
    device.skipBoot();
  }

  // Return DeviceState compatible response
  return {
    ok: true,
    name,
    model,
    type: getDeviceTypeString(typeId),
    power: true,
    x: x,
    y: y,
    ports: [],
  };
}

/**
 * Remove a device from the canvas
 */
export function handleRemoveDevice(payload: RemoveDevicePayload, deps: HandlerDeps): HandlerResult {
  const { getLW, getNet } = deps;
  const lwAny = getLW() as unknown as Record<string, unknown>;
  const netAny = getNet() as unknown as Record<string, unknown>;

  const candidatos = ["removeDevice", "deleteDevice", "removeObject", "deleteObject"] as const;

  for (const metodo of candidatos) {
    const fnLw = lwAny[metodo];
    if (typeof fnLw === "function") {
      try {
        (fnLw as (name: string) => void).call(lwAny, payload.name);
      } catch {
        // PT API puede rechazar la operación, continuar con siguiente método
      }
    }

    const fnNet = netAny[metodo];
    if (typeof fnNet === "function") {
      try {
        (fnNet as (name: string) => void).call(netAny, payload.name);
      } catch {
        // PT API puede rechazar la operación, continuar con siguiente método
      }
    }
  }

  return { ok: true, name: payload.name };
}

/**
 * List all devices in the network
 */
export function handleListDevices(
  payload: ListDevicesPayload,
  deps: HandlerDeps,
): ListDevicesResult {
  const { getNet, DEV_DIR, getFM } = deps;
  const net = getNet();
  const count = net.getDeviceCount();
  const devices: Array<{
    name: string;
    model: string;
    type: string;
    power: boolean;
    ports: unknown[];
  }> = [];

  const fm = getFM();
  const registry = mergeRegistries(getLinkRegistry(DEV_DIR, fm), loadLinksJson(DEV_DIR, fm));

  const connectionsByDevice: Record<string, ConnectionInfo[]> = {};
  const unresolvedLinks: Array<{
    port1Name: string;
    port2Name: string;
    candidates1: string[];
    candidates2: string[];
  }> = [];

  const linkCount = typeof net.getLinkCount === "function" ? net.getLinkCount() : 0;
  const mergedRegistry = mergeRegistries(getLinkRegistry(DEV_DIR, fm), loadLinksJson(DEV_DIR, fm));
  const ptLinkDebug = {
    getLinkCountResult: linkCount,
    getLinkAtExists: typeof net.getLinkAt === "function",
    ptLinksFound: 0,
    registryEntries: Object.keys(mergedRegistry).length,
  };

  for (let li = 0; linkCount > 0 && li < linkCount; li++) {
    const link = typeof net.getLinkAt === "function" ? net.getLinkAt(li) : null;
    if (!link) {
      ptLinkDebug.ptLinksFound = li;
      break;
    }
    ptLinkDebug.ptLinksFound++;

    const port1 = link.getPort1 ? link.getPort1() : null;
    const port2 = link.getPort2 ? link.getPort2() : null;
    if (!port1 || !port2 || !port1.getName || !port2.getName) continue;

    const p1Name = port1.getName();
    const p2Name = port2.getName();

    let dn1: string | null = null;
    let dn2: string | null = null;
    const candidates1: string[] = [];
    const candidates2: string[] = [];

    outer: for (let di = 0; di < count; di++) {
      const dev = net.getDeviceAt(di);
      if (!dev) continue;
      const devName = dev.getName();
      const portCount = typeof dev.getPortCount === "function" ? dev.getPortCount() : 0;
      for (let pi = 0; pi < portCount; pi++) {
        const port = dev.getPortAt ? dev.getPortAt(pi) : null;
        if (port && port.getName && port.getName() === p1Name) {
          candidates1.push(devName);
          if (!dn1) dn1 = devName;
          break;
        }
      }
    }

    outer: for (let di = 0; di < count; di++) {
      const dev = net.getDeviceAt(di);
      if (!dev) continue;
      const devName = dev.getName();
      const portCount = typeof dev.getPortCount === "function" ? dev.getPortCount() : 0;
      for (let pi = 0; pi < portCount; pi++) {
        const port = dev.getPortAt ? dev.getPortAt(pi) : null;
        if (port && port.getName && port.getName() === p2Name) {
          candidates2.push(devName);
          if (!dn2) dn2 = devName;
          break;
        }
      }
    }

    if (dn1 && dn2 && dn1 !== dn2) {
      const confidence: ConnectionInfo["confidence"] =
        candidates1.length === 1 && candidates2.length === 1 ? "ambiguous" : "unknown";
      if (!connectionsByDevice[dn1]) connectionsByDevice[dn1] = [];
      connectionsByDevice[dn1].push({
        localPort: p1Name,
        remoteDevice: dn2,
        remotePort: p2Name,
        confidence,
        evidence: { localCandidates: candidates1, remoteCandidates: candidates2 },
      });
    } else {
      unresolvedLinks.push({
        port1Name: p1Name,
        port2Name: p2Name,
        candidates1,
        candidates2,
      });
    }
  }

  if (ptLinkDebug.getLinkCountResult === 0) {
    deps.dprint?.(
      `[handleListDevices] getLinkCount()=0 — no PT links detected. Registry: ${ptLinkDebug.registryEntries} entries.`,
    );
  } else if (ptLinkDebug.ptLinksFound === 0 && linkCount > 0) {
    deps.dprint?.(
      `[handleListDevices] getLinkCount()=${linkCount} but getLinkAt(0)=null — PT link API unavailable. Using registry only.`,
    );
  }

  for (const [_key, entry] of Object.entries(mergedRegistry)) {
    const d1 = entry.device1;
    const d2 = entry.device2;
    if (!connectionsByDevice[d1]) connectionsByDevice[d1] = [];
    connectionsByDevice[d1].push({
      localPort: entry.port1,
      remoteDevice: d2,
      remotePort: entry.port2,
      confidence: "registry",
      evidence: { source: entry.source },
    });
    if (!connectionsByDevice[d2]) connectionsByDevice[d2] = [];
    connectionsByDevice[d2].push({
      localPort: entry.port2,
      remoteDevice: d1,
      remotePort: entry.port1,
      confidence: "registry",
      evidence: { source: entry.source },
    });
  }

  for (let i = 0; i < count; i++) {
    const device = net.getDeviceAt(i);
    if (device) {
      devices.push({
        name: device.getName(),
        model: device.getModel(),
        type: getDeviceTypeString(device.getType()),
        power: device.getPower(),
        ports: [],
      });
    }
  }

  return { ok: true, devices, count, connectionsByDevice, unresolvedLinks, ptLinkDebug };
}

/**
 * Rename a device
 */
export function handleRenameDevice(payload: RenameDevicePayload, deps: HandlerDeps): HandlerResult {
  const { getNet } = deps;
  const device = getNet().getDevice(payload.oldName);

  if (!device) {
    return { ok: false, error: `Device not found: ${payload.oldName}`, code: "DEVICE_NOT_FOUND" };
  }

  device.setName(payload.newName);
  return { ok: true, oldName: payload.oldName, newName: payload.newName };
}

/**
 * Move a device to a new position on the canvas
 */
export function handleMoveDevice(payload: MoveDevicePayload, deps: HandlerDeps): HandlerResult {
  const { getNet } = deps;
  const device = getNet().getDevice(payload.name);

  if (!device) {
    return { ok: false, error: `Device not found: ${payload.name}`, code: "DEVICE_NOT_FOUND" };
  }

  const x = Math.round(payload.x);
  const y = Math.round(payload.y);
  const deviceAny = device as unknown as Record<string, unknown>;
  let moved = false;
  let method = "";

  try {
    if (typeof deviceAny.moveToLocation === "function") {
      moved = !!(deviceAny.moveToLocation as (x: number, y: number) => boolean)(x, y);
      method = "moveToLocation";
    }

    if (!moved && typeof deviceAny.moveToLocationCentered === "function") {
      moved = !!(deviceAny.moveToLocationCentered as (x: number, y: number) => boolean)(x, y);
      method = "moveToLocationCentered";
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return { ok: false, error: `Failed to move device: ${msg}`, code: "INTERNAL_ERROR" };
  }

  if (!moved) {
    return {
      ok: false,
      error: "Packet Tracer rejected move",
      code: "INTERNAL_ERROR",
      details: { name: payload.name, x, y },
    };
  }

  return { ok: true, name: payload.name, x, y, method };
}
