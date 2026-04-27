import { getCableTypeName } from "../utils/constants";

export type LiveLightName = "off" | "amber" | "green" | "blink" | "unknown";
export type LiveLinkState = "green" | "amber" | "down" | "unknown";

export interface LiveEndpoint {
  device: string;
  port: string;
  portIndex: number;
  light: number | null;
  lightName: LiveLightName;
  portUp: boolean | null;
  protocolUp: boolean | null;
  powerOn: boolean | null;
  remotePortName: string | null;
}

export interface LiveLink {
  id: string;
  device1: string;
  port1: string;
  device2: string;
  port2: string;
  cableTypeId: number | null;
  cableType: string | null;
  state: LiveLinkState;
  endpoint1: LiveEndpoint;
  endpoint2: LiveEndpoint;
  evidence: string[];
}

function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

export function normalizeIfaceName(value: string): string {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/^gi(?=\d)/, "gigabitethernet")
    .replace(/^fa(?=\d)/, "fastethernet")
    .replace(/^se(?=\d)/, "serial")
    .replace(/^eth(?=\d)/, "ethernet")
    .replace(/[\s_/-]/g, "");
}

export function lightName(light: number | null): LiveLightName {
  if (light === 0) return "off";
  if (light === 1) return "amber";
  if (light === 2) return "green";
  if (light === 3) return "blink";
  return "unknown";
}

export function classifyLiveLinkState(a: LiveEndpoint, b: LiveEndpoint): LiveLinkState {
  if (a.lightName === "green" && b.lightName === "green") return "green";
  if (a.lightName === "amber" || b.lightName === "amber") return "amber";
  if (a.lightName === "off" || b.lightName === "off") return "down";

  if (a.portUp === true && b.portUp === true && a.protocolUp === true && b.protocolUp === true) {
    return "green";
  }

  if (a.portUp === false || b.portUp === false) return "down";
  return "unknown";
}

function endpointKey(device: string, port: string): string {
  return `${device}:${port}`;
}

function stableLinkId(device1: string, port1: string, device2: string, port2: string): string {
  return [endpointKey(device1, port1), endpointKey(device2, port2)].sort().join("--");
}

function sameEndpoint(deviceA: string, portA: string, deviceB: string, portB: string): boolean {
  return deviceA === deviceB && normalizeIfaceName(portA) === normalizeIfaceName(portB);
}

function pushLink(
  links: LiveLink[],
  seen: Set<string>,
  ep1: LiveEndpoint,
  ep2: LiveEndpoint,
  rawId: string,
  cableTypeId: number | null,
  evidence: string[],
): void {
  if (!ep1.device || !ep1.port || !ep2.device || !ep2.port) return;

  const id = rawId || stableLinkId(ep1.device, ep1.port, ep2.device, ep2.port);
  if (seen.has(id)) return;
  seen.add(id);

  links.push({
    id,
    device1: ep1.device,
    port1: ep1.port,
    device2: ep2.device,
    port2: ep2.port,
    cableTypeId,
    cableType: cableTypeId == null ? null : getCableTypeName(cableTypeId),
    state: classifyLiveLinkState(ep1, ep2),
    endpoint1: ep1,
    endpoint2: ep2,
    evidence,
  });
}

function readEndpoint(
  port: any,
  fallbackDevice: string,
  fallbackIndex: number,
  ownerByPort?: WeakMap<object, string>,
): LiveEndpoint {
  const indexedOwner = ownerByPort && port && typeof port === "object" ? ownerByPort.get(port as object) ?? null : null;
  const owner = safe(() => port.getOwnerDevice(), null as any);
  const device = indexedOwner ?? safe(() => owner?.getName?.(), fallbackDevice);
  const portName = safe(() => port.getName(), "");
  const light = safe(() => (typeof port.getLightStatus === "function" ? Number(port.getLightStatus()) : null), null);

  return {
    device,
    port: portName,
    portIndex: fallbackIndex,
    light,
    lightName: lightName(light),
    portUp: safe(() => (typeof port.isPortUp === "function" ? Boolean(port.isPortUp()) : null), null),
    protocolUp: safe(() => (typeof port.isProtocolUp === "function" ? Boolean(port.isProtocolUp()) : null), null),
    powerOn: safe(() => (typeof port.isPowerOn === "function" ? Boolean(port.isPowerOn()) : null), null),
    remotePortName: safe(() => (typeof port.getRemotePortName === "function" ? String(port.getRemotePortName()) : null), null),
  };
}

export function collectLiveLinks(net: any): LiveLink[] {
  const links: LiveLink[] = [];
  const seen = new Set<string>();
  const ownerByPort = new WeakMap<object, string>();
  const deviceCount = safe(() => Number(net.getDeviceCount()), 0);

  for (let di = 0; di < deviceCount; di++) {
    const device = safe(() => net.getDeviceAt(di), null as any);
    if (!device) continue;

    const deviceName = safe(() => String(device.getName()), "");
    const portCount = safe(() => Number(device.getPortCount()), 0);

    for (let pi = 0; pi < portCount; pi++) {
      const localPort = safe(() => device.getPortAt(pi), null as any);
      if (!localPort) continue;

      if (localPort && typeof localPort === "object") {
        ownerByPort.set(localPort as object, deviceName);
      }

      const link = safe(() => (typeof localPort.getLink === "function" ? localPort.getLink() : null), null as any);
      if (!link) continue;

      const rawId = safe(() => (typeof link.getObjectUuid === "function" ? String(link.getObjectUuid()) : ""), "");
      const p1 = safe(() => (typeof link.getPort1 === "function" ? link.getPort1() : null), null as any);
      const p2 = safe(() => (typeof link.getPort2 === "function" ? link.getPort2() : null), null as any);
      if (!p1 || !p2) continue;

      const ep1 = readEndpoint(p1, deviceName, pi, ownerByPort);
      const ep2 = readEndpoint(p2, deviceName, pi, ownerByPort);
      const cableTypeId = safe(
        () => (typeof link.getConnectionType === "function" ? Number(link.getConnectionType()) : null),
        null,
      );

      pushLink(links, seen, ep1, ep2, rawId, cableTypeId, ["Port.getLink()", "Link.getPort1()", "Link.getPort2()"]);
    }
  }

  if (links.length === 0 && typeof net.getLinkCount === "function" && typeof net.getLinkAt === "function") {
    const linkCount = safe(() => Number(net.getLinkCount()), 0);

    for (let li = 0; li < linkCount; li++) {
      const link = safe(() => net.getLinkAt(li), null as any);
      if (!link) continue;

      const rawId = safe(() => (typeof link.getObjectUuid === "function" ? String(link.getObjectUuid()) : ""), "");
      const p1 = safe(() => (typeof link.getPort1 === "function" ? link.getPort1() : null), null as any);
      const p2 = safe(() => (typeof link.getPort2 === "function" ? link.getPort2() : null), null as any);
      if (!p1 || !p2) continue;

      const ep1 = readEndpoint(p1, "", li, ownerByPort);
      const ep2 = readEndpoint(p2, "", li, ownerByPort);
      const cableTypeId = safe(
        () => (typeof link.getConnectionType === "function" ? Number(link.getConnectionType()) : null),
        null,
      );

      pushLink(links, seen, ep1, ep2, rawId, cableTypeId, ["Net.getLinkAt()", "Link.getPort1()", "Link.getPort2()"]);
    }
  }

  return links;
}

export function findLiveLink(
  links: LiveLink[],
  device1: string,
  port1: string,
  device2: string,
  port2: string,
): LiveLink | null {
  return links.find((link) => {
    const direct =
      sameEndpoint(link.device1, link.port1, device1, port1) &&
      sameEndpoint(link.device2, link.port2, device2, port2);

    const reverse =
      sameEndpoint(link.device1, link.port1, device2, port2) &&
      sameEndpoint(link.device2, link.port2, device1, port1);

    return direct || reverse;
  }) ?? null;
}

export function findLiveLinkByEndpoint(
  links: LiveLink[],
  device: string,
  port: string,
): LiveLink | null {
  return links.find((link) => {
    return (
      sameEndpoint(link.device1, link.port1, device, port) ||
      sameEndpoint(link.device2, link.port2, device, port)
    );
  }) ?? null;
}
