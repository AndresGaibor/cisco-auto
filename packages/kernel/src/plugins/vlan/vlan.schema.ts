import { z } from 'zod';
import { parseVlanId, VlanId } from '../../domain/ios/value-objects/vlan-id.vo.js';
import { parseVlanName } from '@cisco-auto/ios-domain/value-objects';

const vlanIdSchema = z
  .union([z.number().int(), z.string().regex(/^\d+$/)])
  .refine((value) => VlanId.isValid(value), {
    message: 'Invalid VLAN ID',
  })
  .transform((value) => parseVlanId(value));

const vlanEntrySchema = z.object({
  id: vlanIdSchema,
  name: z.string().optional().transform((value) => {
    if (value === undefined) {
      return undefined;
    }

    return parseVlanName(value).value;
  }),
});

const accessPortSchema = z.object({
  port: z.string().min(1),
  vlan: vlanIdSchema,
});

export const vlanSchema = z.object({
  switchName: z.string().min(1),
  vlans: z.array(vlanEntrySchema),
  trunkPorts: z.array(z.string().min(1)).optional(),
  accessPorts: z.array(accessPortSchema).optional(),
});

export type VlanConfig = z.output<typeof vlanSchema>;
export type VlanConfigInput = z.input<typeof vlanSchema>;

export const sviEntrySchema = z.object({
  vlanId: z
    .union([z.number().int(), z.string().regex(/^\d+$/)])
    .refine((value) => VlanId.isValid(value), {
      message: 'Invalid VLAN ID for SVI',
    })
    .transform((value) => parseVlanId(value)),
  ipAddress: z.string().min(1).describe('Dirección IP de la SVI'),
  subnetMask: z.string().min(1).describe('Máscara de subred'),
  description: z.string().optional(),
  shutdown: z.boolean().optional().default(false),
});

export const sviSchema = z.object({
  deviceName: z.string().min(1),
  svis: z.array(sviEntrySchema),
  ipRouting: z.boolean().optional().default(false).describe('Activar ip routing si es switch L3'),
});

export type SviConfig = z.output<typeof sviSchema>;
export type SviConfigInput = z.input<typeof sviSchema>;
