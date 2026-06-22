import { createErrorResult, createSuccessResult } from "./result-factories";
import type { PtRuntimeApi } from "../pt-api/pt-deps";
import type { PtResult } from "../pt-api/pt-results";

export interface DevicePowerPayload {
  type: "devicePower";
  device: string;
  power?: boolean;
}

export function handleDevicePower(payload: DevicePowerPayload, api: PtRuntimeApi): PtResult {
  if (!payload || !payload.device) {
    return createErrorResult("Missing payload.device", "INVALID_PAYLOAD");
  }

  var net = api.ipc.network();
  var dev = net.getDevice(payload.device);
  if (!dev) {
    return createErrorResult("Device not found: " + payload.device, "DEVICE_NOT_FOUND");
  }

  if (typeof dev.getPower !== "function") {
    return createErrorResult("Device does not support power control", "NOT_SUPPORTED");
  }

  if (payload.power !== undefined) {
    try {
      dev.setPower(payload.power);
    } catch (e) {
      return createErrorResult("Failed to set power: " + String(e), "HW_FAILURE");
    }
  }

  var currentPower: boolean = false;
  try { currentPower = !!dev.getPower(); } catch {}

  return createSuccessResult({
    device: payload.device,
    power: currentPower,
    requested: payload.power,
  });
}
