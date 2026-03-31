// ============================================================================
// Link Handlers - Pure functions for link operations
// ============================================================================

import type { HandlerDeps, HandlerResult } from "../../shared/utils/helpers";
import { CABLE_TYPES, getCableTypeId } from "../utils/constants";

// ============================================================================
// Payload Types
// ============================================================================

export interface AddLinkPayload {
  type: "addLink";
  device1: string;
  port1: string;
  device2: string;
  port2: string;
  linkType?: string;
}

export interface RemoveLinkPayload {
  type: "removeLink";
  device: string;
  port: string;
}

// ============================================================================
// Handlers
// ============================================================================

/**
 * Create a link between two devices
 */
export function handleAddLink(payload: AddLinkPayload, deps: HandlerDeps): HandlerResult {
  const { getLW } = deps;
  const lw = getLW();

  const cableType = payload.linkType
    ? getCableTypeId(payload.linkType)
    : CABLE_TYPES.auto;

  const success = lw.createLink(
    payload.device1,
    payload.port1,
    payload.device2,
    payload.port2,
    cableType
  );

  if (!success) {
    return { ok: false, error: "Failed to create link" };
  }

  return {
    ok: true,
    device1: payload.device1,
    port1: payload.port1,
    device2: payload.device2,
    port2: payload.port2,
    linkType: payload.linkType || "auto",
  };
}

/**
 * Remove a link from a device port
 */
export function handleRemoveLink(payload: RemoveLinkPayload, deps: HandlerDeps): HandlerResult {
  const { getLW } = deps;
  getLW().deleteLink(payload.device, payload.port);
  return { ok: true };
}
