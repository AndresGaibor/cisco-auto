import { z } from 'zod';
import { ProvenanceSourceSchema } from './twin-enums.js';

export const ProvenanceInfoSchema = z.object({
  source: ProvenanceSourceSchema,
  collectedAt: z.number(),
  confidence: z.number().min(0).max(1).default(1),
});
export type ProvenanceInfo = z.infer<typeof ProvenanceInfoSchema>;

export const CliTwinSchema = z.object({
  currentMode: z.string().optional(),
  hostname: z.string().optional(),
  lastPrompt: z.string().optional(),
  lastOutput: z.string().optional(),
  lastCommand: z.string().optional(),
  lastExecutedAt: z.number().optional(),
});
export type CliTwin = z.infer<typeof CliTwinSchema>;
