import { z } from 'zod';
/**
 * File Bridge V2 Protocol Schemas
 * Single Source of Truth for CLI ↔ Packet Tracer file-based communication
 */
export declare const BRIDGE_PROTOCOL_VERSION: 2;
export type BridgeProtocolVersion = typeof BRIDGE_PROTOCOL_VERSION;
export declare const BridgeEventSchema: z.ZodObject<{
    seq: z.ZodNumber;
    ts: z.ZodNumber;
    type: z.ZodString;
    id: z.ZodOptional<z.ZodString>;
}, z.core.$loose>;
export type BridgeEventInput = z.input<typeof BridgeEventSchema>;
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
export interface BridgeEvent {
    seq: number;
    ts: number;
    type: string;
    id?: string;
    [key: string]: unknown;
}
export interface BridgeCheckpoint {
    lastProcessedSeq: number;
    lastProcessedAt: number;
    consumerId: string;
}
export interface BridgeQueueStatus {
    pendingCount: number;
    processingCount: number;
    completedCount: number;
    failedCount: number;
    oldestPendingSeq?: number;
    newestPendingSeq?: number;
}
/** Generate unique command ID */
export declare function generateBridgeCommandId(): string;
/** Calculate SHA256 checksum of payload */
export declare function calculatePayloadChecksum(payload: unknown): Promise<string>;
//# sourceMappingURL=bridge.d.ts.map