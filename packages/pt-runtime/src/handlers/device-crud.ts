// ============================================================================
// Device CRUD Handlers (ES5 Strict) - V3 Resilient
// ============================================================================

import type { HandlerDeps, HandlerResult } from "../utils/helpers.js";
import {
  resolveModel,
  getDeviceTypeCandidates,
  createDeviceWithFallback,
  getDeviceTypeString,
  collectPorts,
} from "../utils/helpers.js";
import { validatePayload } from "./payload-schemas.js";

/**
 * Payload para agregar un dispositivo nuevo al workspace de PT.
 * Resolución de modelo: si no se especifica model, infiere desde deviceType.
 */
export interface AddDevicePayload {
  type: "addDevice";
  model?: string;
  name?: string;
  x?: number;
  y?: number;
  deviceType?: number;
}

/**
 * Payload para eliminar un dispositivo existente.
 * Soporta eliminación individual por nombre o limpieza total ("ALL").
 */
export interface RemoveDevicePayload {
  type: "removeDevice";
  name: string;
}

/**
 * Agrega un dispositivo nuevo al workspace de Packet Tracer.
 * Usa el LogicalWorkspace para crear el dispositivo con modelo y posición.
 * 
 * @param payload - AddDevicePayload con model (opcional), name, x, y
 * @param deps - HandlerDeps con getLW(), getNet() y helpers
 * @returns HandlerResult con datos del dispositivo creado o error
 * 
 * @example
 * handleAddDevice({ type: "addDevice", model: "2960-24TT", name: "S1", x: 200, y: 300 }, deps)
 * // → { ok: true, name: "S1", model: "2960-24TT", type: "switch", power: true, ports: [...] }
 */
export function handleAddDevice(payload: AddDevicePayload, deps: HandlerDeps): HandlerResult {
  var validation = validatePayload("addDevice", payload);
  if (!validation.ok) {
    return { ok: false, code: validation.code, error: validation.error };
  }
  deps.dprint("[handleAddDevice] CALLED with payload=" + JSON.stringify({model: payload.model, name: payload.name, x: payload.x, y: payload.y}));
  var lw = deps.getLW();
  var net = deps.getNet();
  var model: string;

  deps.dprint("[handleAddDevice] payload.model=" + payload.model);

  try {
    model = resolveModel(payload.model);
    deps.dprint("[handleAddDevice] resolved model=" + model);
  } catch (error) {
    deps.dprint("[handleAddDevice] resolveModel failed: " + (error instanceof Error ? error.message : String(error)));
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      code: "INVALID_INPUT",
    };
  }
  var name = payload.name || model;
  var x = payload.x ?? 100;
  var y = payload.y ?? 100;

  var typeList =
    payload.deviceType !== undefined ? [payload.deviceType] : getDeviceTypeCandidates(model);
  deps.dprint("[handleAddDevice] typeList=" + JSON.stringify(typeList));

  var created = createDeviceWithFallback(model, x, y, typeList, lw, net);
  deps.dprint("[handleAddDevice] createDeviceWithFallback result=" + (created ? created.autoName : "null"));

  if (!created) return { ok: false, error: "Creation failed", code: "DEVICE_CREATION_FAILED" };

  created.device.setName(name);
  if (created.device.skipBoot) created.device.skipBoot();

  return {
    ok: true,
    name: name,
    model: model,
    type: getDeviceTypeString(created.typeId),
    power: true,
    x: x,
    y: y,
    ports: collectPorts(created.device),
  };
}

/**
 * Elimina un dispositivo del workspace de PT.
 * "ALL" o nombre vacío elimina todos los dispositivos (bulk remove).
 * 
 * @param payload - RemoveDevicePayload con name del dispositivo
 * @param deps - HandlerDeps con acceso a getLW() y getNet()
 * @returns HandlerResult con éxito o error si no se encontró
 */
export function handleRemoveDevice(payload: RemoveDevicePayload, deps: HandlerDeps): HandlerResult {
  var validation = validatePayload("removeDevice", payload);
  if (!validation.ok) {
    return { ok: false, code: validation.code, error: validation.error };
  }
  var net = deps.getNet();
  var lw = deps.getLW();
  var dprint = deps.dprint;

  if (payload.name === "ALL") {
    try {
      var deviceCount = net.getDeviceCount();
      dprint("[handler:removeDevice] Bulk remove started. Count: " + deviceCount);
      for (var deviceIndex = deviceCount - 1; deviceIndex >= 0; deviceIndex--) {
        try {
          var device = net.getDeviceAt(deviceIndex);
          if (device) lw.removeDevice(device.getName());
        } catch (inner) {
          dprint("[handler:removeDevice] Skip device at " + deviceIndex);
        }
      }
      return { ok: true, result: "CLEAN_ATTEMPT_FINISHED" };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  }

  if (!payload.name) {
    return { ok: false, error: "Device name is required", code: "INVALID_PAYLOAD" };
  }

  try {
    var beforeCount = net.getDeviceCount();
    var lwAny = lw as any;
    var removeFn = lwAny.removeDevice || lwAny.deleteDevice || lwAny.removeObject || lwAny.deleteObject;

    if (!removeFn) {
      return { ok: false, error: "Remove operation not supported: " + payload.name, code: "UNSUPPORTED_OPERATION" };
    }

    removeFn.call(lw, payload.name);

    if (net.getDeviceCount() === beforeCount) {
      return { ok: false, error: "Device not found: " + payload.name, code: "DEVICE_NOT_FOUND" };
    }

    if (net.getDevice(payload.name)) {
      return { ok: false, error: "Device still exists after remove: " + payload.name, code: "REMOVE_FAILED" };
    }

    return { ok: true, name: payload.name };
  } catch (e) {
    return { ok: false, error: "Device not found or busy: " + payload.name, code: "DEVICE_NOT_FOUND" };
  }
}

export function handleRenameDevice(payload: any, deps: HandlerDeps): HandlerResult {
  var validation = validatePayload("renameDevice", payload);
  if (!validation.ok) {
    return { ok: false, code: validation.code, error: validation.error };
  }
  try {
    const device = deps.getDeviceByName(payload.oldName);

    if (!device) {
      return {
        ok: false,
        error: "Device not found: " + payload.oldName,
        code: "DEVICE_NOT_FOUND",
      };
    }

    if (!payload.newName || typeof payload.newName !== "string") {
      return {
        ok: false,
        error: "New device name is required",
        code: "INVALID_DEVICE_NAME",
      };
    }

    if (typeof device.setName !== "function") {
      return {
        ok: false,
        error: "Device does not support setName: " + payload.oldName,
        code: "UNSUPPORTED_DEVICE_OPERATION",
      };
    }

    const renameResult = (device as any).setName(payload.newName);

    if (renameResult === false) {
      return {
        ok: false,
        error: "Rename rejected by Packet Tracer: " + payload.oldName + " -> " + payload.newName,
        code: "RENAME_REJECTED",
      };
    }

    return {
      ok: true,
      oldName: payload.oldName,
      newName: payload.newName,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      code: "RENAME_FAILED",
    };
  }
}

export function handleMoveDevice(payload: any, deps: HandlerDeps): HandlerResult {
  var validation = validatePayload("moveDevice", payload);
  if (!validation.ok) {
    return { ok: false, code: validation.code, error: validation.error };
  }
  var device = deps.getNet().getDevice(payload.name);
  if (!device) return { ok: false, error: "Device not found: " + payload.name, code: "DEVICE_NOT_FOUND" };
  var x = Math.round(payload.x);
  var y = Math.round(payload.y);
  try {
    if (device.moveToLocation) {
      if (device.moveToLocation(x, y) === false) {
        return { ok: false, error: "Move rejected by Packet Tracer: " + payload.name, code: "MOVE_REJECTED" };
      }
    } else if (device.moveToLocationCentered) {
      if (device.moveToLocationCentered(x, y) === false) {
        return { ok: false, error: "Move rejected by Packet Tracer: " + payload.name, code: "MOVE_REJECTED" };
      }
    } else {
      return { ok: false, error: "Device does not support move operation: " + payload.name, code: "UNSUPPORTED_OPERATION" };
    }
    return { ok: true, name: payload.name, x: x, y: y };
  } catch (e) {
    return { ok: false, error: "Move failed: " + String(e), code: "MOVE_FAILED" };
  }
}
