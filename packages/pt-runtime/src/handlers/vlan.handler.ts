import type { HandlerPayload, HandlerPort } from "../ports/handler.port.js";
import type { PtDeps } from "../pt-api/pt-deps.js";
import type { PtResult } from "../pt-api/pt-results.js";
import { handleConfigVlanInterfaces, handleEnsureVlans } from "./vlan.js";

export class VlanHandler implements HandlerPort {
  readonly name = "vlan";
  readonly supportedTypes = ["ensureVlans", "configVlanInterfaces"] as const;

  execute(payload: HandlerPayload, deps: PtDeps): PtResult {
    switch (payload.type) {
      case "ensureVlans":
        return handleEnsureVlans(payload as any, deps);
      case "configVlanInterfaces":
        return handleConfigVlanInterfaces(payload as any, deps);
      default:
        return { ok: false, error: `Unknown VLAN command: ${payload.type}` };
    }
  }
}

export function createVlanHandler(): VlanHandler {
  return new VlanHandler();
}
