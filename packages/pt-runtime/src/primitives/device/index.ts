// ============================================================================
// Device Primitives - Operaciones atómicas de dispositivo
// ============================================================================

import { registerPrimitive } from "../primitive-registry";
import type { PrimitiveDomain } from "../primitive-registry";
import type { DeviceRef } from "../../runtime/contracts";
import type { PTDevice } from "../../pt-api/pt-api-registry";

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

export interface ListDevicesPayload {
  type: "listDevices";
}

export interface DevicePrimitiveResult {
  ok: boolean;
  value?: unknown;
  error?: string;
  code?: string;
  warnings?: string[];
  evidence?: Record<string, unknown>;
  confidence?: number;
}

/**
 * Añadir dispositivo
 */
export function addDevice(payload: AddDevicePayload, net: any, lw: any): DevicePrimitiveResult {
  const model = payload.model || "2960-24TT";
  const name = payload.name || null;
  const x = payload.x ?? 200;
  const y = payload.y ?? 200;
  const deviceType = payload.deviceType ?? 1;
  
  try {
    const result = lw.addDevice(deviceType, model, x, y);
    if (result === null) {
      return { ok: false, error: "Failed to add device", code: "DEVICE_CREATION_FAILED" };
    }
    
    const actualName = name || result;
    return {
      ok: true,
      value: { name: actualName, model, x, y },
      evidence: { model, x, y, createdAt: Date.now() },
      confidence: 1,
    };
  } catch (e) {
    return { ok: false, error: String(e), code: "DEVICE_CREATION_FAILED" };
  }
}

/**
 * Eliminar dispositivo
 */
export function removeDevice(payload: RemoveDevicePayload, net: any, lw: any): DevicePrimitiveResult {
  try {
    const result = lw.removeDevice(payload.name);
    if (!result) {
      return { ok: false, error: "Device not found", code: "DEVICE_NOT_FOUND" };
    }
    return { ok: true, value: { name: payload.name }, confidence: 1 };
  } catch (e) {
    return { ok: false, error: String(e), code: "DEVICE_REMOVAL_FAILED" };
  }
}

/**
 * Renombrar dispositivo
 */
export function renameDevice(payload: RenameDevicePayload, net: any): DevicePrimitiveResult {
  try {
    const device = net.getDevice(payload.oldName);
    if (!device) {
      return { ok: false, error: "Device not found", code: "DEVICE_NOT_FOUND" };
    }
    device.setName(payload.newName);
    return {
      ok: true,
      value: { oldName: payload.oldName, newName: payload.newName },
      confidence: 1,
    };
  } catch (e) {
    return { ok: false, error: String(e), code: "DEVICE_RENAME_FAILED" };
  }
}

/**
 * Mover dispositivo
 */
export function moveDevice(payload: MoveDevicePayload, net: any): DevicePrimitiveResult {
  try {
    const device = net.getDevice(payload.name);
    if (!device) {
      return { ok: false, error: "Device not found", code: "DEVICE_NOT_FOUND" };
    }
    const result = device.moveToLocation(payload.x, payload.y);
    if (!result) {
      return { ok: false, error: "Move failed", code: "DEVICE_MOVE_FAILED" };
    }
    return {
      ok: true,
      value: { name: payload.name, x: payload.x, y: payload.y },
      confidence: 1,
    };
  } catch (e) {
    return { ok: false, error: String(e), code: "DEVICE_MOVE_FAILED" };
  }
}

/**
 * Listar dispositivos
 */
export function listDevices(net: any): DevicePrimitiveResult {
  try {
    const count = net.getDeviceCount();
    const devices: Array<{ name: string; model: string; type: number; power: boolean }> = [];
    
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
    
    return {
      ok: true,
      value: { devices, count },
      evidence: { devices, count },
      confidence: 1,
    };
  } catch (e) {
    return { ok: false, error: String(e), code: "DEVICE_LIST_FAILED" };
  }
}

registerPrimitive({
  id: "device.add",
  domain: "device" as PrimitiveDomain,
  implementation: ((payload: any, ctx: { net: any; lw: any }) => addDevice(payload, ctx.net, ctx.lw)) as any,
});

registerPrimitive({
  id: "device.remove",
  domain: "device" as PrimitiveDomain,
  implementation: ((payload: any, ctx: { net: any; lw: any }) => removeDevice(payload, ctx.net, ctx.lw)) as any,
});

registerPrimitive({
  id: "device.rename",
  domain: "device" as PrimitiveDomain,
  implementation: ((payload: any, ctx: { net: any; lw: any }) => renameDevice(payload, ctx.net)) as any,
});

registerPrimitive({
  id: "device.move",
  domain: "device" as PrimitiveDomain,
  implementation: ((payload: any, ctx: { net: any; lw: any }) => moveDevice(payload, ctx.net)) as any,
});

registerPrimitive({
  id: "device.list",
  domain: "device" as PrimitiveDomain,
  implementation: ((payload: any, ctx: { net: any; lw: any }) => listDevices(ctx.net)) as any,
});