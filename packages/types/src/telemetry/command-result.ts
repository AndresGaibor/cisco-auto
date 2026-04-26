import { z } from 'zod';

/**
 * Telemetry Command Result Schema
 * Resultado de la ejecución de un comando para telemetry
 * Incluye commandId para correlación con logs
 */
export const TelemetryCommandResultSchema = z.object({
  commandId: z.string(),
  sessionId: z.string(),
  device: z.string(),
  command: z.string(),
  ok: z.boolean(),
  raw: z.string(),
  status: z.number(),
  durationMs: z.number().optional(),
  timestamp: z.string(),
  classification: z.string().optional(),
  error: z.string().optional(),
  warnings: z.array(z.string()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type TelemetryCommandResult = z.infer<typeof TelemetryCommandResultSchema>;
