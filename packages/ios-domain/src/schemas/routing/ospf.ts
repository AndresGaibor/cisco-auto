import { z } from 'zod';
import {
  Ipv4Address,
  WildcardMask,
  InterfaceName,
} from '../../value-objects/index.ts';

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

const ospfProcessId = z.number().int().min(1).max(65535);

const ospfAreaSettingsSchema = z.object({
  stub: z.boolean().optional(),
  nssa: z.boolean().optional(),
});

export const OspfNetworkSchema = z.object({
  network: ipv4AddressString,
  wildcard: wildcardMaskString,
  area: z.union([
    z.number().int().min(0).max(4294967295),
    ipv4AddressString,
  ]),
});

export const OspfConfigSchema = z.object({
  device: z.string().min(1),
  type: z.literal('ospf'),
  processId: ospfProcessId,
  routerId: ipv4AddressString.optional(),
  networks: z.array(OspfNetworkSchema).min(1),
  passiveInterfaces: z.array(interfaceNameString).optional(),
  areas: z.record(z.string(), ospfAreaSettingsSchema).optional(),
});

export type OspfConfig = z.infer<typeof OspfConfigSchema>;

export function parseOspfConfig(input: unknown) {
  return OspfConfigSchema.safeParse(input);
}

export function parseOspfConfigStrict(input: unknown): OspfConfig {
  return OspfConfigSchema.parse(input);
}
