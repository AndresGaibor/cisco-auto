// ============================================================================
// Host Handler - Configuración de host (PC/Server sin CLI)
// ============================================================================

import type { PtRuntimeApi } from "../pt-api/pt-deps.js";
import type { PtResult } from "../pt-api/pt-results.js";
import type { ConfigHostPayload } from "./ios-payloads.js";
import { createErrorResult, createSuccessResult } from "./result-factories";

export function handleConfigHost(payload: ConfigHostPayload, api: PtRuntimeApi): PtResult {
  const device = api.getDeviceByName(payload.device);
  if (!device) {
    return createErrorResult(`Device not found: ${payload.device}`, "DEVICE_NOT_FOUND");
  }

  if (!device.hasTerminal) {
    const net = device.getNetwork();
    if (!net) {
      return createErrorResult("Device has no network reference", "NO_NETWORK");
    }
    const dev = net.getDevice(payload.device);
    if (!dev) {
      return createErrorResult("Device not found in network", "DEVICE_NOT_FOUND");
    }
    const port = dev.getPortAt(0);
    if (!port) {
      return createErrorResult("No ports on device", "NO_PORTS");
    }

    if (payload.dhcp === true) {
      try {
        port.setDhcpEnabled(true);
      } catch {
        // PT API puede no soportar setDhcpEnabled en este dispositivo
      }
    } else {
      if (payload.ip && payload.mask) {
        port.setIpSubnetMask(payload.ip, payload.mask);
      }
      if (payload.gateway) {
        port.setDefaultGateway(payload.gateway);
      }
      if (payload.dns) {
        port.setDnsServerIp(payload.dns);
      }
    }

    return createSuccessResult({
      device: payload.device,
      ip: payload.ip,
      mask: payload.mask,
      gateway: payload.gateway,
    });
  }

  return createErrorResult("Device has CLI, use configIos instead", "INVALID_DEVICE_TYPE");
}
