/**
 * Bridge V2 Protocol Types
 *
 * @deprecated Import from @cisco-auto/types instead
 * This file is kept for backwards compatibility during migration
 */

import type { BridgeCommandEnvelope } from "@cisco-auto/types";

export {
  BRIDGE_PROTOCOL_VERSION,
  BridgeEventSchema,
  type BridgeProtocolVersion,
  type BridgeEventInput,
  type BridgeResultEnvelope,
  type BridgeErrorDetail,
  type BridgeEvent,
  type BridgeCheckpoint,
  type BridgeQueueStatus,
  type BridgeLease,
  type BridgeHeartbeat,
  type BridgeRuntimeState,
} from "@cisco-auto/types";

export type { BridgeCommandEnvelope } from "@cisco-auto/types";
