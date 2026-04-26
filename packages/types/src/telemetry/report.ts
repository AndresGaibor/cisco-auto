import { z } from 'zod';

/**
 * Report Schema
 * Reporte unificado que consolida execution events, results y verifications
 * Para auditoría y generación de reportes
 */
export const ReportSchema = z.object({
  reportId: z.string(),
  sessionId: z.string(),
  timestamp: z.string(),
  title: z.string(),
  summary: z.object({
    totalCommands: z.number(),
    successfulCommands: z.number(),
    failedCommands: z.number(),
    totalVerifications: z.number(),
    passedVerifications: z.number(),
    failedVerifications: z.number(),
    durationMs: z.number().optional(),
  }),
  commandResults: z.array(z.object({
    commandId: z.string(),
    sessionId: z.string(),
    device: z.string(),
    command: z.string(),
    ok: z.boolean(),
    durationMs: z.number().optional(),
  })).optional(),
  verificationResults: z.array(z.object({
    verificationId: z.string(),
    sessionId: z.string(),
    device: z.string(),
    checkType: z.string(),
    passed: z.boolean(),
  })).optional(),
  executionEvents: z.array(z.object({
    eventId: z.string(),
    commandId: z.string(),
    sessionId: z.string(),
    eventType: z.string(),
    durationMs: z.number().optional(),
  })).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type Report = z.infer<typeof ReportSchema>;
