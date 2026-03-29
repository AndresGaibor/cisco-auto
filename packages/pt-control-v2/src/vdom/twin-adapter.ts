// ============================================================================
// VirtualTopology → NetworkTwin Adapter
// ============================================================================

import type {
  NetworkTwin,
  DeviceTwin,
  PortTwin,
  LinkTwin,
  ZoneTwin,
  AnnotationTwin,
  DeviceFamily,
  PortKind,
  PortMedia,
  LogicalPlacement,
  ProvenanceInfo,
  TwinIndexes,
} from "../contracts/twin-types.js";
import type { TopologySnapshot, DeviceState, LinkState, PortState } from "../contracts/snapshots.js";

// ============================================================================
// Device Family Mapping
// ============================================================================

function mapDeviceFamily(type: string | undefined): DeviceFamily {
  switch (type) {
    case "router":
      return "router";
    case "switch":
      return "switch-l2";
    case "switch_layer3":
    case "multilayer_device":
      return "switch-l3";
    case "server":
      return "server";
    case "pc":
      return "pc";
    case "cloud":
      return "asa"; // approximation
    case "access_point":
      return "ap";
    case "wireless_router":
      return "wlc"; // approximation
    default:
      return "unknown";
  }
}

// ============================================================================
// Port Mapping
// ============================================================================

function mapPortKind(type: string | undefined): PortKind {
  if (!type) return "unknown";
  const lower = type.toLowerCase();
  if (lower.includes("ethernet") || lower.includes("fastethernet") || lower.includes("gigabit")) {
    return "ethernet";
  }
  if (lower.includes("serial")) return "serial";
  if (lower.includes("fiber") || lower.includes("sfp")) return "fiber";
  if (lower.includes("usb")) return "usb";
  if (lower.includes("wireless") || lower.includes("wlan")) return "wireless";
  return "unknown";
}

function mapPortMedia(speed: string | undefined, duplex: string | undefined): PortMedia | undefined {
  if (!speed && !duplex) return undefined;
  if (speed?.toLowerCase().includes("fiber")) return "fiber";
  if (speed?.toLowerCase().includes("copper")) return "copper";
  return undefined;
}

function mapPortState(name: string, state: PortState, lastSeenAt: number): PortTwin {
  return {
    name: state.name || name,
    kind: mapPortKind(state.type),
    media: mapPortMedia(state.speed, state.duplex),
    adminStatus: state.status,
    operStatus: state.protocol,
    macAddress: state.macAddress,
    ipAddress: state.ipAddress,
    subnetMask: state.subnetMask,
    vlanMode: state.mode as PortTwin["vlanMode"],
    accessVlan: state.vlan,
    lastSeenAt,
  };
}

// ============================================================================
// Logical Placement
// ============================================================================

function mapLogicalPlacement(device: DeviceState): LogicalPlacement {
  const x = device.x ?? 0;
  const y = device.y ?? 0;
  return {
    x,
    y,
    centerX: x, // Device coordinates are already center-ish in PT
    centerY: y,
  };
}

// ============================================================================
// Provenance
// ============================================================================

function mapProvenance(source: "pt-api" | "cli-show" | "inferred" | "manual" = "pt-api"): ProvenanceInfo {
  return {
    source,
    collectedAt: Date.now(),
    confidence: source === "pt-api" ? 1.0 : source === "cli-show" ? 0.9 : 0.7,
  };
}

// ============================================================================
// Device State → DeviceTwin
// ============================================================================

function mapDeviceState(device: DeviceState): DeviceTwin {
  const now = Date.now();
  const ports: Record<string, PortTwin> = {};

  for (const portState of device.ports ?? []) {
    const portTwin = mapPortState(portState.name, portState, now);
    ports[portTwin.name] = portTwin;
  }

  return {
    id: device.uuid || device.name,
    name: device.name,
    model: device.model,
    type: device.type,
    family: mapDeviceFamily(device.type),
    power: device.power,
    logicalPosition: mapLogicalPlacement(device),
    modules: [],
    ports,
    services: [],
    annotations: [],
    provenance: mapProvenance("pt-api"),
  };
}

// ============================================================================
// Link State → LinkTwin
// ============================================================================

function mapLinkState(link: LinkState): LinkTwin {
  const media = link.cableType === "fiber" ? "fiber" :
                link.cableType === "serial" ? "coaxial" :
                undefined;

  return {
    id: link.id,
    device1: link.device1,
    port1: link.port1,
    device2: link.device2,
    port2: link.port2,
    cableType: link.cableType,
    cableMedia: media,
    connected: true,
  };
}

// ============================================================================
// Zone Mapping
// ============================================================================

export interface CanvasRect {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fillColor?: string;
  text?: string;
  textColor?: string;
  borderColor?: string;
}

function mapCanvasRectToZone(rect: CanvasRect): ZoneTwin | null {
  if (rect.type !== "rectangle" && rect.type !== "ellipse" && rect.type !== "polygon") {
    return null;
  }

  return {
    id: rect.id,
    kind: rect.type as ZoneTwin["kind"],
    label: rect.text,
    geometry: {
      x1: rect.x,
      y1: rect.y,
      x2: rect.x + rect.width,
      y2: rect.y + rect.height,
    },
    style: {
      fillColor: rect.fillColor,
      textColor: rect.textColor,
      borderColor: rect.borderColor,
    },
    semantics: extractSemantics(rect.text, rect.fillColor),
    membershipRule: { mode: "center-inside" },
  };
}

function extractSemantics(
  text: string | undefined,
  fillColor: string | undefined
): ZoneTwin["semantics"] {
  const semantics: ZoneTwin["semantics"] = {
    tags: [],
  };

  // Extract VLAN from text (e.g., "VLAN 10" or "VLAN10")
  if (text) {
    const vlanMatch = text.match(/vlan\s*(\d+)/i);
    if (vlanMatch) {
      semantics.vlanId = parseInt(vlanMatch[1]!, 10);
      semantics.vlanName = text.trim();
    }

    // Infer role from text
    const lowerText = text.toLowerCase();
    if (lowerText.includes("server") || lowerText.includes("servidor")) {
      semantics.role = "servidores";
    } else if (lowerText.includes("user") || lowerText.includes("usuario")) {
      semantics.role = "usuarios";
    } else if (lowerText.includes("wifi") || lowerText.includes("wireless")) {
      semantics.role = "wireless";
    }
  }

  // Infer VLAN from color (if no VLAN from text)
  if (!semantics.vlanId && fillColor) {
    const normalizedColor = fillColor.toLowerCase();
    if (normalizedColor === "#0000ff" || normalizedColor === "#0000FF") {
      semantics.vlanId = 10;
    } else if (normalizedColor === "#ff00ff" || normalizedColor === "#FF00FF") {
      semantics.vlanId = 20;
    } else if (normalizedColor === "#ffff00" || normalizedColor === "#FFFF00") {
      semantics.vlanId = 30;
    } else if (normalizedColor === "#00ff00" || normalizedColor === "#00FF00") {
      semantics.vlanId = 40;
    } else if (normalizedColor === "#ffa500" || normalizedColor === "#FFA500") {
      semantics.vlanId = 50;
    }
  }

  return semantics;
}

// ============================================================================
// Annotation Mapping
// ============================================================================

function mapCanvasNoteToAnnotation(rect: CanvasRect): AnnotationTwin | null {
  if (rect.type !== "note" && rect.type !== "label") {
    return null;
  }

  return {
    id: rect.id,
    kind: rect.type as AnnotationTwin["kind"],
    text: rect.text || "",
    x: rect.x,
    y: rect.y,
    color: rect.fillColor,
    semantics: extractSemantics(rect.text, rect.fillColor),
  };
}

// ============================================================================
// Build Indexes
// ============================================================================

function buildIndexes(twin: NetworkTwin): TwinIndexes {
  const indexes: TwinIndexes = {
    byDeviceName: {},
    byModel: {},
    byPortRef: {},
    byZoneId: {},
    byIp: {},
    byMac: {},
  };

  // Index by device name
  for (const [name, device] of Object.entries(twin.devices)) {
    indexes.byDeviceName![name] = device;
  }

  // Index by model
  for (const [name, device] of Object.entries(twin.devices)) {
    const models = indexes.byModel![device.model] || [];
    models.push(name);
    indexes.byModel![device.model] = models;
  }

  // Index by IP
  for (const [name, device] of Object.entries(twin.devices)) {
    for (const [portName, port] of Object.entries(device.ports)) {
      if (port.ipAddress) {
        indexes.byIp![port.ipAddress] = { deviceId: name, portName };
      }
      if (port.macAddress) {
        indexes.byMac![port.macAddress] = { deviceId: name, portName };
      }
    }
  }

  // Index by zone
  for (const [zoneId, zone] of Object.entries(twin.zones)) {
    const devicesInZone = Object.values(twin.devices)
      .filter((d) => {
        const { centerX, centerY } = d.logicalPosition;
        const { x1, y1, x2, y2 } = zone.geometry;
        return centerX >= x1 && centerX <= x2 && centerY >= y1 && centerY <= y2;
      })
      .map((d) => d.name);

    if (devicesInZone.length > 0) {
      indexes.byZoneId![zoneId] = devicesInZone;
    }
  }

  return indexes;
}

// ============================================================================
// Main Adapter
// ============================================================================

export interface TwinAdapterOptions {
  includeZones?: boolean;
  includeAnnotations?: boolean;
}

export function topologySnapshotToNetworkTwin(
  snapshot: TopologySnapshot,
  options: TwinAdapterOptions = {}
): NetworkTwin {
  const { includeZones = true, includeAnnotations = true } = options;

  // Map devices
  const devices: Record<string, DeviceTwin> = {};
  for (const [name, device] of Object.entries(snapshot.devices)) {
    devices[name] = mapDeviceState(device);
  }

  // Map links
  const links: Record<string, LinkTwin> = {};
  for (const [id, link] of Object.entries(snapshot.links)) {
    links[id] = mapLinkState(link);
  }

  // Empty zones and annotations by default
  const zones: Record<string, ZoneTwin> = {};
  const annotations: Record<string, AnnotationTwin> = {};

  // Build twin
  const twin: NetworkTwin = {
    devices,
    links,
    zones,
    annotations,
    metadata: {
      version: 1,
      updatedAt: snapshot.timestamp || Date.now(),
      createdAt: Date.now(),
    },
  };

  // Build indexes
  twin.indexes = buildIndexes(twin);

  return twin;
}

/**
 * Enrich a NetworkTwin with zones from canvas rects
 */
export function enrichWithZones(twin: NetworkTwin, rects: CanvasRect[]): NetworkTwin {
  const zones: Record<string, ZoneTwin> = {};
  const annotations: Record<string, AnnotationTwin> = {};

  for (const rect of rects) {
    const zone = mapCanvasRectToZone(rect);
    if (zone) {
      zones[zone.id] = zone;
    }

    const annotation = mapCanvasNoteToAnnotation(rect);
    if (annotation) {
      annotations[annotation.id] = annotation;
    }
  }

  // Update twin with zones and rebuild indexes
  twin.zones = zones;
  twin.annotations = annotations;
  twin.indexes = buildIndexes(twin);

  return twin;
}

/**
 * Update a specific device in the NetworkTwin from a DeviceState
 */
export function updateDeviceInTwin(twin: NetworkTwin, deviceState: DeviceState): NetworkTwin {
  const deviceTwin = mapDeviceState(deviceState);
  twin.devices[deviceTwin.name] = deviceTwin;

  // Rebuild indexes for this device
  if (twin.indexes) {
    if (!twin.indexes.byDeviceName) twin.indexes.byDeviceName = {};
    twin.indexes.byDeviceName[deviceTwin.name] = deviceTwin;

    if (!twin.indexes.byModel) twin.indexes.byModel = {};
    const models = twin.indexes.byModel[deviceTwin.model] || [];
    if (!models.includes(deviceTwin.name)) {
      models.push(deviceTwin.name);
      twin.indexes.byModel[deviceTwin.model] = models;
    }

    if (!twin.indexes.byIp) twin.indexes.byIp = {};
    if (!twin.indexes.byMac) twin.indexes.byMac = {};
    for (const [portName, port] of Object.entries(deviceTwin.ports)) {
      if (port.ipAddress) {
        twin.indexes.byIp[port.ipAddress] = { deviceId: deviceTwin.name, portName };
      }
      if (port.macAddress) {
        twin.indexes.byMac[port.macAddress] = { deviceId: deviceTwin.name, portName };
      }
    }
  }

  twin.metadata.updatedAt = Date.now();

  return twin;
}

/**
 * Add a zone to the NetworkTwin
 */
export function addZoneToTwin(twin: NetworkTwin, rect: CanvasRect): NetworkTwin {
  const zone = mapCanvasRectToZone(rect);
  if (zone) {
    twin.zones[zone.id] = zone;
    twin.indexes = buildIndexes(twin);
    twin.metadata.updatedAt = Date.now();
  }

  return twin;
}
