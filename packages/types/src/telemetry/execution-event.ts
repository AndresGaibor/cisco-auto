import { z } from 'zod';

/**
 * Execution Event Schema
 * Events que representan la ejecución de comandos en el motor de PT
 * Correlacionables via commandId y sessionId
 */
export const ExecutionEventSchema = z.object({
  eventId: z.string(),
  commandId: z.string(),
  sessionId: z.string(),
  timestamp: z.string(),
  eventType: z.enum(['started', 'completed', 'failed', 'timeout', 'cancelled']),
  device: z.string().optional(),
  command: z.string().optional(),
  durationMs: z.number().optional(),
  exitCode: z.number().optional(),
  error: z.string().optional(),
});
export type ExecutionEvent = z.infer<typeof ExecutionEventSchema>;
