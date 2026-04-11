import { z } from 'zod';

/**
 * History Entry Schema
 * Represents a single command in the session history
 */
export const HistoryEntrySchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  sessionId: z.string(),
  command: z.string(),
  output: z.string().optional(),
  error: z.string().optional(),
  durationMs: z.number().optional(),
  exitCode: z.number().optional(),
});
export type HistoryEntry = z.infer<typeof HistoryEntrySchema>;
