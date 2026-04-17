import { z } from "zod";
import { DeviceFamilySchema, PortMediaSchema } from "./twin-enums.js";
import { LogicalPlacementSchema, PhysicalPlacementSchema } from "./placement-types.js";
import { PortTwinSchema } from "./port-types.js";
import { CliTwinSchema, ProvenanceInfoSchema } from "./provenance-types.js";
import { ConfigTwinSchema } from "./config-types.js";
import {
  ServiceTwinSchema,
  CapabilityTwinSchema,
  ModuleTwinSchema,
} from "./device-traits-types.js";

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
  family: DeviceFamilySchema.default("unknown"),
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
// Device List Result Types (para listDevices)
// ============================================================================

export interface ConnectionInfo {
  localPort: string | null;
  remoteDevice: string | null;
  remotePort: string | null;
  confidence: "exact" | "registry" | "ambiguous" | "unknown";
  evidence?: {
    localCandidates?: string[];
    remoteCandidates?: string[];
    source?: string;
  };
}

export interface UnresolvedLink {
  port1Name: string;
  port2Name: string;
  candidates1: string[];
  candidates2: string[];
}

export interface LinkStats {
  exact: number;
  registry: number;
  merged: number;
  ambiguous: number;
  unresolved: number;
}

export interface DeviceListResult {
  devices: import("./snapshots.js").DeviceState[];
  connectionsByDevice: Record<string, ConnectionInfo[]>;
  unresolvedLinks: UnresolvedLink[];
  count: number;
  ptLinkDebug?: any;
}
