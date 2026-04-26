/**
 * Schemas Zod para validación de CommandMetadata
 */

import { z } from 'zod';

export const CommandExampleSchema: z.ZodSchema = z.object({
  description: z.string(),
  command: z.string(),
});

export const RelatedCommandSchema: z.ZodSchema = z.object({
  name: z.string(),
  description: z.string(),
});

export const CommandMetadataSchema: z.ZodSchema = z.object({
  id: z.string(),
  summary: z.string(),
  longDescription: z.string().optional(),
  examples: z.array(CommandExampleSchema),
  related: z.array(RelatedCommandSchema),
  status: z.enum(['stable', 'beta', 'deprecated']).optional(),
});

export const CommandExamplesRecordSchema: z.ZodSchema = z.record(z.string(), z.array(CommandExampleSchema));

export const RelatedCommandsRecordSchema: z.ZodSchema = z.record(z.string(), z.array(RelatedCommandSchema));
