import { createErrorResult, createSuccessResult } from "./result-factories";
import type { PtRuntimeApi } from "../pt-api/pt-deps";
import type { PtResult } from "../pt-api/pt-results";

export interface DeviceDhcpFlagPayload {
  type: "deviceDhcpFlag";
  device: string;
  dhcpFlag?: boolean;
}

export function handleDeviceDhcpFlag(payload: DeviceDhcpFlagPayload, api: PtRuntimeApi): PtResult {
  if (!payload || !payload.device) {
    return createErrorResult("Missing payload.device", "INVALID_PAYLOAD");
  }

  var net = api.ipc.network();
  var dev = net.getDevice(payload.device);
  if (!dev) {
    return createErrorResult("Device not found: " + payload.device, "DEVICE_NOT_FOUND");
  }

  if (typeof dev.setDhcpFlag !== "function") {
    return createErrorResult("Device does not support DHCP flag", "NOT_SUPPORTED");
  }

  if (payload.dhcpFlag !== undefined) {
    try {
      dev.setDhcpFlag(payload.dhcpFlag);
    } catch (e) {
      return createErrorResult("Failed to set DHCP flag: " + String(e), "HW_FAILURE");
    }
  }

  var currentFlag = false;
  try { currentFlag = !!dev.getDhcpFlag(); } catch {}

  return createSuccessResult({
    device: payload.device,
    dhcpFlag: currentFlag,
    requested: payload.dhcpFlag,
  });
}
