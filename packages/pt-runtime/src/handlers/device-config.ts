// ============================================================================
// Device Configuration Handlers (ES5 Strict) - V4 Intelligent Hybrid
// ============================================================================

import { createCommandExecutor } from "../terminal/index";
import { createErrorResult, createSuccessResult } from "./result-factories";
import type { PtRuntimeApi } from "../pt-api/pt-deps.js";
import type { PtResult } from "../pt-api/pt-results.js";

export async function handleSetDeviceIp(
  payload: { device: string; port: string; ip: string; mask: string },
  api: PtRuntimeApi,
): Promise<PtResult> {
  var net = (api as any).ipc.network();
  var dev = net.getDevice(payload.device) as any;
  if (!dev) return { ok: false, error: "Device not found" };

  try {
    // CAMINO B: Puerto físico con setIpSubnetMask (FUNCIONA EN TODOS: PC, Switch, Router)
    var port = dev.getPort(payload.port) as any;
    if (port && port.setIpSubnetMask) {
      port.setIpSubnetMask(payload.ip, payload.mask);

      // Verificar que realmente se aplicó
      var appliedIp = "";
      for (var retry = 0; retry < 3; retry++) {
        appliedIp = String(port.getIpAddress() || "");
        if (appliedIp === payload.ip) break;
        // Si no matchea, esperar brevemente y re-intentar (polling interno rápido)
        await new Promise(r => setTimeout(r, 100));
      }

      if (appliedIp === payload.ip) {
        return { ok: true, result: "IP_SET_VIA_PORT_INTERFACE" };
      }
    }

    // CAMINO A: IPv4Config manager (solo ciertos routers y servers)
    if (dev.getIPv4Config) {
      var ipv4 = dev.getIPv4Config();
      if (ipv4 && ipv4.setStaticIpAddress) {
        ipv4.setStaticIpAddress(payload.ip, payload.mask);
        return { ok: true, result: "IP_SET_VIA_IPV4_MANAGER" };
      }
    }

    // CAMINO C: Inyección via Terminal (ROBUSTA)
    if (dev.getCommandLine && dev.getCommandLine()) {
      const cli = dev.getCommandLine();
      const executor = createCommandExecutor({ commandTimeoutMs: 10000 });
      
      const type = dev.getType ? dev.getType() : -1;
      const isPc = (type === 8 || type === 9);

      if (isPc) {
        const cmd = `ipconfig ${payload.ip} ${payload.mask}`;
        const res = await executor.executeCommand(payload.device, cmd, cli as any);
        if (res.ok) {
            return createSuccessResult({ result: "IP_SET_VIA_PC_TERMINAL" }, { code: res.code });
        } else {
            return createErrorResult("Failed to set IP via PC Terminal", res.code, { raw: res.output });
        }
      } else {
        // Router/Switch: requiere conf t
        const res = await executor.executeCommand(payload.device, "configure terminal", cli as any);
        if (!res.ok) return createErrorResult("Failed to enter config mode", res.code, { raw: res.output });
        
        await executor.executeCommand(payload.device, `interface ${payload.port}`, cli as any);
        await executor.executeCommand(payload.device, `ip address ${payload.ip} ${payload.mask}`, cli as any);
        await executor.executeCommand(payload.device, "no shutdown", cli as any);
        await executor.executeCommand(payload.device, "end", cli as any);
        
        return createSuccessResult({ result: "IP_SET_VIA_IOS_TERMINAL" });
      }
    }

    return createErrorResult("No compatible IP method found for " + dev.getModel(), "NOT_SUPPORTED");
  } catch (e) {
    return createErrorResult("CRASH_IN_ENGINE: " + String(e), "ENGINE_CRASH");
  }
}

export function handleSetDefaultGateway(
  payload: { device: string; gw: string },
  api: PtRuntimeApi,
): PtResult {
  var dev = (api as any).ipc.network().getDevice(payload.device) as any;
  if (!dev) return { ok: false, error: "Device not found" };

  try {
    if (dev.getIPv4Config) {
      var ipv4 = dev.getIPv4Config();
      if (ipv4 && ipv4.setGateway) {
        ipv4.setGateway(payload.gw);
        return { ok: true, result: "GW_SET_VIA_MANAGER" };
      }
    }
    if (typeof dev.setGateway === "function") {
      dev.setGateway(payload.gw);
      return { ok: true, result: "GW_SET_VIA_DEVICE" };
    }
    return { ok: false, error: "Method setGateway not available" };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
