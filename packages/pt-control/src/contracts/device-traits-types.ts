import { z } from 'zod';
import { ModuleCategorySchema } from './twin-enums.js';

export const ServiceTwinSchema = z.object({
  name: z.string(),
  type: z.enum(['dhcp', 'dns', 'http', 'https', 'ftp', 'tftp', 'email', 'other']).default('other'),
  status: z.enum(['running', 'stopped', 'unknown']).default('unknown'),
  port: z.number().optional(),
  details: z.record(z.string(), z.unknown()).optional(),
});
export type ServiceTwin = z.infer<typeof ServiceTwinSchema>;

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

export const ModuleTwinSchema = moduleTwinBase.extend({
  childModules: z.array(z.lazy(() => moduleTwinBase.extend({
    childModules: z.array(z.unknown()),
  }))).default([]),
});

export interface ModuleTwin extends z.infer<typeof moduleTwinBase> {
  childModules: ModuleTwin[];
}
