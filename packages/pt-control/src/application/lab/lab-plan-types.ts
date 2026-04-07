import { z } from 'zod';
import type { LabResourceType } from '../../contracts/lab-resource.js';

export const LabOperationTypeSchema = z.enum([
  'create-device',
  'move-device',
  'rename-device',
  'remove-device',
  'create-link',
  'repair-link',
  'remove-link',
  'configure-vlan',
  'configure-trunk',
  'configure-access-port',
  'configure-svi',
  'configure-static-route',
  'configure-dhcp-pool',
  'configure-host',
  'configure-service',
  'configure-ios-global',
  'verify-resource',
  'unsupported-resource',
  'manual-step-required',
  'no-op',
]);
export type LabOperationType = z.infer<typeof LabOperationTypeSchema>;

export const LabOperationStatusSchema = z.enum([
  'pending',
  'in-progress',
  'completed',
  'failed',
  'skipped',
]);
export type LabOperationStatus = z.infer<typeof LabOperationStatusSchema>;

export interface LabOperation {
  id: string;
  type: LabOperationType;
  resourceType: LabResourceType;
  resourceId: string;
  description: string;
  device?: string;
  params: Record<string, unknown>;
  dependsOn?: string[];
  status: LabOperationStatus;
  error?: string;
  retries?: number;
  executedAt?: number;
  completedAt?: number;
}

export interface LabPlan {
  labId: string;
  planId: string;
  createdAt: number;
  operations: LabOperation[];
  summary: {
    total: number;
    byType: Record<string, number>;
    byStatus: Record<string, number>;
  };
  metadata: {
    desiredVersion: string;
    observedHash?: string;
    mode: 'incremental' | 'rebuild';
  };
}

export interface LabDiffItem {
  resourceType: LabResourceType;
  resourceId: string;
  status: 'missing' | 'extra' | 'drift' | 'ok' | 'unsupported' | 'unreliable';
  expected?: unknown;
  observed?: unknown;
  diff?: Record<string, { expected: unknown; observed: unknown }>;
  confidence: number;
  notes?: string[];
}

export interface LabDiff {
  labId: string;
  generatedAt: number;
  items: LabDiffItem[];
  summary: {
    missing: number;
    extra: number;
    drift: number;
    ok: number;
    unsupported: number;
    unreliable: number;
  };
}
