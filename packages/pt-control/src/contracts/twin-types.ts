// ============================================================================
// NetworkTwin Types - Domain Models for Agent Context
// ============================================================================

export type DeviceFamily = 
  | "router" 
  | "switch-l2" 
  | "switch-l3" 
  | "server" 
  | "pc" 
  | "asa" 
  | "ap" 
  | "wlc" 
  | "unknown";

export type PortKind = "ethernet" | "serial" | "fiber" | "usb" | "wireless" | "unknown";
export type PortMedia = "copper" | "fiber" | "wireless" | "unknown";

export interface LogicalPlacement {
  x: number;
  y: number;
  centerX: number;
  centerY: number;
}

export interface ProvenanceInfo {
  source: "pt-api" | "cli-show" | "inferred" | "manual";
  collectedAt: number;
  confidence: number;
}

export interface PortTwin {
  name: string;
  kind: PortKind;
  media?: PortMedia;
  adminStatus?: string;
  operStatus?: string;
  macAddress?: string;
  ipAddress?: string;
  subnetMask?: string;
  vlanMode?: "access" | "trunk" | "dynamic" | "unknown";
  accessVlan?: number;
  lastSeenAt: number;
}

export interface DeviceTwin {
  id: string;
  name: string;
  model: string;
  type: string;
  family: DeviceFamily;
  power: boolean;
  logicalPosition: LogicalPlacement;
  modules: any[];
  ports: Record<string, PortTwin>;
  services: any[];
  annotations: any[];
  provenance: ProvenanceInfo;
}

export interface LinkTwin {
  id: string;
  device1: string;
  port1: string;
  device2: string;
  port2: string;
  cableType: string;
  cableMedia?: "copper" | "fiber" | "coaxial" | "wireless";
  connected: boolean;
}

export interface ZoneTwin {
  id: string;
  kind: "rectangle" | "ellipse" | "polygon";
  label?: string;
  geometry: { x1: number; y1: number; x2: number; y2: number };
  style: {
    fillColor?: string;
    textColor?: string;
    borderColor?: string;
  };
  semantics: {
    vlanId?: number;
    vlanName?: string;
    role?: string;
    tags: string[];
  };
  membershipRule: { mode: "center-inside" };
}

export interface AnnotationTwin {
  id: string;
  kind: "note" | "label";
  text: string;
  x: number;
  y: number;
  color?: string;
  semantics: any;
}

export interface TwinIndexes {
  byDeviceName?: Record<string, DeviceTwin>;
  byModel?: Record<string, string[]>;
  byPortRef?: Record<string, { deviceId: string; portName: string }>;
  byZoneId?: Record<string, string[]>;
  byIp?: Record<string, { deviceId: string; portName: string }>;
  byMac?: Record<string, { deviceId: string; portName: string }>;
}

export interface NetworkTwin {
  devices: Record<string, DeviceTwin>;
  links: Record<string, LinkTwin>;
  zones: Record<string, ZoneTwin>;
  annotations: Record<string, AnnotationTwin>;
  metadata: {
    version: number;
    updatedAt: number;
    createdAt: number;
  };
  indexes?: TwinIndexes;
}

export interface AgentSessionState {
  selectedDevice?: string;
  selectedZone?: string;
  focusDevices: string[];
  lastTask?: string;
  lastPlan?: any;
  verbosity: "compact" | "normal" | "detailed";
  sessionId?: string;
  startTime?: number;
  lastActivity?: number;
  history?: any[];
}

export interface AgentBaseContext {
  lab: {
    name?: string;
    deviceCount: number;
    linkCount: number;
    zoneCount: number;
    lastUpdatedAt: number;
  };
  topology: {
    coreDevices: string[];
    accessDevices: string[];
    serverDevices: string[];
    edgeDevices: string[];
  };
  selection: {
    selectedDevice?: string;
    selectedZone?: string;
    focusDevices: string[];
  };
  zones: Array<{
    id: string;
    label?: string;
    color?: string;
    inferredVlanId?: number;
    deviceCount: number;
  }>;
  alerts: any[];
  recentChanges: any[];
  task?: {
    goal: string;
    scope: string;
    affectedDevices: string[];
    affectedZones: string[];
    suggestedCommands: string[];
    notes: string[];
    candidatePorts: PortCandidate[];
    risks: string[];
  };
}

export interface PortCandidate {
  device: string;
  port: string;
  kind: PortKind;
  reason: string;
}

export interface DeviceSpatialContext {
  zones: Array<{
    zoneId: string;
    relation: 'inside' | 'near';
    confidence: number;
  }>;
}

export interface ConfigTwin {
  runningConfig?: string;
  lastSyncedAt?: number;
}
