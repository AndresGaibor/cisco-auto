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

      // Link Visibility (Green/Red)
      try {
        portInfo.status = port.isPortUp() ? 'up' : 'down';
        portInfo.protocol = port.isProtocolUp() ? 'up' : 'down';
      } catch {
        // PT API might not support status check on this port type
      }

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
        } catch (e) { /* ignore */ }
      }

      // PEER DISCOVERY (Optimizado)
      try {
        var l = (port as any).getLink ? (port as any).getLink() : null;
        if (l) {
          var p1 = l.getPort1();
          var p2 = l.getPort2();
          var other = (p1.getObjectUuid() === (port as any).getObjectUuid()) ? p2 : p1;
          if (other) {
            portInfo.link = other.getOwnerDevice().getName() + ":" + other.getName();
          }
        }
      } catch (e) { /* silent fail */ }

      ports.push(portInfo);
    } catch (e) {
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
    raw: device, // NECESSARY for host configuration services
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
  var net = deps.ipc.network();
  var count = net.getDeviceCount();
  var devices: Record<string, any> = {};
  var links: Record<string, any> = {};
  var processedLinks: Record<string, boolean> = {};

  for (var i = 0; i < count; i++) {
    var device = net.getDeviceAt(i);
    if (!device) continue;

    var name = device.getName();
    var portCount = device.getPortCount();
    var ports: any[] = [];

    for (var p = 0; p < portCount; p++) {
      try {
        var port = device.getPortAt(p);
        if (!port) continue;

        var portName = port.getName();
        var portInfo: Record<string, any> = { name: portName };

        // LED State (0 = Red/Down, 1 = Green/Up, 2 = Amber/Blocked)
        try {
          var isUp = false;
          if (typeof port.isPortUp === 'function' && port.isPortUp()) isUp = true;
          if (!isUp && typeof port.isProtocolUp === 'function' && port.isProtocolUp()) isUp = true;
          
          var light = -1;
          if (typeof port.getLightStatus === 'function') {
            light = port.getLightStatus();
            if (light === 1 || light === 2) isUp = true; // 1=Green, 2=Amber
          }
          
          portInfo.status = isUp ? 'up' : 'down';
          portInfo.protocol = isUp ? 'up' : 'down';
          portInfo.light = light;
        } catch (e) { /* ignore */ }

        try {
          portInfo.ipAddress = port.getIpAddress();
        } catch (e) { /* ignore */ }

        // Recolectar Link si no ha sido procesado
        try {
            var l = port.getLink ? port.getLink() : null;
            if (l) {
                var lId = l.getObjectUuid ? String(l.getObjectUuid()) : "L" + i + "_" + p;
                if (!processedLinks[lId]) {
                    var ep1 = typeof (l as any).getPort1 === "function" ? (l as any).getPort1() : null;
                    var ep2 = typeof (l as any).getPort2 === "function" ? (l as any).getPort2() : null;
                    if (ep1 && ep2) {
                        const owner1 = typeof ep1.getOwnerDevice === "function" ? ep1.getOwnerDevice() : null;
                        const owner2 = typeof ep2.getOwnerDevice === "function" ? ep2.getOwnerDevice() : null;
                        if (owner1 && owner2) {
                            links[lId] = {
                                id: lId,
                                device1: typeof owner1.getName === "function" ? owner1.getName() : "Unknown",
                                port1: typeof ep1.getName === "function" ? ep1.getName() : "Unknown",
                                device2: typeof owner2.getName === "function" ? owner2.getName() : "Unknown",
                                port2: typeof ep2.getName === "function" ? ep2.getName() : "Unknown",
                                type: "auto"
                            };
                            processedLinks[lId] = true;
                        }
                    }
                }
            }
        } catch (e) { /* ignore */ }

        ports.push(portInfo);
      } catch (e) {
        ports.push({ name: "port" + p });
      }
    }

    devices[name] = {
      name: name,
      model: device.getModel(),
      type: device.getType(),
      power: device.getPower(),
      ports: ports,
    };
  }

  return {
    ok: true,
    version: "1.0",
    timestamp: Date.now(),
    devices: devices,
    links: links,
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
