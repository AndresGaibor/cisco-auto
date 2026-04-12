import type { PortCandidate, PortPlan, PortTwin, TopologySnapshot } from "../../contracts/index.js";

function getDevice(snapshot: TopologySnapshot, deviceName: string): any | undefined {
  return (snapshot.devices as Record<string, any> | undefined)?.[deviceName]
    ?? Object.values(snapshot.devices ?? {}).find((device: any) => device?.name === deviceName || device?.id === deviceName);
}

function getLinks(snapshot: TopologySnapshot): Array<{ device1: string; port1: string; device2: string; port2: string }> {
  return Object.values(snapshot.links ?? {}).map((link: any) => ({
    device1: String(link?.device1 ?? link?.sourceDeviceId ?? link?.source?.deviceId ?? link?.source ?? ''),
    port1: String(link?.port1 ?? link?.sourcePort ?? link?.source?.port ?? ''),
    device2: String(link?.device2 ?? link?.targetDeviceId ?? link?.target?.deviceId ?? link?.target ?? ''),
    port2: String(link?.port2 ?? link?.targetPort ?? link?.target?.port ?? ''),
  }));
}

function normalizePorts(device: any): Array<PortTwin & { name: string }> {
  const ports = device?.ports ?? {};
  if (Array.isArray(ports)) {
    return ports.map((port: any) => ({ ...port, name: String(port?.name ?? '') }));
  }
  return Object.entries(ports).map(([name, port]: [string, any]) => ({ ...port, name }));
}

function isPortOccupied(snapshot: TopologySnapshot, deviceName: string, portName: string): boolean {
  const device = getDevice(snapshot, deviceName);
  if (!device) return false;

  const ports = normalizePorts(device);
  const port = ports.find((candidate) => candidate.name === portName);
  if (!port) return false;

  if (port.connectedTo) return true;
  return getLinks(snapshot).some((link) => (
    (link.device1 === deviceName && link.port1 === portName) ||
    (link.device2 === deviceName && link.port2 === portName)
  ));
}

function scorePort(port: PortTwin & { name: string }): number {
  const name = port.name.toLowerCase();
  let score = 0;
  if (name.includes('gi') || name.includes('gigabit')) score += 100;
  else if (name.includes('fa') || name.includes('fastethernet')) score += 80;
  else if (name.includes('eth')) score += 70;
  else if (name.includes('serial')) score += 60;
  else score += 10;

  if (port.kind && String(port.kind).toLowerCase() !== 'unknown') score += 5;
  if (port.media === 'fiber') score += 10;
  if (port.vlanMode === 'trunk') score += 5;
  return score;
}

function candidateFromPort(deviceName: string, port: PortTwin & { name: string }, occupied: boolean): PortCandidate {
  return {
    device: deviceName,
    port: port.name,
    score: scorePort(port) - (occupied ? 1000 : 0),
    occupied,
    reason: occupied ? 'Port already linked or connected.' : 'Free port candidate.',
  };
}

export class PortPlannerService {
  suggestPorts(snapshot: TopologySnapshot, sourceDevice: string, targetDevice?: string): PortPlan {
    const source = getDevice(snapshot, sourceDevice);
    if (!source) {
      return { sourceCandidates: [], targetCandidates: [], warnings: [`Device '${sourceDevice}' not found.`] };
    }

    const sourcePorts = normalizePorts(source).map((port) => candidateFromPort(sourceDevice, port, isPortOccupied(snapshot, sourceDevice, port.name)));
    const targetPorts = targetDevice
      ? normalizePorts(getDevice(snapshot, targetDevice)).map((port) => candidateFromPort(targetDevice, port, isPortOccupied(snapshot, targetDevice, port.name)))
      : [];

    const warnings: string[] = [];
    if (targetDevice && !getDevice(snapshot, targetDevice)) warnings.push(`Device '${targetDevice}' not found.`);

    return {
      sourceCandidates: sourcePorts.sort((a, b) => b.score - a.score),
      targetCandidates: targetPorts.sort((a, b) => b.score - a.score),
      warnings,
    };
  }
}
