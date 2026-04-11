import type { HandlerDeps, HandlerPayload, HandlerPort, HandlerResult } from "../ports";
import type {
  AddDevicePayload,
  ListDevicesPayload,
  MoveDevicePayload,
  RemoveDevicePayload,
  RenameDevicePayload,
} from "./device";
import {
  handleAddDevice,
  handleListDevices,
  handleMoveDevice,
  handleRemoveDevice,
  handleRenameDevice,
} from "./device";

export class DeviceHandler implements HandlerPort {
  readonly name = "device";
  readonly supportedTypes = ["addDevice", "removeDevice", "listDevices", "renameDevice", "moveDevice"] as const;

  execute(payload: HandlerPayload, deps: HandlerDeps): HandlerResult {
    switch (payload.type) {
      case "addDevice":
        return handleAddDevice(payload as unknown as AddDevicePayload, deps);
      case "removeDevice":
        return handleRemoveDevice(payload as unknown as RemoveDevicePayload, deps);
      case "listDevices":
        return handleListDevices(payload as unknown as ListDevicesPayload, deps);
      case "renameDevice":
        return handleRenameDevice(payload as unknown as RenameDevicePayload, deps);
      case "moveDevice":
        return handleMoveDevice(payload as unknown as MoveDevicePayload, deps);
      default:
        return { ok: false, error: `Tipo de dispositivo desconocido: ${String(payload.type)}`, code: "UNSUPPORTED_OPERATION" };
    }
  }
}

export function createDeviceHandler(): DeviceHandler {
  return new DeviceHandler();
}
