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

export function handleAddDevice(payload: AddDevicePayload, deps: HandlerDeps): HandlerResult {
  var lw = deps.getLW();
  var net = deps.getNet();
  var model = resolveModel(payload.model);
  var name = payload.name || model;
  var x = payload.x ?? 100;
  var y = payload.y ?? 100;

  var typeList =
    payload.deviceType !== undefined ? [payload.deviceType] : getDeviceTypeCandidates(model);
  var created = createDeviceWithFallback(model, x, y, typeList, lw, net);

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

export function handleRemoveDevice(payload: RemoveDevicePayload, deps: HandlerDeps): HandlerResult {
  var net = deps.getNet();
  var lw = deps.getLW();
  var dprint = deps.dprint;

  if (payload.name === "ALL" || !payload.name) {
    try {
      var count = net.getDeviceCount();
      dprint("[handler:removeDevice] Bulk remove started. Count: " + count);
      for (var i = count - 1; i >= 0; i--) {
        try {
          var d = net.getDeviceAt(i);
          if (d) lw.removeDevice(d.getName());
        } catch (inner) {
          dprint("[handler:removeDevice] Skip device at " + i);
        }
      }
      return { ok: true, result: "CLEAN_ATTEMPT_FINISHED" };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  }

  try {
    lw.removeDevice(payload.name);
    return { ok: true, name: payload.name };
  } catch (e) {
    return { ok: false, error: "Device not found or busy: " + payload.name };
  }
}

export function handleRenameDevice(payload: any, deps: HandlerDeps): HandlerResult {
  var device = deps.getNet().getDevice(payload.oldName);
  if (!device) return { ok: false, error: "Not found" };
  device.setName(payload.newName);
  return { ok: true, oldName: payload.oldName, newName: payload.newName };
}

export function handleMoveDevice(payload: any, deps: HandlerDeps): HandlerResult {
  var device = deps.getNet().getDevice(payload.name);
  if (!device) return { ok: false, error: "Not found" };
  var x = Math.round(payload.x);
  var y = Math.round(payload.y);
  try {
    if (device.moveToLocation) device.moveToLocation(x, y);
    return { ok: true, name: payload.name, x: x, y: y };
  } catch (e) {
    return { ok: false, error: "Move failed" };
  }
}
