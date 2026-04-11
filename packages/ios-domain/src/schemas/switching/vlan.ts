import { z } from 'zod';
import { VlanId } from '../../value-objects/index.ts';

const vlanIdString = z.string().refine(
  (val): val is string => {
    try {
      VlanId.fromString(val);
      return true;
    } catch {
      return false;
    }
  },
  {
    error: 'Invalid VLAN ID',
  }
);

const vlanNameString = z.string().min(1, 'VLAN name is required').max(32, 'VLAN name must be 32 characters or less');

const vlanStateEnum = z.enum(['active', 'suspended', 'act/unsup']);

export const VlanConfigSchema = z.object({
  id: vlanIdString,
  name: vlanNameString,
  state: vlanStateEnum.optional().default('active'),
});

export type VlanConfig = z.infer<typeof VlanConfigSchema>;

export function parseVlanConfig(input: unknown) {
  return VlanConfigSchema.safeParse(input);
}

export function parseVlanConfigStrict(input: unknown): VlanConfig {
  return VlanConfigSchema.parse(input);
}
