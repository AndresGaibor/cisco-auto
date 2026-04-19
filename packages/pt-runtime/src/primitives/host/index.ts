// ============================================================================
// Host Primitives - Configuración de host (PC/Server)
// ============================================================================

import { registerPrimitive } from "../primitive-registry";
import type { PrimitiveDomain } from "../primitive-registry";

export interface SetIpPayload {
  type: "setIp";
  device: string;
  port: string;
  ip: string;
  mask: string;
}

export interface SetGatewayPayload {
  type: "setGateway";
  device: string;
  port: string;
  gateway: string;
}

export interface SetDnsPayload {
  type: "setDns";
  device: string;
  port: string;
  dns: string;
}

export interface SetDhcpPayload {
  type: "setDhcp";
  device: string;
  port: string;
  enabled: boolean;
}

export interface HostPrimitiveResult {
  ok: boolean;
  value?: unknown;
  error?: string;
  code?: string;
  warnings?: string[];
  evidence?: Record<string, unknown>;
  confidence?: number;
}

export function setIp(payload: SetIpPayload, net: any): HostPrimitiveResult {
  try {
    const device = net.getDevice(payload.device);
    if (!device) {
      return { ok: false, error: "Device not found", code: "DEVICE_NOT_FOUND" };
    }

    const port = device.getPort(payload.port);
    if (!port) {
      return { ok: false, error: "Port not found", code: "PORT_NOT_FOUND" };
    }

    port.setIpSubnetMask(payload.ip, payload.mask);
    return {
      ok: true,
      value: { device: payload.device, port: payload.port, ip: payload.ip, mask: payload.mask },
      evidence: { ip: payload.ip, mask: payload.mask },
      confidence: 1,
    };
  } catch (e) {
    return { ok: false, error: String(e), code: "HOST_IP_SET_FAILED" };
  }
}

export function setGateway(payload: SetGatewayPayload, net: any): HostPrimitiveResult {
  try {
    const device = net.getDevice(payload.device);
    if (!device) {
      return { ok: false, error: "Device not found", code: "DEVICE_NOT_FOUND" };
    }

    const port = device.getPort(payload.port);
    if (!port) {
      return { ok: false, error: "Port not found", code: "PORT_NOT_FOUND" };
    }

    port.setDefaultGateway(payload.gateway);
    return {
      ok: true,
      value: { device: payload.device, port: payload.port, gateway: payload.gateway },
      evidence: { gateway: payload.gateway },
      confidence: 1,
    };
  } catch (e) {
    return { ok: false, error: String(e), code: "HOST_GATEWAY_SET_FAILED" };
  }
}

export function setDns(payload: SetDnsPayload, net: any): HostPrimitiveResult {
  try {
    const device = net.getDevice(payload.device);
    if (!device) {
      return { ok: false, error: "Device not found", code: "DEVICE_NOT_FOUND" };
    }

    const port = device.getPort(payload.port);
    if (!port) {
      return { ok: false, error: "Port not found", code: "PORT_NOT_FOUND" };
    }

    port.setDnsServerIp(payload.dns);
    return {
      ok: true,
      value: { device: payload.device, port: payload.port, dns: payload.dns },
      evidence: { dns: payload.dns },
      confidence: 1,
    };
  } catch (e) {
    return { ok: false, error: String(e), code: "HOST_DNS_SET_FAILED" };
  }
}

export function setDhcp(payload: SetDhcpPayload, net: any): HostPrimitiveResult {
  try {
    const device = net.getDevice(payload.device);
    if (!device) {
      return { ok: false, error: "Device not found", code: "DEVICE_NOT_FOUND" };
    }

    const port = device.getPort(payload.port);
    if (!port) {
      return { ok: false, error: "Port not found", code: "PORT_NOT_FOUND" };
    }

    port.setDhcpEnabled(payload.enabled);
    return {
      ok: true,
      value: { device: payload.device, port: payload.port, dhcp: payload.enabled },
      evidence: { dhcp: payload.enabled },
      confidence: 1,
    };
  } catch (e) {
    return { ok: false, error: String(e), code: "HOST_DHCP_SET_FAILED" };
  }
}

registerPrimitive({
  id: "host.setIp",
  domain: "host" as PrimitiveDomain,
  implementation: ((payload: any, ctx: { net: any; lw: any }) => setIp(payload, ctx.net)) as any,
});

registerPrimitive({
  id: "host.setGateway",
  domain: "host" as PrimitiveDomain,
  implementation: ((payload: any, ctx: { net: any; lw: any }) => setGateway(payload, ctx.net)) as any,
});

registerPrimitive({
  id: "host.setDns",
  domain: "host" as PrimitiveDomain,
  implementation: ((payload: any, ctx: { net: any; lw: any }) => setDns(payload, ctx.net)) as any,
});

registerPrimitive({
  id: "host.setDhcp",
  domain: "host" as PrimitiveDomain,
  implementation: ((payload: any, ctx: { net: any; lw: any }) => setDhcp(payload, ctx.net)) as any,
});