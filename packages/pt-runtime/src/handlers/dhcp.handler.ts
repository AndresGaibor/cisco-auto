import type { HandlerPayload, HandlerPort } from "../ports/handler.port.js";
import type { PtDeps } from "../pt-api/pt-deps.js";
import type { PtResult } from "../pt-api/pt-results.js";
import { handleConfigDhcpServer, handleInspectDhcpServer } from "./dhcp.js";

export class DhcpHandler implements HandlerPort {
  readonly name = "dhcp";
  readonly supportedTypes = ["configDhcpServer", "inspectDhcpServer"] as const;

  execute(payload: HandlerPayload, deps: PtDeps): PtResult {
    switch (payload.type) {
      case "configDhcpServer":
        return handleConfigDhcpServer(payload as any, deps);
      case "inspectDhcpServer":
        return handleInspectDhcpServer(payload as any, deps);
      default:
        return { ok: false, error: `Unknown DHCP command: ${payload.type}` };
    }
  }
}

export function createDhcpHandler(): DhcpHandler {
  return new DhcpHandler();
}
