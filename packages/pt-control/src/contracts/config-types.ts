import { z } from 'zod';
import { VlanModeSchema } from './twin-enums.js';

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
