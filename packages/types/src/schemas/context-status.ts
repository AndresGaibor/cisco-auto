import { z } from 'zod';

/**
 * Context Status Schema
 * Represents the current state of a CLI context/session
 */
export const ContextStatusSchema = z.enum(['idle', 'active', 'busy', 'error']);
export type ContextStatus = z.infer<typeof ContextStatusSchema>;
