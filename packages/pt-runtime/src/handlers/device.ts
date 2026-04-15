// ============================================================================
// Device Handlers - Pure functions for device operations
// ============================================================================

import type { HandlerDeps, HandlerResult, PTDevice } from "../utils/helpers";
import {
  resolveModel,
  getDeviceTypeCandidates,
  createDeviceWithFallback,
  getDeviceTypeString,
} from "../utils/helpers";

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
export function handleListDevices(payload: ListDevicesPayload, deps: HandlerDeps): HandlerResult {
  const { getNet } = deps;
  const net = getNet();
  const count = net.getDeviceCount();
  const devices: Array<{
    name: string;
    model: string;
    type: string;
    power: boolean;
    ports: unknown[];
  }> = [];

  const deviceLinks: Record<string, string[]> = {};

  const linkCount = typeof net.getLinkCount === "function" ? net.getLinkCount() : 0;
  for (let li = 0; li < linkCount; li++) {
    const link = net.getLinkAt ? net.getLinkAt(li) : null;
    if (!link) continue;
    const port1 = link.getPort1 ? link.getPort1() : null;
    const port2 = link.getPort2 ? link.getPort2() : null;
    if (!port1 || !port2 || !port1.getName || !port2.getName) continue;

    const p1Name = port1.getName();
    const p2Name = port2.getName();

    let dn1: string | null = null;
    let dn2: string | null = null;

    outer: for (let di = 0; di < count; di++) {
      const dev = net.getDeviceAt(di);
      if (!dev) continue;
      const devName = dev.getName();
      const portCount = typeof dev.getPortCount === "function" ? dev.getPortCount() : 0;
      for (let pi = 0; pi < portCount; pi++) {
        const port = dev.getPortAt ? dev.getPortAt(pi) : null;
        if (port && port.getName && port.getName() === p1Name) {
          dn1 = devName;
          break outer;
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
          dn2 = devName;
          break outer;
        }
      }
    }

    if (dn1 && dn2 && dn1 !== dn2) {
      if (!deviceLinks[dn1]) deviceLinks[dn1] = [];
      if (deviceLinks[dn1].indexOf(dn2) === -1) deviceLinks[dn1].push(dn2);
    }
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

  return { ok: true, devices, count, deviceLinks };
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
