import { z } from 'zod';

// =============================================================================
// STP (Spanning Tree Protocol) SCHEMA
// =============================================================================

const stpModeSchema = z.enum(['pvst', 'rapid-pvst', 'mst']);

const stpVlanConfigSchema = z.object({
  vlanId: z.number().int().min(1).max(4094),
  priority: z.number().int().min(0).max(61440).multipleOf(4096).optional(),
  rootPrimary: z.boolean().optional(),
  rootSecondary: z.boolean().optional(),
});

const stpInterfaceConfigSchema = z.object({
  interface: z.string().min(1),
  portfast: z.boolean().optional(),
  bpduguard: z.boolean().optional(),
  bpdufilter: z.boolean().optional(),
  cost: z.number().int().positive().optional(),
  portPriority: z.number().int().min(0).max(240).optional(),
  linkType: z.enum(['point-to-point', 'shared']).optional(),
});

export const stpSchema = z.object({
  mode: stpModeSchema,
  priority: z.number().int().min(0).max(61440).multipleOf(4096).optional(),
  vlanConfig: z.array(stpVlanConfigSchema).optional(),
  rootPrimary: z.array(z.number().int().min(1).max(4094)).optional(),
  rootSecondary: z.array(z.number().int().min(1).max(4094)).optional(),
  portfastDefault: z.boolean().optional(),
  bpduguardDefault: z.boolean().optional(),
  bpdufilterDefault: z.boolean().optional(),
  interfaceConfig: z.array(stpInterfaceConfigSchema).optional(),
});

export type StpConfig = z.output<typeof stpSchema>;
export type StpConfigInput = z.input<typeof stpSchema>;

// =============================================================================
// VTP (VLAN Trunking Protocol) SCHEMA
// =============================================================================

const vtpModeSchema = z.enum(['server', 'client', 'transparent']);

export const vtpSchema = z.object({
  mode: vtpModeSchema,
  domain: z.string().min(1).max(32).optional(),
  password: z.string().min(1).max(8).optional(),
  version: z.number().int().min(1).max(3).optional(),
});

export type VtpConfig = z.output<typeof vtpSchema>;
export type VtpConfigInput = z.input<typeof vtpSchema>;

// =============================================================================
// ETHERCHANNEL SCHEMA
// =============================================================================

const etherChannelModeSchema = z.enum(['active', 'passive', 'on', 'desirable', 'auto']);

export const etherChannelSchema = z.object({
  groupId: z.number().int().min(1).max(64),
  mode: etherChannelModeSchema,
  interfaces: z.array(z.string().min(1)),
  portChannel: z.string().min(1),
  trunkMode: z.enum(['access', 'trunk']).optional(),
  accessVlan: z.number().int().min(1).max(4094).optional(),
  nativeVlan: z.number().int().min(1).max(4094).optional(),
  allowedVlans: z.union([z.array(z.number().int().min(1).max(4094)), z.literal('all')]).optional(),
  description: z.string().optional(),
  loadBalancing: z.enum([
    'src-dst-mac',
    'src-dst-ip',
    'src-mac',
    'dst-mac',
    'src-ip',
    'dst-ip',
  ]).optional(),
});

export type EtherChannelConfig = z.output<typeof etherChannelSchema>;
export type EtherChannelConfigInput = z.input<typeof etherChannelSchema>;
