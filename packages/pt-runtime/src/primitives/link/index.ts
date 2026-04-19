// ============================================================================
// Link Primitives - Operaciones atómicas de enlace
// ============================================================================

import { registerPrimitive } from "../primitive-registry";
import type { PrimitiveDomain } from "../primitive-registry";

export interface AddLinkPayload {
  type: "addLink";
  device1: string;
  port1: string;
  device2: string;
  port2: string;
  cableType?: number;
}

export interface RemoveLinkPayload {
  type: "removeLink";
  device: string;
  port: string;
}

export interface LinkPrimitiveResult {
  ok: boolean;
  value?: unknown;
  error?: string;
  code?: string;
  warnings?: string[];
  evidence?: Record<string, unknown>;
  confidence?: number;
}

const CABLE_AUTO = -1;

/**
 * Añadir enlace
 */
export function addLink(payload: AddLinkPayload, net: any, lw: any): LinkPrimitiveResult {
  try {
    const cableType = payload.cableType ?? CABLE_AUTO;
    const link = lw.createLink(
      payload.device1,
      payload.port1,
      payload.device2,
      payload.port2,
      cableType
    );
    
    if (!link) {
      return { ok: false, error: "Failed to create link", code: "LINK_CREATION_FAILED" };
    }
    
    return {
      ok: true,
      value: {
        device1: payload.device1,
        port1: payload.port1,
        device2: payload.device2,
        port2: payload.port2,
        cableType,
      },
      evidence: { cableType },
      confidence: 1,
    };
  } catch (e) {
    return { ok: false, error: String(e), code: "LINK_CREATION_FAILED" };
  }
}

/**
 * Eliminar enlace
 */
export function removeLink(payload: RemoveLinkPayload, lw: any): LinkPrimitiveResult {
  try {
    const result = lw.deleteLink(payload.device, payload.port);
    if (!result) {
      return { ok: false, error: "Link not found", code: "LINK_NOT_FOUND" };
    }
    return { ok: true, value: { device: payload.device, port: payload.port }, confidence: 1 };
  } catch (e) {
    return { ok: false, error: String(e), code: "LINK_REMOVAL_FAILED" };
  }
}

registerPrimitive({
  id: "link.add",
  domain: "link" as PrimitiveDomain,
  implementation: ((payload: any, ctx: { net: any; lw: any }) => addLink(payload, ctx.net, ctx.lw)) as any,
});

registerPrimitive({
  id: "link.remove",
  domain: "link" as PrimitiveDomain,
  implementation: ((payload: any, ctx: { net: any; lw: any }) => removeLink(payload, ctx.lw)) as any,
});