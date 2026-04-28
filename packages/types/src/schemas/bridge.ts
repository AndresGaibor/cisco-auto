import { z } from "zod";

/**
 * File Bridge V2 Protocol Schemas
 * Single Source of Truth for CLI ↔ Packet Tracer file-based communication
 */

export const BRIDGE_PROTOCOL_VERSION = 2 as const;
export type BridgeProtocolVersion = typeof BRIDGE_PROTOCOL_VERSION;

// ============================================================================
// Event Validation Schema
// ============================================================================

export const BridgeEventSchema = z
  .object({
    seq: z.number().int().nonnegative(),
    ts: z.number().int().nonnegative(),
    type: z.string().min(1),
    id: z.string().optional(),
  })
  .passthrough();

export type BridgeEventInput = z.input<typeof BridgeEventSchema>;

// ============================================================================
// Command Envelope
// ============================================================================

/**
 * Envelope para comandos CLI -> PT
 * Usar para enviar comandos al runtime de Packet Tracer
 */
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

/**
 * Envelope para resultados PT -> CLI
 * Usar para recibir resultados del runtime
 */
export interface BridgeResultEnvelope<T = unknown> {
  protocolVersion: BridgeProtocolVersion;
  id: string;
  seq: number;
  startedAt?: number;
  completedAt: number;
  timings?: BridgeResultTimings;
  status: "completed" | "failed" | "timeout";
  ok: boolean;
  value?: T;
  error?: BridgeErrorDetail;
}

/**
 * Métricas de timing para un resultado del bridge.
 */
export interface BridgeResultTimings {
  sentAt: number;
  resultSeenAt: number;
  receivedAt: number;
  waitMs: number;
  queueLatencyMs?: number;
  execLatencyMs?: number;
  completedAtMs?: number;
}

/**
 * Detalle de error en resultados Bridge
 */
export interface BridgeErrorDetail {
  code: string;
  message: string;
  retryable?: boolean;
  phase?: "queue" | "pickup" | "execute" | "result";
}

// ============================================================================
// Event Interface
// ============================================================================

/**
 * Evento del protocolo Bridge
 * Usar para eventos push desde PT
 */
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

/**
 * Checkpoint de consumidor para resume de cola
 */
export interface BridgeCheckpoint {
  lastProcessedSeq: number;
  lastProcessedAt: number;
  consumerId: string;
}

// ============================================================================
// Queue Status
// ============================================================================

/**
 * Estado de la cola de comandos Bridge
 */
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
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ============================================================================
// Snapshot Types (para auto-snapshot y diff events)
// ============================================================================

/**
 * Snapshot de un dispositivo para auto-snapshot
 */
export interface DeviceSnapshot {
  name: string;
  model?: string;
  type?: string;
  ports?: Array<{
    name: string;
    ip?: string;
    mac?: string;
  }>;
  power?: boolean;
}

/**
 * Snapshot de un enlace para auto-snapshot
 */
export interface LinkSnapshot {
  id: string;
  device1: string;
  port1: string;
  device2: string;
  port2: string;
  cableType?: string;
}

/**
 * Snapshot completo de la topología para auto-snapshot
 */
export interface Snapshot {
  devices: Record<string, DeviceSnapshot>;
  links: Record<string, LinkSnapshot>;
  metadata?: {
    deviceCount: number;
    linkCount: number;
    capturedAt?: number;
  };
}

// ============================================================================
// Bridge Lease - Canonical lease contract for CLI ↔ PT coordination
// ============================================================================

/**
 * Lease para coordinación CLI ↔ PT
 * Usar para adquirir lock sobre el runtime
 */
export interface BridgeLease {
  ownerId: string;
  pid: number;
  hostname: string;
  startedAt: number;
  updatedAt: number;
  expiresAt: number;
  ttlMs: number;
  processTitle: string;
  version: string;
}

// ============================================================================
// Bridge Heartbeat - Written by PT runtime, read by file-bridge
// ============================================================================

/**
 * Heartbeat del runtime PT
 * Usar para monitoreo de salud del runtime
 */
export interface BridgeHeartbeat {
  ts: number;
  running: boolean;
  activeCommand?: {
    id: string;
    seq: number;
    type: string;
    startedAt: number;
  };
  queued: number;
  loadedAt?: number;
}

// ============================================================================
// Bridge Runtime State - Written by PT runtime, read by file-bridge/CLI
// ============================================================================

/**
 * Estado del runtime PT
 * Usar para sincronización de estado entre CLI y PT
 */
export interface BridgeRuntimeState {
  version: string;
  timestamp: number;
  devices?: Record<string, unknown>;
  links?: Record<string, unknown>;
  metadata?: {
    deviceCount: number;
    linkCount: number;
    generatedBy?: string;
  };
}
