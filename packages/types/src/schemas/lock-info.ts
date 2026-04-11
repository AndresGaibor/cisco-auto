import { z } from 'zod';

/**
 * Lock Info Schema
 * Represents a lock on a resource (device, topology, etc.)
 */
export const LockInfoSchema = z.object({
  resourceId: z.string(),
  resourceType: z.enum(['device', 'topology', 'lab', 'session']),
  lockedBy: z.string(),
  lockedAt: z.string(),
  expiresAt: z.string().optional(),
});
export type LockInfo = z.infer<typeof LockInfoSchema>;
