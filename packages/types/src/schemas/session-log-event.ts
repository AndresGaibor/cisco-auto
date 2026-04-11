import { z } from 'zod';

/**
 * Session Log Event Schema
 * Represents an event in the session logging system
 */
export const SessionLogEventSchema = z.object({
  eventId: z.string(),
  sessionId: z.string(),
  timestamp: z.string(),
  eventType: z.enum(['command', 'output', 'error', 'info', 'debug']),
  payload: z.record(z.unknown()),
});
export type SessionLogEvent = z.infer<typeof SessionLogEventSchema>;
