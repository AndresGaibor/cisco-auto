import { z } from 'zod';
import {
  InterfaceName,
} from '../../value-objects/index.ts';

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

export const NatConfigSchema = z.object({
  type: z.enum(['static', 'dynamic', 'pat']),
  insideInterface: interfaceNameString,
  outsideInterface: interfaceNameString,
});

export type NatConfig = z.infer<typeof NatConfigSchema>;

export function parseNatConfig(input: unknown) {
  return NatConfigSchema.safeParse(input);
}

export function parseNatConfigStrict(input: unknown): NatConfig {
  return NatConfigSchema.parse(input);
}
