import type { PtDeps } from "../pt-api/pt-deps.js";
import { ptError, ptSuccess, PtErrorCode, type PtResult } from "../pt-api/pt-results.js";
import type { PTDevice, PTPort } from "../pt-api/pt-api-registry.js";
import { ptSafeGet } from "../pt-api/pt-processes.js";

export interface InspectHostPayload {
  type: "inspectHost";
  device: string;
}

function collectPorts(device: PTDevice): Array<Record<string, unknown>> {
  const ports: Array<Record<string, unknown>> = [];

  for (let i = 0; i < device.getPortCount(); i++) {
    const port = device.getPortAt(i) as PTPort | null;
    if (!port) continue;

    ports.push({
      name: ptSafeGet(port, (p) => p.getName?.()) ?? "",
      ip: ptSafeGet(port, (p) => p.getIpAddress?.()) ?? undefined,
      mask: ptSafeGet(port, (p) => p.getSubnetMask?.()) ?? undefined,
      gateway: ptSafeGet(port, (p) => p.getDefaultGateway?.()) ?? undefined,
      dns: ptSafeGet(port, (p) => p.getDnsServerIp?.()) ?? undefined,
      portUp: ptSafeGet(port, (p) => p.isPortUp?.()) ?? false,
      protocolUp: ptSafeGet(port, (p) => p.isProtocolUp?.()) ?? false,
    });
  }
  return ports;
}

export function handleInspectHost(payload: InspectHostPayload, deps: PtDeps): PtResult {
  const device = deps.getNet().getDevice(payload.device);
  if (!device) return ptError(`Device not found: ${payload.device}`, PtErrorCode.DEVICE_NOT_FOUND);

  return ptSuccess({
    device: device.getName(),
    model: device.getModel(),
    type: device.getType(),
    power: device.getPower(),
    ports: collectPorts(device),
  });
}
