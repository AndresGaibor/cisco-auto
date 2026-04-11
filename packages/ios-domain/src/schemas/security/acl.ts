import { z } from 'zod';
import {
  Ipv4Address,
  WildcardMask,
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

const aclAction = z.enum(['permit', 'deny']);
const aclProtocol = z.union([
  z.literal('ip'),
  z.literal('tcp'),
  z.literal('udp'),
  z.literal('icmp'),
  z.number().int().min(0).max(255) // for protocol numbers
]);

const aclPortString = z.string().refine(
  (val): val is string => {
    // Allow port numbers, ranges, or keywords like 'eq', 'lt', 'gt', 'neq', 'range'
    const portPattern = /^(\d+|eq \d+|lt \d+|gt \d+|neq \d+|range \d+ \d+)$/;
    return portPattern.test(val);
  },
  {
    error: 'Invalid port specification',
  }
);

export const AclRuleSchema = z.object({
  action: aclAction,
  protocol: aclProtocol,
  source: ipv4AddressString,
  sourceWildcard: wildcardMaskString.optional(),
  sourcePort: aclPortString.optional(),
  destination: ipv4AddressString.optional(),
  destinationWildcard: wildcardMaskString.optional(),
  destinationPort: aclPortString.optional(),
  log: z.boolean().optional().default(false),
});

export const AclConfigSchema = z.object({
  name: z.string().min(1, 'ACL name is required'),
  type: z.enum(['standard', 'extended']),
  rules: z.array(AclRuleSchema).min(1, 'At least one rule is required'),
});

export type AclConfig = z.infer<typeof AclConfigSchema>;

export function parseAclConfig(input: unknown) {
  return AclConfigSchema.safeParse(input);
}

export function parseAclConfigStrict(input: unknown): AclConfig {
  return AclConfigSchema.parse(input);
}
