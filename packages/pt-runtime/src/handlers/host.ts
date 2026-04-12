import type { PtDeps } from "../pt-api/pt-deps.js";
import { ptError, ptSuccess, PtErrorCode, type PtResult } from "../pt-api/pt-results.js";
import type { PTDevice, PTPort } from "../pt-api/pt-api-registry.js";
export { handleConfigHost } from "./config.js";

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
      name: port.getName(),
      ip: port.getIpAddress(),
      mask: port.getSubnetMask(),
      gateway: port.getDefaultGateway(),
      dns: port.getDnsServerIp(),
      ipv6Enabled: port.getIpv6Enabled ? port.getIpv6Enabled() : false,
      ipv6Address: port.getIpv6Address ? port.getIpv6Address() : "",
      mtu: port.getMtu ? port.getMtu() : 0,
      ipv6Mtu: port.getIpv6Mtu ? port.getIpv6Mtu() : 0,
      portUp: port.isPortUp ? port.isPortUp() : false,
      protocolUp: port.isProtocolUp ? port.isProtocolUp() : false,
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
