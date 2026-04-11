import { z } from 'zod';
import {
  Ipv4Address,
  SubnetMask,
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

const nextHopString = z.string().refine(
  (val): val is string => {
    try {
      new Ipv4Address(val);
      return true;
    } catch {
      try {
        new InterfaceName(val);
        return true;
      } catch {
        return false;
      }
    }
  },
  {
    error: 'Invalid next hop',
  }
);

export const StaticRouteSchema = z.object({
  device: z.string().min(1),
  type: z.literal('static-route'),
  destination: ipv4AddressString,
  mask: subnetMaskString,
  nextHop: nextHopString,
});

export type StaticRouteConfig = z.infer<typeof StaticRouteSchema>;

export function parseStaticRouteConfig(input: unknown) {
  return StaticRouteSchema.safeParse(input);
}

export function parseStaticRouteConfigStrict(input: unknown): StaticRouteConfig {
  return StaticRouteSchema.parse(input);
}
