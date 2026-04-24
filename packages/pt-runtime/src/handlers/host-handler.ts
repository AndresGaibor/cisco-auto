// ============================================================================
// Host Handler - Configuración de host (PC/Server sin CLI)
// ============================================================================

import type { PtRuntimeApi } from "../pt-api/pt-deps.js";
import type { PtResult } from "../pt-api/pt-results.js";
import type { ConfigHostPayload } from "./ios-payloads.js";
import { createErrorResult, createSuccessResult } from "./result-factories";

import { createCommandExecutor } from "../terminal/index";

export async function handleConfigHost(payload: ConfigHostPayload, api: PtRuntimeApi): Promise<PtResult> {
  const device = api.getDeviceByName(payload.device);
  if (!device) {
    return createErrorResult(`Device not found: ${payload.device}`, "DEVICE_NOT_FOUND");
  }

  // Obtenemos el objeto real de Packet Tracer
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
        // Método 1: Puerto Directo
        try { port.setIpSubnetMask(payload.ip, payload.mask); } catch(e) {}
        // Método 2: Device API
        try { (ptDevice as any).setIpSubnetMask?.(payload.ip, payload.mask); } catch(e) {}
        
        // Método 3: Terminal Force (ROBUSTA)
        if (ptDevice.getCommandLine) {
            const cli = ptDevice.getCommandLine();
            if (cli) {
                const executor = createCommandExecutor({ commandTimeoutMs: 10000 });
                await executor.executeCommand(
                    payload.device, 
                    "ipconfig " + payload.ip + " " + payload.mask + " " + (payload.gateway || ""),
                    cli as any
                );
            }
        }
      }
      
      if (payload.gateway) {
        try { (ptDevice as any).setDefaultGateway?.(payload.gateway); } catch(e) {}
      }
    }

    // VERIFICACIÓN: Leer de vuelta lo que PT guardó (polling breve)
    var currentIp = "0.0.0.0";
    for (var i = 0; i < 5; i++) {
        currentIp = String(port.getIpAddress() || "0.0.0.0");
        if (!payload.ip || currentIp === payload.ip) break;
        await new Promise(r => setTimeout(r, 200));
    }
    
    var matches = !payload.ip || currentIp === payload.ip;

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
