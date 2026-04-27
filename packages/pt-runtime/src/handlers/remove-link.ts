import type { HandlerDeps, HandlerResult } from "../utils/helpers";
import { collectLiveLinks, findLiveLink, findLiveLinkByEndpoint } from "../domain/live-link";
import type { RemoveLinkPayload } from "./link-types";

export function handleRemoveLink(payload: RemoveLinkPayload, deps: HandlerDeps): HandlerResult {
  const net = deps.getNet();
  const lw = deps.getLW();
  const device = net.getDevice(payload.device);

  if (!device) {
    return {
      ok: false,
      code: "DEVICE_NOT_FOUND",
      error: `Device not found: ${payload.device}`,
    };
  }

  const port = device.getPort(payload.port);
  if (!port) {
    return {
      ok: false,
      code: "PORT_NOT_FOUND",
      error: `Port not found: ${payload.device}:${payload.port}`,
    };
  }

  const before = collectLiveLinks(net);
  const link = payload.device2 && payload.port2
    ? findLiveLink(before, payload.device, payload.port, payload.device2, payload.port2)
    : findLiveLinkByEndpoint(before, payload.device, payload.port);

  if (!link) {
    return {
      ok: false,
      code: "LINK_NOT_FOUND",
      error: "No live link found on requested endpoint.",
      details: { requested: payload, liveLinks: before },
    };
  }

  if (payload.strict !== false && payload.device2 && payload.port2) {
    const exact = findLiveLink(before, payload.device, payload.port, payload.device2, payload.port2);
    if (!exact) {
      return {
        ok: false,
        code: "LINK_NOT_EXACT",
        error: "A link exists on the endpoint, but not the exact requested link.",
        details: { requested: payload, found: link },
      };
    }
  }

  try {
    if (typeof (port as any).deleteLink === "function") {
      (port as any).deleteLink();
    } else {
      lw.deleteLink(payload.device, payload.port);
    }
  } catch (error) {
    return {
      ok: false,
      code: "LINK_DELETE_FAILED",
      error: String(error),
      details: { requested: payload, found: link },
    };
  }

  const after = collectLiveLinks(net);
  const stillThere = payload.device2 && payload.port2
    ? findLiveLink(after, payload.device, payload.port, payload.device2, payload.port2)
    : findLiveLinkByEndpoint(after, payload.device, payload.port);

  if (stillThere) {
    return {
      ok: false,
      code: "LINK_DELETE_VERIFY_FAILED",
      error: "Delete was attempted, but the live link is still visible.",
      details: { requested: payload, stillThere },
    };
  }

  return {
    ok: true,
    value: {
      removed: link,
      verifiedAbsent: true,
    },
  };
}
