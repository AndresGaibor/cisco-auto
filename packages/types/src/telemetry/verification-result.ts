import { z } from 'zod';

/**
 * Verification Result Schema
 * Resultado de una verificación (ej. ping, show commands)
 * Correlacionable via commandId y sessionId
 */
export const VerificationResultSchema = z.object({
  verificationId: z.string(),
  commandId: z.string().optional(),
  sessionId: z.string(),
  timestamp: z.string(),
  device: z.string(),
  checkType: z.enum(['ping', 'connectivity', 'route', 'vlan', 'interface', 'acl', 'dhcp', 'custom']),
  target: z.string().optional(),
  expected: z.string().optional(),
  actual: z.string().optional(),
  passed: z.boolean(),
  details: z.record(z.string(), z.unknown()).optional(),
  error: z.string().optional(),
});
export type VerificationResult = z.infer<typeof VerificationResultSchema>;
