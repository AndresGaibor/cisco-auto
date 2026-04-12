import { z } from 'zod';
import { basicConfigSchema } from '../basic-config/basic-config.schema.js';
import { vlanSchema } from '../vlan/vlan.schema.js';
import { routingConfigSchema } from '../routing/routing.schema.js';
import { securitySchema } from '../security/security.schema.js';
import { servicesSchema } from '../services/services.schema.js';
import { stpSchema, etherChannelSchema, vtpSchema } from '../switching/switching.schema.js';

// SVI Schema (Interface VLAN para switches L3)
const sviEntrySchema = z.object({
  vlanId: z.number().int().min(1).max(4094),
  ipAddress: z.string().min(1),
  subnetMask: z.string().min(1),
  description: z.string().optional(),
});

export const sviSchema = z.object({
  deviceName: z.string().min(1),
  svis: z.array(sviEntrySchema),
});

export type SviConfig = z.output<typeof sviSchema>;
export type SviConfigInput = z.input<typeof sviSchema>;

export const deviceConfigSpecSchema = z.object({
  deviceName: z.string().min(1),
  basic: basicConfigSchema.omit({ deviceName: true }).partial().optional(),
  vlan: vlanSchema.omit({ switchName: true }).partial().optional(),
  svi: sviSchema.omit({ deviceName: true }).partial().optional(),
  vtp: vtpSchema.optional(),
  stp: stpSchema.optional(),
  etherchannel: etherChannelSchema.optional(),
  routing: routingConfigSchema.omit({ deviceName: true }).partial().optional(),
  security: securitySchema.omit({ deviceName: true }).partial().optional(),
  services: servicesSchema.omit({ deviceName: true }).partial().optional(),
});

export type DeviceConfigSpec = z.output<typeof deviceConfigSpecSchema>;
export type DeviceConfigSpecInput = z.input<typeof deviceConfigSpecSchema>;
