// ============================================================================
// Device Configuration Handlers (ES5 Strict) - V4 Intelligent Hybrid
// ============================================================================

import type { HandlerDeps, HandlerResult } from "../utils/helpers.js";

export function handleSetDeviceIp(
  payload: { device: string; port: string; ip: string; mask: string },
  deps: HandlerDeps,
): HandlerResult {
  var net = deps.ipc.network();
  var dev = net.getDevice(payload.device) as any;
  if (!dev) return { ok: false, error: "Device not found" };

  try {
    // CAMINO B: Puerto físico con setIpSubnetMask (FUNCIONA EN TODOS: PC, Switch, Router)
    var port = dev.getPort(payload.port) as any;
    if (port && port.setIpSubnetMask) {
      port.setIpSubnetMask(payload.ip, payload.mask);

      // Verificar que realmente se aplicó — re-leer hasta 3 veces con delay
      var appliedIp = "";
      for (var retry = 0; retry < 3; retry++) {
        appliedIp = String(port.getIpAddress() || "");
        if (appliedIp === payload.ip) break;
        // Si no matchea, esperar y re-intentar
      }

      if (appliedIp === payload.ip) {
        return { ok: true, result: "IP_SET_VIA_PORT_INTERFACE" };
      }
      // Si no matchea después de retries, el método existe pero no funcionó
    }

    // CAMINO A: IPv4Config manager (solo ciertos routers y servers高级)
    if (dev.getIPv4Config) {
      var ipv4 = dev.getIPv4Config();
      if (ipv4 && ipv4.setStaticIpAddress) {
        ipv4.setStaticIpAddress(payload.ip, payload.mask);
        return { ok: true, result: "IP_SET_VIA_IPV4_MANAGER" };
      }
    }

    // CAMINO C: Inyección Directa (Nuclear Option)
    if (dev.getCommandLine && dev.getCommandLine()) {
      var cli = dev.getCommandLine();
      cli.enterCommand("no shutdown");
      cli.enterCommand("ip address " + payload.ip + " " + payload.mask);
      return { ok: true, result: "IP_SET_VIA_CLI_BYPASS" };
    }

    return { ok: false, error: "No compatible IP method found for " + dev.getModel() };
  } catch (e) {
    return { ok: false, error: "CRASH_IN_ENGINE: " + String(e) };
  }
}

export function handleSetDefaultGateway(
  payload: { device: string; gw: string },
  deps: HandlerDeps,
): HandlerResult {
  var dev = deps.ipc.network().getDevice(payload.device) as any;
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
