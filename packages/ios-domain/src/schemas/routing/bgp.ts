import { z } from 'zod';
import { Ipv4Address, InterfaceName } from '../../value-objects/index.ts';
import { parseAsn } from '../../value-objects/asn.ts';
import { isValidIpWithPrefix } from '../../value-objects/ip-with-prefix.ts';

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

const bgpNeighborSchema = z.object({
  ip: ipv4AddressString,
  remoteAs: autonomousSystemNumber,
  description: z.string().optional(),
});

const bgpNetworkSchema = z.string().refine(
  (val): val is string => {
    try {
      return isValidIpWithPrefix(val);
    } catch {
      return false;
    }
  },
  {
    error: 'Invalid network (CIDR)',
  }
);

export const BgpConfigSchema = z.object({
  device: z.string().min(1),
  type: z.literal('bgp'),
  autonomousSystem: autonomousSystemNumber,
  neighbors: z.array(bgpNeighborSchema).min(1),
  networks: z.array(bgpNetworkSchema).min(1),
});

export type BgpConfig = z.infer<typeof BgpConfigSchema>;

export function parseBgpConfig(input: unknown) {
  return BgpConfigSchema.safeParse(input);
}

export function parseBgpConfigStrict(input: unknown): BgpConfig {
  return BgpConfigSchema.parse(input);
}
