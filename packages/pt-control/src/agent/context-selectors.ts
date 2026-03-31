// ============================================================================
// Context Selectors - Pure functions for selecting data from NetworkTwin
// ============================================================================

import type {
  NetworkTwin,
  DeviceTwin,
  ZoneTwin,
  PortTwin,
  DeviceFamily,
} from "../contracts/twin-types.js";

// ============================================================================
// Device Selectors
// ============================================================================

export function selectCoreDevices(twin: NetworkTwin): string[] {
  return Object.values(twin.devices)
    .filter((d) => d.family === "switch-l3" || d.family === "router")
    .map((d) => d.name);
}

export function selectAccessDevices(twin: NetworkTwin): string[] {
  return Object.values(twin.devices)
    .filter((d) => d.family === "switch-l2")
    .map((d) => d.name);
}

export function selectServerDevices(twin: NetworkTwin): string[] {
  return Object.values(twin.devices)
    .filter((d) => d.family === "server")
    .map((d) => d.name);
}

export function selectPcDevices(twin: NetworkTwin): string[] {
  return Object.values(twin.devices)
    .filter((d) => d.family === "pc")
    .map((d) => d.name);
}

/**
 * Edge devices are hosts at the network boundary: PCs, servers, wireless routers/APs.
 * They are "edge" because they connect to the network infrastructure
 * but don't typically forward traffic for other devices.
 */
export function selectEdgeDevices(twin: NetworkTwin): string[] {
  return Object.values(twin.devices)
    .filter((d) => d.family === "pc" || d.family === "server" || d.family === "wlc" || d.family === "ap")
    .map((d) => d.name);
}

export function selectDevicesByFamily(twin: NetworkTwin, family: DeviceFamily): string[] {
  return Object.values(twin.devices)
    .filter((d) => d.family === family)
    .map((d) => d.name);
}

export function selectDeviceByName(twin: NetworkTwin, name: string): DeviceTwin | undefined {
  return twin.devices[name];
}

// ============================================================================
// Zone Selectors
// ============================================================================

export function selectActiveZone(
  twin: NetworkTwin,
  selectedZone?: string
): ZoneTwin | undefined {
  if (!selectedZone) return undefined;
  return twin.zones[selectedZone];
}

export function selectZonesWithVlan(twin: NetworkTwin, vlanId: number): ZoneTwin[] {
  return Object.values(twin.zones).filter(
    (z) => z.semantics?.vlanId === vlanId
  );
}

export function selectZoneByColor(twin: NetworkTwin, color: string): ZoneTwin | undefined {
  const normalizedColor = color.toLowerCase();
  return Object.values(twin.zones).find(
    (z) => z.style?.fillColor?.toLowerCase() === normalizedColor
  );
}

export function selectDevicesInZone(twin: NetworkTwin, zoneId: string): DeviceTwin[] {
  const zone = twin.zones[zoneId];
  if (!zone) return [];

  const { x1, y1, x2, y2 } = zone.geometry;

  return Object.values(twin.devices).filter((device) => {
    const { centerX, centerY } = device.logicalPosition;
    // Center-inside rule
    return centerX >= x1 && centerX <= x2 && centerY >= y1 && centerY <= y2;
  });
}

// ============================================================================
// Port Selectors
// ============================================================================

export function selectPortByIp(twin: NetworkTwin, ip: string): { device: string; port: PortTwin } | undefined {
  for (const [deviceName, device] of Object.entries(twin.devices)) {
    for (const [portName, port] of Object.entries(device.ports)) {
      if (port.ipAddress === ip) {
        return { device: deviceName, port };
      }
    }
  }
  return undefined;
}

export function selectPortsUsingFiber(twin: NetworkTwin): Array<{ device: string; port: PortTwin }> {
  const results: Array<{ device: string; port: PortTwin }> = [];
  for (const [deviceName, device] of Object.entries(twin.devices)) {
    for (const [portName, port] of Object.entries(device.ports)) {
      if (port.media === "fiber") {
        results.push({ device: deviceName, port });
      }
    }
  }
  return results;
}

export function selectPortsByVlan(twin: NetworkTwin, vlanId: number): Array<{ device: string; port: PortTwin }> {
  const results: Array<{ device: string; port: PortTwin }> = [];
  for (const [deviceName, device] of Object.entries(twin.devices)) {
    for (const [portName, port] of Object.entries(device.ports)) {
      if (port.accessVlan === vlanId) {
        results.push({ device: deviceName, port });
      }
    }
  }
  return results;
}

// ============================================================================
// Topology Selectors
// ============================================================================

export function selectUplinks(twin: NetworkTwin): Array<{ from: string; to: string; port: string }> {
  const uplinks: Array<{ from: string; to: string; port: string }> = [];

  for (const link of Object.values(twin.links)) {
    const fromDevice = twin.devices[link.device1];
    const toDevice = twin.devices[link.device2];

    if (!fromDevice || !toDevice) continue;

    // Uplink: L2 switch connected to L3 switch/router
    const isUplink =
      (fromDevice.family === "switch-l2" && (toDevice.family === "switch-l3" || toDevice.family === "router")) ||
      (toDevice.family === "switch-l2" && (fromDevice.family === "switch-l3" || fromDevice.family === "router"));

    if (isUplink) {
      uplinks.push({
        from: link.device1,
        to: link.device2,
        port: link.port1,
      });
    }
  }

  return uplinks;
}

export function selectDeviceUplinks(twin: NetworkTwin, deviceName: string): Array<{ to: string; port: string }> {
  const allUplinks = selectUplinks(twin);
  return allUplinks
    .filter((u) => u.from === deviceName || u.to === deviceName)
    .map((u) => ({
      to: u.from === deviceName ? u.to : u.from,
      port: u.from === deviceName ? u.port : u.port, // Note: port direction needs improvement
    }));
}

export function selectAdjacentDevices(twin: NetworkTwin, deviceName: string): string[] {
  const adjacent: Set<string> = new Set();

  for (const link of Object.values(twin.links)) {
    if (link.device1 === deviceName) {
      adjacent.add(link.device2);
    } else if (link.device2 === deviceName) {
      adjacent.add(link.device1);
    }
  }

  return Array.from(adjacent);
}

// ============================================================================
// Spatial Selectors
// ============================================================================

export function selectClosestDevices(
  twin: NetworkTwin,
  deviceName: string,
  maxDistance: number
): DeviceTwin[] {
  const device = twin.devices[deviceName];
  if (!device) return [];

  const { centerX: cx, centerY: cy } = device.logicalPosition;

  return Object.values(twin.devices)
    .filter((d) => {
      if (d.name === deviceName) return false;
      const dx = d.logicalPosition.centerX - cx;
      const dy = d.logicalPosition.centerY - cy;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return distance <= maxDistance;
    })
    .sort((a, b) => {
      const distA = Math.sqrt(
        Math.pow(a.logicalPosition.centerX - cx, 2) +
        Math.pow(a.logicalPosition.centerY - cy, 2)
      );
      const distB = Math.sqrt(
        Math.pow(b.logicalPosition.centerX - cx, 2) +
        Math.pow(b.logicalPosition.centerY - cy, 2)
      );
      return distA - distB;
    });
}
