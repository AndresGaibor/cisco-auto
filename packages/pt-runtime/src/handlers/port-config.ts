import { createErrorResult, createSuccessResult } from "./result-factories";
import type { PtRuntimeApi } from "../pt-api/pt-deps";
import type { PtResult } from "../pt-api/pt-results";

export interface SetPortMtuPayload {
  type: "setPortMtu";
  device: string;
  port: string;
  mtu: number;
}

export interface SetPortDnsPayload {
  type: "setPortDns";
  device: string;
  port: string;
  dns: string;
}

export function handleSetPortMtu(payload: SetPortMtuPayload, api: PtRuntimeApi): PtResult {
  if (!payload || !payload.device || !payload.port) {
    return createErrorResult("Missing payload.device or payload.port", "INVALID_PAYLOAD");
  }

  var mtu = Number(payload.mtu);
  if (!Number.isFinite(mtu) || mtu < 64 || mtu > 9216) {
    return createErrorResult("Invalid MTU value: " + payload.mtu + " (must be 64-9216)", "INVALID_INPUT");
  }

  var net = api.ipc.network();
  var dev = net.getDevice(payload.device);
  if (!dev) return createErrorResult("Device not found: " + payload.device, "DEVICE_NOT_FOUND");

  var port = typeof dev.getPort === "function" ? dev.getPort(payload.port) : null;
  if (!port) return createErrorResult("Port not found: " + payload.port, "INVALID_PORT");

  if (typeof port.setMtu !== "function") {
    return createErrorResult("Port does not support setMtu", "NOT_SUPPORTED");
  }

  try {
    port.setMtu(mtu);
  } catch (e) {
    return createErrorResult("Failed to set MTU: " + String(e), "HW_FAILURE");
  }

  var currentMtu = -1;
  try { currentMtu = typeof port.getMtu === "function" ? port.getMtu() : -1; } catch {}

  return createSuccessResult({
    device: payload.device,
    port: payload.port,
    mtu: currentMtu,
  });
}

export function handleSetPortDns(payload: SetPortDnsPayload, api: PtRuntimeApi): PtResult {
  if (!payload || !payload.device || !payload.port) {
    return createErrorResult("Missing payload.device or payload.port", "INVALID_PAYLOAD");
  }

  var net = api.ipc.network();
  var dev = net.getDevice(payload.device);
  if (!dev) return createErrorResult("Device not found: " + payload.device, "DEVICE_NOT_FOUND");

  var port = typeof dev.getPort === "function" ? dev.getPort(payload.port) : null;
  if (!port) return createErrorResult("Port not found: " + payload.port, "INVALID_PORT");

  if (typeof port.setDnsServerIp !== "function") {
    return createErrorResult("Port does not support setDnsServerIp", "NOT_SUPPORTED");
  }

  try {
    port.setDnsServerIp(payload.dns);
  } catch (e) {
    return createErrorResult("Failed to set DNS: " + String(e), "HW_FAILURE");
  }

  return createSuccessResult({
    device: payload.device,
    port: payload.port,
    dns: payload.dns,
  });
}
