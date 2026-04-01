import { z } from 'zod';
import { PortKindSchema, PortMediaSchema, VlanModeSchema } from './twin-enums.js';

export const PortRefSchema = z.object({
  deviceId: z.string(),
  portName: z.string(),
});
export type PortRef = z.infer<typeof PortRefSchema>;

export const PortTwinSchema = z.object({
  name: z.string(),
  kind: PortKindSchema.default('unknown'),
  media: PortMediaSchema.optional(),
  moduleSlot: z.string().optional(),
  parentModuleId: z.string().optional(),
  adminStatus: z.enum(['up', 'down', 'shutdown', 'administratively down']).optional(),
  operStatus: z.enum(['up', 'down']).optional(),
  protocolStatus: z.enum(['up', 'down']).optional(),
  macAddress: z.string().optional(),
  ipAddress: z.string().optional(),
  subnetMask: z.string().optional(),
  gateway: z.string().optional(),
  vlanMode: VlanModeSchema.optional(),
  accessVlan: z.number().optional(),
  nativeVlan: z.number().optional(),
  allowedVlans: z.array(z.number()).optional(),
  connectedTo: PortRefSchema.optional(),
  lastSeenAt: z.number(),
});
export type PortTwin = z.infer<typeof PortTwinSchema>;
