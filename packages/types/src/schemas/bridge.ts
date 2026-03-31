import { z } from 'zod';

/**
 * File Bridge V2 Protocol Schemas
 * Single Source of Truth for CLI ↔ Packet Tracer file-based communication
 */

export const BRIDGE_PROTOCOL_VERSION = 2 as const;
export type BridgeProtocolVersion = typeof BRIDGE_PROTOCOL_VERSION;

// ============================================================================
// Event Validation Schema
// ============================================================================

export const BridgeEventSchema = z.object({
  seq: z.number().int().nonnegative(),
  ts: z.number().int().nonnegative(),
  type: z.string().min(1),
  id: z.string().optional(),
}).passthrough();

export type BridgeEventInput = z.input<typeof BridgeEventSchema>;

// ============================================================================
// Command Envelope
// ============================================================================

export interface BridgeCommandEnvelope<T = unknown> {
  protocolVersion: BridgeProtocolVersion;
  id: string;
  seq: number;
  createdAt: number;
  type: string;
  payload: T;
  attempt: number;
  expiresAt?: number;
  checksum?: string;
}

// ============================================================================
// Result Envelope
// ============================================================================

export interface BridgeResultEnvelope<T = unknown> {
  protocolVersion: BridgeProtocolVersion;
  id: string;
  seq: number;
  startedAt?: number;
  completedAt: number;
  status: 'completed' | 'failed' | 'timeout';
  ok: boolean;
  value?: T;
  error?: BridgeErrorDetail;
}

export interface BridgeErrorDetail {
  code: string;
  message: string;
  retryable?: boolean;
  phase?: 'queue' | 'pickup' | 'execute' | 'result';
}

// ============================================================================
// Event Interface
// ============================================================================

export interface BridgeEvent {
  seq: number;
  ts: number;
  type: string;
  id?: string;
  [key: string]: unknown;
}

// ============================================================================
// Consumer Checkpoint
// ============================================================================

export interface BridgeCheckpoint {
  lastProcessedSeq: number;
  lastProcessedAt: number;
  consumerId: string;
}

// ============================================================================
// Queue Status
// ============================================================================

export interface BridgeQueueStatus {
  pendingCount: number;
  processingCount: number;
  completedCount: number;
  failedCount: number;
  oldestPendingSeq?: number;
  newestPendingSeq?: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

/** Generate unique command ID */
export function generateBridgeCommandId(): string {
  return `bridge_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Calculate SHA256 checksum of payload */
export async function calculatePayloadChecksum(payload: unknown): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(JSON.stringify(payload));
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
