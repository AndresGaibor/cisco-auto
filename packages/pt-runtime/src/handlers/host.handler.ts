import type { HandlerPayload, HandlerPort } from "../ports/handler.port.js";
import type { PtDeps } from "../pt-api/pt-deps.js";
import type { PtResult } from "../pt-api/pt-results.js";
import { handleConfigHost, handleInspectHost } from "./host.js";

export class HostHandler implements HandlerPort {
  readonly name = "host";
  readonly supportedTypes = ["configHost", "inspectHost"] as const;

  execute(payload: HandlerPayload, deps: PtDeps): PtResult {
    switch (payload.type) {
      case "configHost":
        return handleConfigHost(payload as any, deps);
      case "inspectHost":
        return handleInspectHost(payload as any, deps);
      default:
        return { ok: false, error: `Unknown host command: ${payload.type}` };
    }
  }
}

export function createHostHandler(): HostHandler {
  return new HostHandler();
}
