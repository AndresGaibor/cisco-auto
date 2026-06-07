// ============================================================================
// Host Handler - Configuración de host (PC/Server sin CLI) (Sync)
// ============================================================================

import type { PtRuntimeApi } from "../pt-api/pt-deps.js";
import type { PtResult } from "../pt-api/pt-results.js";
import type { ConfigHostPayload } from "./ios-payloads.js";
import { createErrorResult, createSuccessResult } from "./result-factories";
import { validatePayload } from "./payload-schemas.js";

export function handleConfigHost(payload: ConfigHostPayload, api: PtRuntimeApi): PtResult {
  const validation = validatePayload("configHost", payload);
  if (!validation.ok) {
    return createErrorResult(validation.error, validation.code);
  }

  const device = api.getDeviceByName(payload.device);
  if (!device) {
    return createErrorResult(`Device not found: ${payload.device}`, "DEVICE_NOT_FOUND");
  }

  const ptDevice = api.ipc.network().getDevice(payload.device);
  if (!ptDevice) {
    return createErrorResult("Internal PT device reference lost", "NO_PT_DEVICE");
  }

  try {
    const port = ptDevice.getPortAt(0);
    if (!port) {
      return createErrorResult("No ports found on device", "NO_PORTS");
    }

    if (payload.dhcp === true) {
      try {
        port.setDhcpEnabled(true);
      } catch { /* ignore */ }
    } else {
      if (payload.ip && payload.mask) {
        try { port.setIpSubnetMask(payload.ip, payload.mask); } catch(e) {}
        try { (ptDevice as any).setIpSubnetMask?.(payload.ip, payload.mask); } catch(e) {}
      }
      
      if (payload.gateway) {
        try { (ptDevice as any).setDefaultGateway?.(payload.gateway); } catch(e) {}
      }
    }

    const currentIp = String(port.getIpAddress?.() ?? "0.0.0.0");
    const matches = !payload.ip || currentIp === payload.ip;

    if (payload.ip && !matches) {
      return createErrorResult(
        "Read-back validation failed. Requested: " + payload.ip + ", but PT reports: " + currentIp + ". Ensure simulation is not paused.",
        "VERIFICATION_FAILED"
      );
    }

    return createSuccessResult({
      device: payload.device,
      ip: currentIp,
      requestedIp: payload.ip,
      ok: true
    });
  } catch (e) {
    return createErrorResult("Hardware API Failure: " + String(e), "HW_FAILURE");
  }
}