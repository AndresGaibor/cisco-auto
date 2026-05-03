// ============================================================================
// Device Configuration Handlers - Sync wrappers
// ============================================================================

import { createErrorResult, createSuccessResult } from "./result-factories";
import type { PtRuntimeApi } from "../pt-api/pt-deps.js";
import type { PtResult } from "../pt-api/pt-results.js";
import {
  buildDeferredCommandPlan,
  buildDeferredConfigPlan,
  startDeferredJobOrError,
} from "./deferred-job-factory.js";

export function handleSetDeviceIp(
  payload: { device: string; port: string; ip: string; mask: string },
  api: PtRuntimeApi,
): PtResult {
  const net = (api as any).ipc.network();
  const dev = net.getDevice(payload.device) as any;
  if (!dev) return { ok: false, error: "Device not found" };

  try {
    const port = dev.getPort(payload.port) as any;
    if (port && port.setIpSubnetMask) {
      port.setIpSubnetMask(payload.ip, payload.mask);
      const appliedIp = port.getIpAddress?.() ?? "";
      if (String(appliedIp) === payload.ip) {
        return { ok: true, result: "IP_SET_VIA_PORT_INTERFACE" };
      }
    }

    if (typeof dev.getIPv4Config === "function") {
      const ipv4 = dev.getIPv4Config();
      if (ipv4 && ipv4.setStaticIpAddress) {
        ipv4.setStaticIpAddress(payload.ip, payload.mask);
        return { ok: true, result: "IP_SET_VIA_IPV4_MANAGER" };
      }
    }

    if (dev.getCommandLine && dev.getCommandLine()) {
      const type = dev.getType ? dev.getType() : -1;
      const model = dev.getModel ? String(dev.getModel()).toLowerCase() : "";
      const isPc = (
        type === 8 ||
        type === 9 ||
        model.indexOf("pc") >= 0 ||
        model.indexOf("server") >= 0
      );

      if (isPc) {
        const plan = buildDeferredCommandPlan(payload.device, {
          command: `ipconfig ${payload.ip} ${payload.mask}`,
          sessionKind: "host",
          source: "setDeviceIp",
          ensurePrivileged: false,
          stopOnError: true,
          commandTimeoutMs: 10000,
          stallTimeoutMs: 15000,
          closeSession: false,
        });

        return startDeferredJobOrError(plan, api);
      }

      const plan = buildDeferredConfigPlan(payload.device, {
        commands: [
          `interface ${payload.port}`,
          `ip address ${payload.ip} ${payload.mask}`,
          "no shutdown",
        ],
        source: "setDeviceIp",
        save: false,
        stopOnError: true,
        ensurePrivileged: true,
        dismissInitialDialog: false,
        commandTimeoutMs: 10000,
        stallTimeoutMs: 15000,
        closeSession: false,
      });

      return startDeferredJobOrError(plan, api);
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
  const dev = (api as any).ipc.network().getDevice(payload.device) as any;
  if (!dev) return { ok: false, error: "Device not found" };

  try {
    if (typeof dev.getIPv4Config === "function") {
      const ipv4 = dev.getIPv4Config();
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