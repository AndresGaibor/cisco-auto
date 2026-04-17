import type { HandlerDeps, HandlerResult } from "../utils/helpers";
import {
  resolveModel,
  getDeviceTypeCandidates,
  createDeviceWithFallback,
  getDeviceTypeString,
  collectPorts,
} from "../utils/helpers";

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

/**
 * Add a new device to the canvas
 */
export function handleAddDevice(payload: AddDevicePayload, deps: HandlerDeps): HandlerResult {
  const { getLW, getNet, dprint } = deps;
  const lw = getLW();
  const net = getNet();

  dprint(
    `[handler:addDevice] starting model=${payload.model} name=${payload.name} x=${payload.x} y=${payload.y}`,
  );

  let model: string;
  try {
    model = resolveModel(payload.model);
  } catch (error) {
    const errMsg = String(error);
    dprint(`[handler:addDevice] ERROR resolveModel: ${errMsg}`);
    return { ok: false, error: errMsg, code: "INVALID_INPUT" };
  }

  const name = payload.name || model;
  const x = payload.x ?? 100;
  const y = payload.y ?? 100;

  const typeList =
    payload.deviceType !== undefined ? [payload.deviceType] : getDeviceTypeCandidates(model);
  dprint(`[handler:addDevice] trying model=${model} typeList=${typeList.join(",")}`);

  const created = createDeviceWithFallback(model, x, y, typeList, lw, net);
  if (!created) {
    dprint(`[handler:addDevice] ERROR createDeviceWithFallback failed for ${model}`);
    return { ok: false, error: "Failed to add device: " + model, code: "DEVICE_CREATION_FAILED" };
  }

  created.device.setName(name);
  if (created.device.skipBoot) created.device.skipBoot();

  dprint(`[handler:addDevice] SUCCESS name=${name} typeId=${created.typeId}`);

  return {
    ok: true,
    name,
    model,
    type: getDeviceTypeString(created.typeId),
    power: true,
    x: x,
    y: y,
    ports: collectPorts(created.device),
  };
}

/**
 * Remove a device from the canvas
 */
export function handleRemoveDevice(payload: RemoveDevicePayload, deps: HandlerDeps): HandlerResult {
  const { getLW, getNet, dprint } = deps;
  const lw = getLW();
  const net = getNet();

  dprint(`[handler:removeDevice] starting name=${payload.name}`);

  try {
    if ((lw as any).removeDevice) lw.removeDevice(payload.name);
    else if ((lw as any).deleteDevice) (lw as any).deleteDevice(payload.name);
    else if ((net as any).removeDevice) (net as any).removeDevice(payload.name);
  } catch (e) {
    dprint(`[handler:removeDevice] ERROR: ${String(e)}`);
  }

  dprint(`[handler:removeDevice] SUCCESS name=${payload.name}`);

  return { ok: true, name: payload.name };
}

/**
 * Rename a device
 */
export function handleRenameDevice(payload: RenameDevicePayload, deps: HandlerDeps): HandlerResult {
  const { dprint } = deps;
  const device = deps.getNet().getDevice(payload.oldName);
  if (!device) {
    dprint(`[handler:renameDevice] ERROR Device not found: ${payload.oldName}`);
    return { ok: false, error: "Device not found", code: "DEVICE_NOT_FOUND" };
  }
  device.setName(payload.newName);
  dprint(`[handler:renameDevice] SUCCESS ${payload.oldName} -> ${payload.newName}`);
  return { ok: true, oldName: payload.oldName, newName: payload.newName };
}

/**
 * Move a device to a new position on the canvas
 */
export function handleMoveDevice(payload: MoveDevicePayload, deps: HandlerDeps): HandlerResult {
  const { dprint } = deps;
  const device = deps.getNet().getDevice(payload.name);
  if (!device) {
    dprint(`[handler:moveDevice] ERROR Device not found: ${payload.name}`);
    return { ok: false, error: "Device not found", code: "DEVICE_NOT_FOUND" };
  }

  const x = Math.round(payload.x);
  const y = Math.round(payload.y);
  let moved = false;

  dprint(`[handler:moveDevice] trying ${payload.name} -> (${x}, ${y})`);

  try {
    if ((device as any).moveToLocation) {
      moved = !!(device as any).moveToLocation(x, y);
    } else if ((device as any).moveToLocationCentered) {
      moved = !!(device as any).moveToLocationCentered(x, y);
    }
  } catch (error) {
    dprint(`[handler:moveDevice] ERROR: ${String(error)}`);
  }

  if (!moved) {
    dprint(`[handler:moveDevice] ERROR Move rejected for ${payload.name}`);
    return { ok: false, error: "Move rejected", code: "INTERNAL_ERROR" };
  }
  dprint(`[handler:moveDevice] SUCCESS ${payload.name} -> (${x}, ${y})`);
  return { ok: true, name: payload.name, x, y };
}
