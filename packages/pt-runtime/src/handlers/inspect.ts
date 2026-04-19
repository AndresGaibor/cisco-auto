// ============================================================================
// Inspect Handlers - Pure functions for device inspection and snapshots
// ============================================================================

import type { HandlerDeps, HandlerResult } from "../utils/helpers";
import { getCableTypeName } from "../utils/constants";
import { parseDeviceXml } from "../utils/device-xml-parser";
import type { ParsedDeviceXml } from "../utils/device-xml-parser";

// ============================================================================
// Payload Types
// ============================================================================

export interface InspectPayload {
  type: "inspect";
  device: string;
  includeXml?: boolean;
}

export interface SnapshotPayload {
  type: "snapshot";
}

export interface HardwareInfoPayload {
  type: "hardwareInfo";
}

export interface HardwareCatalogPayload {
  type: "hardwareCatalog";
  limit?: number;
}

export interface CommandLogPayload {
  type: "commandLog";
  limit?: number;
}

// ============================================================================
// Handlers
// ============================================================================

/**
 * Get detailed information about a specific device
 */
export function handleInspect(payload: InspectPayload, deps: HandlerDeps): HandlerResult {
  const { getNet } = deps;
  const net = getNet();

  const device = net.getDevice(payload.device);
  if (!device) {
    return { ok: false, error: `Device not found: ${payload.device}`, code: "DEVICE_NOT_FOUND" };
  }

  const portCount = device.getPortCount();
  const ports: Array<Record<string, unknown>> = [];
  let dhcp = false;

  // Intentar leer DHCP flag a nivel dispositivo
  try {
    dhcp = !!device.getDhcpFlag();
  } catch {
    /* ignore */
  }

  for (let i = 0; i < portCount; i++) {
    try {
      const port = device.getPortAt(i);
      if (!port) continue;

      const portInfo: Record<string, unknown> = { name: port.getName() };

      try {
        portInfo.ipAddress = String(port.getIpAddress());
      } catch {
        // PT API puede no soportar esta propiedad en el puerto
      }

      try {
        portInfo.subnetMask = String(port.getSubnetMask());
      } catch {
        // PT API puede no soportar esta propiedad en el puerto
      }

      try {
        portInfo.macAddress = String(port.getMacAddress());
      } catch {
        // PT API puede no soportar esta propiedad en el puerto
      }

      try {
        portInfo.defaultGateway = String(port.getDefaultGateway());
      } catch {
        // PT API puede no soportar esta propiedad en el puerto
      }

      // Leer DHCP status del puerto si no está a nivel dispositivo
      if (!dhcp) {
        try {
          if (port.isDhcpClientOn()) {
            portInfo.dhcp = true;
            dhcp = true;
          }
        } catch {
          // PT API puede no soportar isDhcpClientOn
        }
      }

      ports.push(portInfo);
    } catch {
      // Puerto inaccesible, continuar con el siguiente
    }
  }

  const result: Record<string, unknown> = {
    ok: true,
    name: device.getName(),
    model: device.getModel(),
    type: device.getType(),
    power: device.getPower(),
    ports,
    dhcp,
  };

  // Poblar campos de IP a nivel dispositivo si están disponibles
  if (ports.length > 0) {
    try {
      result.ip = ports[0].ipAddress;
    } catch {
      // Propiedad no disponible
    }
    try {
      result.mask = ports[0].subnetMask;
    } catch {
      // Propiedad no disponible
    }
    try {
      result.gateway = ports[0].defaultGateway;
    } catch {
      // Propiedad no disponible
    }
  }

  const serializeToXml = device as unknown as { serializeToXml?: () => string };

  if (payload.includeXml && serializeToXml.serializeToXml) {
    try {
      const rawXml = serializeToXml.serializeToXml();
      result.xml = rawXml;
      result.xmlParsed = parseDeviceXml(rawXml) as ParsedDeviceXml;
    } catch {
      // ignore
    }
  }

  return result as HandlerResult;
}

/**
 * Get a complete snapshot of the network topology
 * Includes devices and links
 */
export function handleSnapshot(_payload: SnapshotPayload, deps: HandlerDeps): HandlerResult {
  const { getNet } = deps;
  const net = getNet();

  const count = net.getDeviceCount();
  const devices: Record<string, Record<string, unknown>> = {};
  const links: Record<string, Record<string, unknown>> = {};

  for (let i = 0; i < count; i++) {
    const device = net.getDeviceAt(i);
    if (!device) continue;

    const name = device.getName();
    const portCount = device.getPortCount();
    const ports: Array<Record<string, unknown>> = [];

    for (let p = 0; p < portCount; p++) {
      try {
        const port = device.getPortAt(p);
        if (!port) continue;

        const portName = port.getName();
        const portInfo: Record<string, unknown> = { name: portName };

        // Try to get IP info
        try {
          portInfo.ipAddress = port.getIpAddress();
          portInfo.subnetMask = port.getSubnetMask();
        } catch {
          // PT API puede no soportar estas propiedades
        }

        ports.push(portInfo);
      } catch {
        // Puerto inaccesible, usar placeholder
        ports.push({ name: `port${p}` });
      }
    }

    devices[name] = {
      name,
      model: device.getModel(),
      type: device.getType(),
      power: device.getPower(),
      ports,
    };
  }

  return {
    ok: true,
    version: "1.0",
    timestamp: Date.now(),
    devices,
    links,
    metadata: {
      deviceCount: count,
      linkCount: Object.keys(links).length,
    },
  };
}

/**
 * Get hardware factory information
 */
export function handleHardwareInfo(
  _payload: HardwareInfoPayload,
  deps: HandlerDeps,
): HandlerResult {
  // Note: This requires ipc access which isn't in deps
  // The compose function will handle this specially
  return {
    ok: true,
    requiresIpc: true,
    handler: "hardwareInfo",
  };
}

/**
 * Get hardware catalog from factory
 */
export function handleHardwareCatalog(
  payload: HardwareCatalogPayload,
  deps: HandlerDeps,
): HandlerResult {
  // Note: This requires ipc access which isn't in deps
  return {
    ok: true,
    requiresIpc: true,
    handler: "hardwareCatalog",
    limit: payload.limit || 50,
  };
}

/**
 * Get command log entries
 */
export function handleCommandLog(payload: CommandLogPayload, deps: HandlerDeps): HandlerResult {
  // Note: This requires ipc access which isn't in deps
  return {
    ok: true,
    requiresIpc: true,
    handler: "commandLog",
    limit: payload.limit || 100,
  };
}
