// ============================================================================
// Device Handlers - Pure functions for device operations
// ============================================================================

import {
  HandlerDeps,
  HandlerResult,
  PTDevice,
  resolveModel,
  getDeviceTypeCandidates,
  createDeviceWithFallback,
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

// ============================================================================
// Handlers
// ============================================================================

/**
 * Add a new device to the canvas
 * Uses fallback mechanism to try multiple device types if needed
 */
export function handleAddDevice(payload: AddDevicePayload, deps: HandlerDeps): HandlerResult {
  const { getLW, getNet } = deps;
  const lw = getLW();
  const net = getNet();

  const model = resolveModel(payload.model);
  const name = payload.name || model;
  const x = payload.x ?? 100;
  const y = payload.y ?? 100;

  // Use provided deviceType or get candidates for fallback
  const typeList = payload.deviceType !== undefined
    ? [payload.deviceType]
    : getDeviceTypeCandidates(model);

  // Use fallback mechanism for robust device creation
  const created = createDeviceWithFallback(model, x, y, typeList, lw, net);
  if (!created) {
    return { ok: false, error: `Failed to add device for model: ${model}` };
  }

  const { autoName, device, typeId } = created;

  device.setName(name);
  if (device.skipBoot) {
    device.skipBoot();
  }

  return {
    ok: true,
    name,
    autoName,
    model,
    deviceType: typeId,
  };
}

/**
 * Remove a device from the canvas
 */
export function handleRemoveDevice(payload: RemoveDevicePayload, deps: HandlerDeps): HandlerResult {
  const { getLW } = deps;
  getLW().removeDevice(payload.name);
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
    type: number;
    power: boolean;
  }> = [];

  for (let i = 0; i < count; i++) {
    const device = net.getDeviceAt(i);
    if (device) {
      devices.push({
        name: device.getName(),
        model: device.getModel(),
        type: device.getType(),
        power: device.getPower(),
      });
    }
  }

  return { ok: true, devices, count };
}

/**
 * Rename a device
 */
export function handleRenameDevice(payload: RenameDevicePayload, deps: HandlerDeps): HandlerResult {
  const { getNet } = deps;
  const device = getNet().getDevice(payload.oldName);

  if (!device) {
    return { ok: false, error: `Device not found: ${payload.oldName}` };
  }

  device.setName(payload.newName);
  return { ok: true, oldName: payload.oldName, newName: payload.newName };
}
