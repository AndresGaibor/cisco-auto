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
