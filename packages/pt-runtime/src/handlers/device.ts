// ============================================================================
// Device Handlers - Entry point and aggregator
// ============================================================================

import type { HandlerDeps } from "../utils/helpers";
import {
  handleAddDevice,
  handleRemoveDevice,
  handleRenameDevice,
  handleMoveDevice,
} from "./device-crud";
import { handleListDevices } from "./device-discovery";

export * from "./device-crud";
export * from "./device-discovery";
export * from "./device-listing";

/** @deprecated Use functional handlers directly */
export class DeviceHandler {
  readonly name = "device";
  readonly supportedTypes = [
    "addDevice",
    "removeDevice",
    "listDevices",
    "renameDevice",
    "moveDevice",
  ];
  execute(payload: any, deps: HandlerDeps) {
    switch (payload.type) {
      case "addDevice":
        return handleAddDevice(payload, deps);
      case "removeDevice":
        return handleRemoveDevice(payload, deps);
      case "listDevices":
        return handleListDevices(payload, deps);
      case "renameDevice":
        return handleRenameDevice(payload, deps);
      case "moveDevice":
        return handleMoveDevice(payload, deps);
      default:
        return { ok: false, error: "Unknown type", code: "INVALID_INPUT" };
    }
  }
}
