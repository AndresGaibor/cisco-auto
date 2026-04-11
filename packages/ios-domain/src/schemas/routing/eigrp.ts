import { z } from 'zod';
import {
  Ipv4Address,
  WildcardMask,
  InterfaceName,
} from '../../value-objects/index.ts';
import { parseAsn } from '../../value-objects/asn.ts';

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
  }
);

const wildcardMaskString = z.string().refine(
  (val): val is string => {
    try {
      new WildcardMask(val);
      return true;
    } catch {
      return false;
    }
  },
  {
    error: 'Invalid wildcard mask',
  }
);

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
  }
);

const autonomousSystemNumber = z.union([z.number().int(), z.string()]).refine(
  (val): val is number | string => {
    try {
      // parseAsn accepts string | number and throws on invalid
      // We only validate here; consumers may use the original value
      parseAsn(val as any);
      return true;
    } catch {
      return false;
    }
  },
  {
    error: 'Invalid ASN',
  }
);

const eigrpNetworkSchema = z.object({
  network: ipv4AddressString,
  wildcard: wildcardMaskString,
});

export const EigrpConfigSchema = z.object({
  device: z.string().min(1),
  type: z.literal('eigrp'),
  autonomousSystem: autonomousSystemNumber,
  networks: z.array(eigrpNetworkSchema).min(1),
  passiveInterfaces: z.array(interfaceNameString).optional(),
});

export type EigrpConfig = z.infer<typeof EigrpConfigSchema>;

export function parseEigrpConfig(input: unknown) {
  return EigrpConfigSchema.safeParse(input);
}

export function parseEigrpConfigStrict(input: unknown): EigrpConfig {
  return EigrpConfigSchema.parse(input);
}
