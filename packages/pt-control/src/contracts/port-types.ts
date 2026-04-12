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

export const PortCandidateSchema = z.object({
  device: z.string(),
  port: z.string(),
  score: z.number().default(0),
  occupied: z.boolean().default(false),
  reason: z.string().optional(),
});
export type PortCandidate = z.infer<typeof PortCandidateSchema>;

export const PortPlanSchema = z.object({
  sourceCandidates: z.array(PortCandidateSchema).default([]),
  targetCandidates: z.array(PortCandidateSchema).default([]),
  warnings: z.array(z.string()).default([]),
});
export type PortPlan = z.infer<typeof PortPlanSchema>;

export const LinkFeasibilitySchema = z.object({
  feasible: z.boolean(),
  source: PortCandidateSchema.optional(),
  target: PortCandidateSchema.optional(),
  reasons: z.array(z.string()).default([]),
  suggestions: z.array(PortCandidateSchema).default([]),
});
export type LinkFeasibility = z.infer<typeof LinkFeasibilitySchema>;
