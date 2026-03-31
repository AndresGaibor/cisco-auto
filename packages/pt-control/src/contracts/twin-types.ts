// ============================================================================
// NetworkTwin - Enriched Types for Agent Context and Validation
// ============================================================================

import { z } from 'zod';

// ============================================================================
// Enums
// ============================================================================

export const DeviceFamilySchema = z.enum([
  'router',
  'switch-l2',
  'switch-l3',
  'server',
  'asa',
  'wlc',
  'ap',
  'pc',
  'iot',
  'unknown',
]);
export type DeviceFamily = z.infer<typeof DeviceFamilySchema>;

export const PortKindSchema = z.enum(['ethernet', 'serial', 'usb', 'wireless', 'fiber', 'unknown']);
export type PortKind = z.infer<typeof PortKindSchema>;

export const PortMediaSchema = z.enum(['copper', 'fiber', 'coaxial', 'wireless']);
export type PortMedia = z.infer<typeof PortMediaSchema>;

export const VlanModeSchema = z.enum(['access', 'trunk', 'routed']);
export type VlanMode = z.infer<typeof VlanModeSchema>;

export const ZoneKindSchema = z.enum(['rectangle', 'ellipse', 'polygon', 'note']);
export type ZoneKind = z.infer<typeof ZoneKindSchema>;

export const AnnotationKindSchema = z.enum(['note', 'label']);
export type AnnotationKind = z.infer<typeof AnnotationKindSchema>;

export const ProvenanceSourceSchema = z.enum(['pt-api', 'cli-show', 'inferred', 'manual']);
export type ProvenanceSource = z.infer<typeof ProvenanceSourceSchema>;

export const SpatialRelationSchema = z.enum(['inside', 'overlapping', 'near']);
export type SpatialRelation = z.infer<typeof SpatialRelationSchema>;

export const InferenceSourceSchema = z.enum(['zone-color', 'zone-label', 'annotation', 'manual', 'cli-validation']);
export type InferenceSource = z.infer<typeof InferenceSourceSchema>;

// ============================================================================
// Placement Types
// ============================================================================

export const LogicalPlacementSchema = z.object({
  x: z.number(),
  y: z.number(),
  centerX: z.number(),
  centerY: z.number(),
  areaTopY: z.number().optional(),
  areaLeftX: z.number().optional(),
  zoneIds: z.array(z.string()).optional(),
});
export type LogicalPlacement = z.infer<typeof LogicalPlacementSchema>;

export const PhysicalPlacementSchema = z.object({
  x: z.number(),
  y: z.number(),
  globalX: z.number().optional(),
  globalY: z.number().optional(),
  containerPath: z.array(z.string()).optional(),
  containerUuidPath: z.array(z.string()).optional(),
  physicalObjectType: z.string().optional(),
});
export type PhysicalPlacement = z.infer<typeof PhysicalPlacementSchema>;

// ============================================================================
// PortTwin - Enriched Port Model
// ============================================================================

export const PortRefSchema = z.object({
  deviceId: z.string(),
  portName: z.string(),
});
export type PortRef = z.infer<typeof PortRefSchema>;

export const PortTwinSchema = z.object({
  name: z.string(),
  kind: PortKindSchema.default('unknown'),
  media: PortMediaSchema.optional(),
  moduleSlot: z.string().optional(),
  parentModuleId: z.string().optional(),
  adminStatus: z.enum(['up', 'down', 'shutdown', 'administratively down']).optional(),
  operStatus: z.enum(['up', 'down']).optional(),
  protocolStatus: z.enum(['up', 'down']).optional(),
  macAddress: z.string().optional(),
  ipAddress: z.string().optional(),
  subnetMask: z.string().optional(),
  gateway: z.string().optional(),
  vlanMode: VlanModeSchema.optional(),
  accessVlan: z.number().optional(),
  nativeVlan: z.number().optional(),
  allowedVlans: z.array(z.number()).optional(),
  connectedTo: PortRefSchema.optional(),
  lastSeenAt: z.number(),
});
export type PortTwin = z.infer<typeof PortTwinSchema>;

// ============================================================================
// ModuleTwin - Hardware Module Model
// ============================================================================

export const ModuleCategorySchema = z.enum(['power', 'network', 'interface', 'sfp', 'wireless', 'unknown']);
export type ModuleCategory = z.infer<typeof ModuleCategorySchema>;

// ============================================================================
// Provenance
// ============================================================================

export const ProvenanceInfoSchema = z.object({
  source: ProvenanceSourceSchema,
  collectedAt: z.number(),
  confidence: z.number().min(0).max(1).default(1),
});
export type ProvenanceInfo = z.infer<typeof ProvenanceInfoSchema>;

// ============================================================================
// CLI Twin
// ============================================================================

export const CliTwinSchema = z.object({
  currentMode: z.string().optional(),
  hostname: z.string().optional(),
  lastPrompt: z.string().optional(),
  lastOutput: z.string().optional(),
  lastCommand: z.string().optional(),
  lastExecutedAt: z.number().optional(),
});
export type CliTwin = z.infer<typeof CliTwinSchema>;

// ============================================================================
// Config Twin
// ============================================================================

export const InterfaceConfigTwinSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  ipAddress: z.string().optional(),
  subnetMask: z.string().optional(),
  vlanMode: VlanModeSchema.optional(),
  accessVlan: z.number().optional(),
  trunkAllowedVlans: z.array(z.number()).optional(),
  nativeVlan: z.number().optional(),
  switchportMode: z.enum(['access', 'trunk']).optional(),
  shutdown: z.boolean().optional(),
});
export type InterfaceConfigTwin = z.infer<typeof InterfaceConfigTwinSchema>;

export const RoutingConfigTwinSchema = z.object({
  protocol: z.string().optional(),
  routerId: z.string().optional(),
  networks: z.array(z.object({ network: z.string(), wildcard: z.string().optional(), area: z.string().optional() })).optional(),
  passiveInterfaces: z.array(z.string()).optional(),
});
export type RoutingConfigTwin = z.infer<typeof RoutingConfigTwinSchema>;

export const VlanConfigTwinSchema = z.object({
  id: z.number(),
  name: z.string().optional(),
});
export type VlanConfigTwin = z.infer<typeof VlanConfigTwinSchema>;

export const DhcpConfigTwinSchema = z.object({
  poolName: z.string(),
  network: z.string().optional(),
  defaultRouter: z.string().optional(),
  dnsServer: z.string().optional(),
  lease: z.string().optional(),
  excludedAddresses: z.array(z.string()).optional(),
});
export type DhcpConfigTwin = z.infer<typeof DhcpConfigTwinSchema>;

export const NatConfigTwinSchema = z.object({
  insideInterface: z.string().optional(),
  outsideInterface: z.string().optional(),
  localIp: z.string().optional(),
  globalIp: z.string().optional(),
});
export type NatConfigTwin = z.infer<typeof NatConfigTwinSchema>;

export const AclConfigTwinSchema = z.object({
  number: z.number(),
  type: z.enum(['standard', 'extended']).optional(),
  entries: z.array(z.string()).default([]),
});
export type AclConfigTwin = z.infer<typeof AclConfigTwinSchema>;

export const ConfigSectionsSchema = z.object({
  interfaces: z.record(z.string(), InterfaceConfigTwinSchema).optional(),
  routing: RoutingConfigTwinSchema.optional(),
  vlans: z.array(VlanConfigTwinSchema).optional(),
  dhcp: z.array(DhcpConfigTwinSchema).optional(),
  nat: z.array(NatConfigTwinSchema).optional(),
  acl: z.array(AclConfigTwinSchema).optional(),
});
export type ConfigSections = z.infer<typeof ConfigSectionsSchema>;

export const ConfigTwinSchema = z.object({
  source: z.enum(['show-running-config', 'startup-file', 'generated', 'inferred']).default('show-running-config'),
  raw: z.string().optional(),
  startupRaw: z.string().optional(),
  sections: ConfigSectionsSchema.optional(),
  hashes: z.object({
    running: z.string().optional(),
    startup: z.string().optional(),
  }).optional(),
  freshness: z.object({
    collectedAt: z.number(),
    staleAfterMs: z.number().default(300000),
  }).optional(),
});
export type ConfigTwin = z.infer<typeof ConfigTwinSchema>;

// ============================================================================
// Service Twin
// ============================================================================

export const ServiceTwinSchema = z.object({
  name: z.string(),
  type: z.enum(['dhcp', 'dns', 'http', 'https', 'ftp', 'tftp', 'email', 'other']).default('other'),
  status: z.enum(['running', 'stopped', 'unknown']).default('unknown'),
  port: z.number().optional(),
  details: z.record(z.string(), z.unknown()).optional(),
});
export type ServiceTwin = z.infer<typeof ServiceTwinSchema>;

// ============================================================================
// Capability Twin
// ============================================================================

export const CapabilityTwinSchema = z.object({
  supportsVlan: z.boolean().default(false),
  supportsTrunk: z.boolean().default(false),
  supportsRouting: z.boolean().default(false),
  supportsOspf: z.boolean().default(false),
  supportsEigrp: z.boolean().default(false),
  supportsDhcp: z.boolean().default(false),
  supportsAcl: z.boolean().default(false),
  supportsNat: z.boolean().default(false),
  maxVlanCount: z.number().optional(),
  maxPortCount: z.number().optional(),
  supportedModules: z.array(z.string()).default([]),
});
export type CapabilityTwin = z.infer<typeof CapabilityTwinSchema>;

// ============================================================================
// ModuleTwin Schema (after all referenced types are defined)
// ============================================================================

// Define the schema base first
const moduleTwinBase = z.object({
  id: z.string(),
  slot: z.string(),
  moduleType: z.string().optional(),
  model: z.string().optional(),
  displayName: z.string().optional(),
  category: ModuleCategorySchema.default('unknown'),
  removable: z.boolean().default(false),
  exposedPorts: z.array(z.string()).default([]),
});

// Use lazy for circular reference
export const ModuleTwinSchema = moduleTwinBase.extend({
  childModules: z.array(z.lazy(() => moduleTwinBase.extend({
    childModules: z.array(z.unknown()), // stop recursion at 2 levels
  }))).default([]),
});

export interface ModuleTwin extends z.infer<typeof moduleTwinBase> {
  childModules: ModuleTwin[];
}

// ============================================================================
// DeviceTwin - Main Device Model
// ============================================================================

export const DeviceDescriptorTwinSchema = z.object({
  description: z.string().optional(),
  hwVersion: z.string().optional(),
  fwVersion: z.string().optional(),
  swVersion: z.string().optional(),
  serialNumber: z.string().optional(),
  model: z.string().optional(),
  vendor: z.string().optional(),
});
export type DeviceDescriptorTwin = z.infer<typeof DeviceDescriptorTwinSchema>;

export const DeviceTwinSchema = z.object({
  id: z.string(),
  name: z.string(),
  model: z.string(),
  type: z.union([z.string(), z.number()]),
  family: DeviceFamilySchema.default('unknown'),
  power: z.boolean().default(true),
  uptime: z.number().optional(),
  serialNumber: z.string().optional(),
  logicalPosition: LogicalPlacementSchema,
  physicalPlacement: PhysicalPlacementSchema.optional(),
  descriptor: DeviceDescriptorTwinSchema.optional(),
  modules: z.array(ModuleTwinSchema).default([]),
  ports: z.record(z.string(), PortTwinSchema).default({}),
  cli: CliTwinSchema.optional(),
  config: ConfigTwinSchema.optional(),
  services: z.array(ServiceTwinSchema).default([]),
  capabilities: CapabilityTwinSchema.optional(),
  annotations: z.array(z.string()).default([]),
  provenance: ProvenanceInfoSchema,
});
export type DeviceTwin = z.infer<typeof DeviceTwinSchema>;

// ============================================================================
// ZoneTwin - Spatial Zone Model
// ============================================================================

export const ZoneMembershipRuleSchema = z.object({
  mode: z.enum(['center-inside', 'bbox-overlap', 'majority-area']).default('center-inside'),
  threshold: z.number().min(0).max(1).optional(),
});
export type ZoneMembershipRule = z.infer<typeof ZoneMembershipRuleSchema>;

export const ZoneSemanticsSchema = z.object({
  vlanId: z.number().optional(),
  vlanName: z.string().optional(),
  role: z.string().optional(),
  subnet: z.string().optional(),
  tags: z.array(z.string()).default([]),
});
export type ZoneSemantics = z.infer<typeof ZoneSemanticsSchema>;

export const ZoneStyleSchema = z.object({
  fillColor: z.string().optional(),
  borderColor: z.string().optional(),
  textColor: z.string().optional(),
});
export type ZoneStyle = z.infer<typeof ZoneStyleSchema>;

export const ZoneGeometrySchema = z.object({
  x1: z.number(),
  y1: z.number(),
  x2: z.number(),
  y2: z.number(),
});
export type ZoneGeometry = z.infer<typeof ZoneGeometrySchema>;

export const ZoneTwinSchema = z.object({
  id: z.string(),
  kind: ZoneKindSchema.default('rectangle'),
  label: z.string().optional(),
  geometry: ZoneGeometrySchema,
  style: ZoneStyleSchema.optional(),
  semantics: ZoneSemanticsSchema.optional(),
  membershipRule: ZoneMembershipRuleSchema.default({ mode: 'center-inside' }),
});
export type ZoneTwin = z.infer<typeof ZoneTwinSchema>;

// ============================================================================
// AnnotationTwin - Notes and Labels
// ============================================================================

export const AnnotationSemanticsSchema = z.object({
  vlanId: z.number().optional(),
  role: z.string().optional(),
  tags: z.array(z.string()).default([]),
});
export type AnnotationSemantics = z.infer<typeof AnnotationSemanticsSchema>;

export const AnnotationTwinSchema = z.object({
  id: z.string(),
  kind: AnnotationKindSchema.default('label'),
  text: z.string(),
  x: z.number(),
  y: z.number(),
  color: z.string().optional(),
  semantics: AnnotationSemanticsSchema.optional(),
});
export type AnnotationTwin = z.infer<typeof AnnotationTwinSchema>;

// ============================================================================
// Device Spatial Context
// ============================================================================

export const DeviceZoneMembershipSchema = z.object({
  zoneId: z.string(),
  relation: SpatialRelationSchema.default('inside'),
  confidence: z.number().min(0).max(1).default(1),
});
export type DeviceZoneMembership = z.infer<typeof DeviceZoneMembershipSchema>;

export const DeviceInferenceSchema = z.object({
  vlanId: z.number().optional(),
  role: z.string().optional(),
  source: InferenceSourceSchema,
  confidence: z.number().min(0).max(1).default(0.5),
});
export type DeviceInference = z.infer<typeof DeviceInferenceSchema>;

export const DeviceSpatialContextSchema = z.object({
  logicalPosition: z.object({
    x: z.number(),
    y: z.number(),
    width: z.number().optional(),
    height: z.number().optional(),
    centerX: z.number(),
    centerY: z.number(),
  }),
  zones: z.array(DeviceZoneMembershipSchema).default([]),
  inferred: DeviceInferenceSchema.optional(),
});
export type DeviceSpatialContext = z.infer<typeof DeviceSpatialContextSchema>;

// ============================================================================
// Link Twin
// ============================================================================

export const LinkTwinSchema = z.object({
  id: z.string(),
  device1: z.string(),
  port1: z.string(),
  device2: z.string(),
  port2: z.string(),
  cableType: z.string(),
  cableMedia: PortMediaSchema.optional(),
  connected: z.boolean().default(true),
});
export type LinkTwin = z.infer<typeof LinkTwinSchema>;

// ============================================================================
// NetworkTwin - Top Level Container
// ============================================================================

export const TwinIndexesSchema = z.object({
  byDeviceName: z.record(z.string(), z.any()).optional(),
  byModel: z.record(z.string(), z.array(z.string())).optional(),
  byPortRef: z.record(z.string(), z.any()).optional(),
  byZoneId: z.record(z.string(), z.array(z.string())).optional(),
  byPhysicalPath: z.record(z.string(), z.array(z.string())).optional(),
  byIp: z.record(z.string(), z.any()).optional(),
  byMac: z.record(z.string(), z.any()).optional(),
});
export type TwinIndexes = z.infer<typeof TwinIndexesSchema>;

export const NetworkTwinMetadataSchema = z.object({
  version: z.number().default(1),
  updatedAt: z.number(),
  createdAt: z.number().optional(),
});
export type NetworkTwinMetadata = z.infer<typeof NetworkTwinMetadataSchema>;

export const NetworkTwinSchema = z.object({
  devices: z.record(z.string(), DeviceTwinSchema).default({}),
  links: z.record(z.string(), LinkTwinSchema).default({}),
  zones: z.record(z.string(), ZoneTwinSchema).default({}),
  annotations: z.record(z.string(), AnnotationTwinSchema).default({}),
  indexes: TwinIndexesSchema.optional(),
  metadata: NetworkTwinMetadataSchema,
});
export type NetworkTwin = z.infer<typeof NetworkTwinSchema>;

// ============================================================================
// Zone Semantic Rules
// ============================================================================

export const ZoneSemanticRuleSchema = z.object({
  color: z.string().optional(),
  labelPattern: z.string().optional(),
  vlanId: z.number().optional(),
  role: z.string().optional(),
  priority: z.number().default(0),
});
export type ZoneSemanticRule = z.infer<typeof ZoneSemanticRuleSchema>;

export const DEFAULT_ZONE_RULES: ZoneSemanticRule[] = [
  { color: '#0000FF', vlanId: 10, role: 'usuarios', priority: 1 },
  { color: '#0000ff', vlanId: 10, role: 'usuarios', priority: 1 },
  { color: '#FF00FF', vlanId: 20, role: 'usuarios', priority: 1 },
  { color: '#ff00ff', vlanId: 20, role: 'usuarios', priority: 1 },
  { color: '#FFFF00', vlanId: 30, role: 'usuarios', priority: 1 },
  { color: '#ffff00', vlanId: 30, role: 'usuarios', priority: 1 },
  { color: '#00FF00', vlanId: 40, role: 'usuarios', priority: 1 },
  { color: '#00ff00', vlanId: 40, role: 'usuarios', priority: 1 },
  { color: '#FFA500', vlanId: 50, role: 'servidores', priority: 1 },
  { color: '#ffa500', vlanId: 50, role: 'servidores', priority: 1 },
];

// ============================================================================
// Agent Base Context Types
// ============================================================================

export const AgentBaseContextSchema = z.object({
  lab: z.object({
    name: z.string().optional(),
    deviceCount: z.number(),
    linkCount: z.number(),
    zoneCount: z.number(),
    lastUpdatedAt: z.number(),
  }),
  topology: z.object({
    coreDevices: z.array(z.string()).default([]),
    accessDevices: z.array(z.string()).default([]),
    serverDevices: z.array(z.string()).default([]),
    edgeDevices: z.array(z.string()).default([]),
  }),
  selection: z.object({
    selectedDevice: z.string().optional(),
    selectedZone: z.string().optional(),
    focusDevices: z.array(z.string()).default([]),
  }).optional(),
  zones: z.array(z.object({
    id: z.string(),
    label: z.string().optional(),
    color: z.string().optional(),
    inferredVlanId: z.number().optional(),
    deviceCount: z.number(),
  })).default([]),
  alerts: z.array(z.string()).default([]),
  recentChanges: z.array(z.object({
    type: z.string(),
    target: z.string(),
    ts: z.number(),
  })).default([]),
});
export type AgentBaseContext = z.infer<typeof AgentBaseContextSchema>;

// ============================================================================
// Session State
// ============================================================================

export const AgentSessionStateSchema = z.object({
  selectedDevice: z.string().optional(),
  selectedZone: z.string().optional(),
  focusDevices: z.array(z.string()).default([]),
  lastTask: z.string().optional(),
  lastPlan: z.array(z.string()).optional(),
  verbosity: z.enum(['compact', 'normal', 'detailed']).default('normal'),
});
export type AgentSessionState = z.infer<typeof AgentSessionStateSchema>;
