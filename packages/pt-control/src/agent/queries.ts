// ============================================================================
// Query Layer - High-level queries for agent context
// ============================================================================

import type {
  NetworkTwin,
  DeviceTwin,
  ZoneTwin,
  PortTwin,
  PortCandidate,
  LinkTwin,
  DeviceSpatialContext,
  ConfigTwin,
} from "../contracts/twin-types.js";
import {
  selectDeviceByName,
  selectDevicesInZone,
  selectZoneByColor,
  selectAdjacentDevices,
  selectClosestDevices,
  selectUplinks,
  selectDeviceUplinks,
} from "./context-selectors.js";

// ============================================================================
// Device Context Query
// ============================================================================

export interface DeviceContextResult {
  device: DeviceTwin;
  spatial: DeviceSpatialContext;
  adjacentDevices: string[];
  uplinks: Array<{ to: string; port: string }>;
  config?: ConfigTwin;
}

function getDeviceZoneMemberships(twin: NetworkTwin, device: DeviceTwin): DeviceSpatialContext['zones'] {
  const memberships: DeviceSpatialContext['zones'] = [];
  const { centerX, centerY } = device.logicalPosition;

  for (const zone of Object.values(twin.zones)) {
    const { x1, y1, x2, y2 } = zone.geometry;
    const inside = centerX >= x1 && centerX <= x2 && centerY >= y1 && centerY <= y2;
    if (inside) {
      memberships.push({
        zoneId: zone.id,
        relation: 'inside',
        confidence: 1,
      });
    }
  }

  return memberships;
}

export function getDeviceContext(twin: NetworkTwin, deviceName: string): DeviceContextResult | null {
  const device = selectDeviceByName(twin, deviceName);
  if (!device) return null;

  const spatial: DeviceSpatialContext = {
    logicalPosition: device.logicalPosition,
    zones: getDeviceZoneMemberships(twin, device),
    inferred: undefined,
  };

  const adjacentDevices = selectAdjacentDevices(twin, deviceName);

  const uplinks = selectDeviceUplinks(twin, deviceName);

  return {
    device,
    spatial,
    adjacentDevices,
    uplinks,
    config: device.config,
  };
}

// ==========================================================================
// Agent Task Scope Helpers
// ==========================================================================

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function findMentionedDeviceNames(twin: NetworkTwin, text: string): string[] {
  const matches: string[] = [];
  for (const device of Object.values(twin.devices)) {
    const pattern = new RegExp(`\\b${escapeRegExp(device.name)}\\b`, 'i');
    if (pattern.test(text)) {
      matches.push(device.name);
    }
  }
  return matches;
}

export function findMentionedZoneIds(twin: NetworkTwin, text: string): string[] {
  const matches: string[] = [];
  for (const zone of Object.values(twin.zones)) {
    const candidates = [zone.id, zone.label].filter(Boolean) as string[];
    if (candidates.some((candidate) => new RegExp(`\\b${escapeRegExp(candidate)}\\b`, 'i').test(text))) {
      matches.push(zone.id);
    }
  }
  return matches;
}

export function getFreePortCandidates(twin: NetworkTwin, deviceNames: string[]): PortCandidate[] {
  const uniqueNames = Array.from(new Set(deviceNames));
  const candidates: PortCandidate[] = [];

  for (const deviceName of uniqueNames) {
    const device = selectDeviceByName(twin, deviceName);
    if (!device) continue;
    for (const port of Object.values(device.ports)) {
      if (port.connectedTo) continue;
      candidates.push({
        device: deviceName,
        port: port.name,
        score: port.media === 'fiber' ? 80 : 100,
        occupied: false,
        reason: port.media ? `Puerto libre (${port.media})` : 'Puerto libre',
      });
    }
  }

  return candidates.sort((left, right) => {
    if (left.device !== right.device) {
      return left.device.localeCompare(right.device);
    }
    return left.port.localeCompare(right.port);
  });
}

export function getTaskRisks(
  twin: NetworkTwin,
  task: string,
  deviceNames: string[],
  zoneIds: string[],
  candidates: PortCandidate[]
): string[] {
  const risks: string[] = [];
  const deviceScope = Array.from(new Set(deviceNames));

  if (/connect|link/i.test(task)) {
    risks.push('connect/link: validar ambos extremos antes de mutar la conectividad.');
    if (deviceScope.length < 2) {
      risks.push('connect/link: la tarea necesita al menos dos dispositivos en alcance.');
    }
  }

  if (/verify|check|validate/i.test(task)) {
    risks.push('Usar evidencia de verificación y no asumir éxito por ejecución.');
  }

  for (const deviceName of deviceScope) {
    const deviceCandidates = candidates.filter((candidate) => candidate.device === deviceName);
    if (deviceCandidates.length === 0) {
      risks.push(`No hay puertos libres en ${deviceName}.`);
    }
  }

  for (const zoneId of zoneIds) {
    const devicesInZone = selectDevicesInZone(twin, zoneId);
    if (devicesInZone.length >= 4) {
      risks.push(`La zona ${zoneId} agrupa ${devicesInZone.length} dispositivos; coordinar cambios por etapas.`);
    }
  }

  return Array.from(new Set(risks));
}

// ============================================================================
// Path Context Query
// ============================================================================

export interface PathHop {
  device: string;
  port: string;
  nextHop?: string;
}

export interface PathContextResult {
  from: string;
  to: string;
  hops: PathHop[];
  totalHops: number;
  pathType: "direct" | "through-switch" | "through-router" | "unknown";
}

export function getPathContext(twin: NetworkTwin, from: string, to: string): PathContextResult | null {
  const fromDevice = selectDeviceByName(twin, from);
  const toDevice = selectDeviceByName(twin, to);

  if (!fromDevice || !toDevice) return null;

  const hops: PathHop[] = [];
  let pathType: PathContextResult["pathType"] = "unknown";

  // Find direct link
  const directLink = findDirectLink(twin, from, to);
  if (directLink) {
    pathType = "direct";
    hops.push({
      device: from,
      port: directLink.port1,
      nextHop: to,
    });
  } else {
    // Find path through switches
    const allUplinks = selectUplinks(twin);
    const fromUplinks = allUplinks.filter((u) => u.from === from || u.to === from);
    const toUplinks = allUplinks.filter((u) => u.from === to || u.to === to);

    if (fromUplinks.length > 0 && toUplinks.length > 0) {
      // Both are access devices, path goes through core
      pathType = fromDevice.family === "switch-l2" && toDevice.family === "switch-l2"
        ? "through-switch"
        : "through-router";

      hops.push({
        device: from,
        port: fromUplinks[0]!.port,
        nextHop: fromUplinks[0]!.to,
      });

      if (fromUplinks[0]!.to !== toUplinks[0]!.from) {
        hops.push({
          device: fromUplinks[0]!.to,
          port: "N/A",
          nextHop: toUplinks[0]!.from,
        });
      }

      hops.push({
        device: to,
        port: toUplinks[0]!.port,
        nextHop: undefined,
      });
    }
  }

  return {
    from,
    to,
    hops,
    totalHops: hops.length,
    pathType,
  };
}

function findDirectLink(twin: NetworkTwin, device1: string, device2: string): LinkTwin | undefined {
  for (const link of Object.values(twin.links)) {
    if ((link.device1 === device1 && link.device2 === device2) ||
        (link.device1 === device2 && link.device2 === device1)) {
      return link;
    }
  }
  return undefined;
}

// ============================================================================
// Zone Context Query
// ============================================================================

export interface ZoneContextResult {
  zone: ZoneTwin;
  devices: DeviceTwin[];
  deviceCount: number;
  inferredVlan?: number;
  uplinks: Array<{ device: string; port: string }>;
}

export function getZoneContext(twin: NetworkTwin, zoneId: string): ZoneContextResult | null {
  const zone = twin.zones[zoneId];
  if (!zone) return null;

  const devices = selectDevicesInZone(twin, zoneId);
  const uplinks: Array<{ device: string; port: string }> = [];

  for (const device of devices) {
    const deviceUplinks = selectDeviceUplinks(twin, device.name);
    for (const uplink of deviceUplinks) {
      uplinks.push({
        device: device.name,
        port: uplink.port,
      });
    }
  }

  return {
    zone,
    devices,
    deviceCount: devices.length,
    inferredVlan: zone.semantics?.vlanId,
    uplinks,
  };
}

// ============================================================================
// Devices in Zone Query
// ============================================================================

export function getDevicesInZone(twin: NetworkTwin, zoneId: string): DeviceTwin[] {
  return selectDevicesInZone(twin, zoneId);
}

// ============================================================================
// Zone by Color Query
// ============================================================================

export function getZoneByColor(twin: NetworkTwin, color: string): ZoneTwin | undefined {
  return selectZoneByColor(twin, color);
}

// ============================================================================
// Gateways for VLAN Query
// ============================================================================

export function getGatewaysForVlan(twin: NetworkTwin, vlanId: number): Array<{ device: string; port: PortTwin }> {
  const results: Array<{ device: string; port: PortTwin }> = [];

  for (const [deviceName, device] of Object.entries(twin.devices)) {
    for (const [portName, port] of Object.entries(device.ports)) {
      // Check if this port is an SVI for the VLAN
      if (port.vlanMode === "routed" && port.accessVlan === vlanId) {
        results.push({ device: deviceName, port });
      }
      // Check subinterfaces
      if (portName.includes(`.${vlanId}`)) {
        results.push({ device: deviceName, port });
      }
    }
  }

  return results;
}

// ============================================================================
// Ports Using Fiber Query
// ============================================================================

export function getPortsUsingFiber(twin: NetworkTwin): Array<{ device: string; port: PortTwin }> {
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

// ============================================================================
// Devices with Module Type Query
// ============================================================================

export function getDevicesWithModuleType(twin: NetworkTwin, moduleType: string): DeviceTwin[] {
  return Object.values(twin.devices).filter((device) =>
    device.modules.some(
      (m) => m.moduleType?.toLowerCase().includes(moduleType.toLowerCase()) ||
             m.model?.toLowerCase().includes(moduleType.toLowerCase())
    )
  );
}

// ============================================================================
// Closest Devices Query
// ============================================================================

export function getClosestDevices(
  twin: NetworkTwin,
  deviceName: string,
  maxDistance = 3
): DeviceTwin[] {
  return selectClosestDevices(twin, deviceName, maxDistance);
}

// ============================================================================
// Config Summary Query
// ============================================================================

export interface ConfigSummary {
  hostname: string;
  interfaces: Array<{
    name: string;
    ip?: string;
    status: string;
    vlan?: number;
    mode?: string;
  }>;
  routing?: {
    protocol?: string;
    networks?: string[];
  };
  vlans: number[];
  dhcpPools?: string[];
  aclEntries?: number;
}

export function getConfigSummary(twin: NetworkTwin, deviceName: string): ConfigSummary | null {
  const device = selectDeviceByName(twin, deviceName);
  if (!device) return null;

  const hostname = device.cli?.hostname || device.name;

  const interfaces: ConfigSummary["interfaces"] = [];
  for (const [portName, port] of Object.entries(device.ports)) {
    interfaces.push({
      name: portName,
      ip: port.ipAddress,
      status: port.operStatus || "unknown",
      vlan: port.accessVlan,
      mode: port.vlanMode,
    });
  }

  const vlans = new Set<number>();
  for (const port of Object.values(device.ports)) {
    if (port.accessVlan) vlans.add(port.accessVlan);
    if (port.allowedVlans) {
      port.allowedVlans.forEach((v) => vlans.add(v));
    }
  }

  let routing: ConfigSummary["routing"] | undefined;
  if (device.config?.sections?.routing) {
    const r = device.config.sections.routing;
    routing = {
      protocol: r.protocol,
      networks: r.networks?.map((n) => n.network),
    };
  }

  const dhcpPools = device.config?.sections?.dhcp?.map((d) => d.poolName);

  const aclEntries = device.config?.sections?.acl?.reduce(
    (sum, acl) => sum + acl.entries.length,
    0
  );

  return {
    hostname,
    interfaces,
    routing,
    vlans: Array.from(vlans).sort((a, b) => a - b),
    dhcpPools,
    aclEntries,
  };
}
