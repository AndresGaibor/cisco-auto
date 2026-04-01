import { z } from 'zod';
/**
 * File Bridge V2 Protocol Schemas
 * Single Source of Truth for CLI ↔ Packet Tracer file-based communication
 */
export const BRIDGE_PROTOCOL_VERSION = 2;
// ============================================================================
// Event Validation Schema
// ============================================================================
export const BridgeEventSchema = z.object({
    seq: z.number().int().nonnegative(),
    ts: z.number().int().nonnegative(),
    type: z.string().min(1),
    id: z.string().optional(),
}).passthrough();
// ============================================================================
// Helper Functions
// ============================================================================
/** Generate unique command ID */
export function generateBridgeCommandId() {
    return `bridge_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
/** Calculate SHA256 checksum of payload */
export async function calculatePayloadChecksum(payload) {
    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify(payload));
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
//# sourceMappingURL=bridge.js.map