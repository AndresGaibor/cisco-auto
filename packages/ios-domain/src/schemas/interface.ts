import { z } from 'zod';
import { InterfaceName } from '../value-objects/interface-name.ts';
import { Ipv4Address } from '../value-objects/ipv4-address.ts';
import { SubnetMask } from '../value-objects/subnet-mask.ts';
import { InterfaceDescription } from '../value-objects/interface-description.ts';

const interfaceNameString = z.string().refine(
  (val): val is string => {
    try {
      new InterfaceName(val);
      return true;
    } catch {
      return false;
    }
  },
  {
    error: 'Invalid interface name',
  },
);

const ipv4AddressString = z.string().refine(
  (val): val is string => {
    try {
      new Ipv4Address(val);
      return true;
    } catch {
      return false;
    }
  },
  {
    error: 'Invalid IPv4 address',
  },
);

const subnetMaskString = z.string().refine(
  (val): val is string => {
    try {
      new SubnetMask(val);
      return true;
    } catch {
      return false;
    }
  },
  {
    error: 'Invalid subnet mask',
  },
);

const interfaceDescriptionString = z.string().refine(
  (val): val is string => {
    try {
      new InterfaceDescription(val);
      return true;
    } catch {
      return false;
    }
  },
  {
    error: 'Invalid interface description',
  },
);

export const InterfaceConfigSchema = z.object({
  name: interfaceNameString,
  ip: ipv4AddressString.optional(),
  mask: subnetMaskString.optional(),
  description: interfaceDescriptionString.optional(),
  shutdown: z.boolean().optional().default(false),
});

export type InterfaceConfig = z.infer<typeof InterfaceConfigSchema>;

export function parseInterfaceConfig(input: unknown) {
  return InterfaceConfigSchema.safeParse(input);
}

export function parseInterfaceConfigStrict(input: unknown): InterfaceConfig {
  return InterfaceConfigSchema.parse(input);
}