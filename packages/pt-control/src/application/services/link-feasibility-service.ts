import type { LinkFeasibility, PortCandidate, TopologySnapshot } from "../../contracts/index.js";
import { PortPlannerService } from "./port-planner-service.js";

function getDevice(snapshot: TopologySnapshot, deviceName: string): any | undefined {
  return (snapshot.devices as Record<string, any> | undefined)?.[deviceName]
    ?? Object.values(snapshot.devices ?? {}).find((device: any) => device?.name === deviceName || device?.id === deviceName);
}

function portExists(snapshot: TopologySnapshot, deviceName: string, portName: string): boolean {
  const device = getDevice(snapshot, deviceName);
  if (!device) return false;
  const ports = device?.ports ?? {};
  if (Array.isArray(ports)) {
    return ports.some((port: any) => port?.name === portName);
  }
  return Object.prototype.hasOwnProperty.call(ports, portName);
}

function portOccupied(snapshot: TopologySnapshot, deviceName: string, portName: string): boolean {
  const device = getDevice(snapshot, deviceName);
  const ports = Array.isArray(device?.ports)
    ? device.ports
    : Object.entries(device?.ports ?? {}).map(([name, port]: [string, any]) => ({ ...port, name }));
  const port = ports.find((candidate: any) => candidate?.name === portName);
  if (!port) return false;
  if (port.connectedTo) return true;
  return Object.values(snapshot.links ?? {}).some((link: any) => (
    (link?.device1 === deviceName && link?.port1 === portName) ||
    (link?.device2 === deviceName && link?.port2 === portName)
  ));
}

export class LinkFeasibilityService {
  constructor(private readonly portPlanner = new PortPlannerService()) {}

  verifyLink(
    snapshot: TopologySnapshot,
    sourceDevice: string,
    sourcePort: string,
    targetDevice: string,
    targetPort: string,
  ): LinkFeasibility {
    const reasons: string[] = [];
    const sourceExists = portExists(snapshot, sourceDevice, sourcePort);
    const targetExists = portExists(snapshot, targetDevice, targetPort);
    const sourceBusy = portOccupied(snapshot, sourceDevice, sourcePort);
    const targetBusy = portOccupied(snapshot, targetDevice, targetPort);

    if (!sourceExists) reasons.push(`Source port '${sourceDevice}.${sourcePort}' does not exist.`);
    if (!targetExists) reasons.push(`Target port '${targetDevice}.${targetPort}' does not exist.`);
    if (sourceBusy) reasons.push(`Source port '${sourceDevice}.${sourcePort}' is already occupied.`);
    if (targetBusy) reasons.push(`Target port '${targetDevice}.${targetPort}' is already occupied.`);
    if (sourceDevice === targetDevice && sourcePort === targetPort) reasons.push('Cannot link a port to itself.');

    const source = this.portPlanner.suggestPorts(snapshot, sourceDevice, targetDevice).sourceCandidates.find((candidate) => candidate.port === sourcePort);
    const target = this.portPlanner.suggestPorts(snapshot, targetDevice, sourceDevice).sourceCandidates.find((candidate) => candidate.port === targetPort);

    const feasible = reasons.length === 0;
    const suggestions: PortCandidate[] = [];
    if (!source && sourceExists) suggestions.push({ device: sourceDevice, port: sourcePort, score: 0, occupied: sourceBusy, reason: 'Specified source port.' });
    if (!target && targetExists) suggestions.push({ device: targetDevice, port: targetPort, score: 0, occupied: targetBusy, reason: 'Specified target port.' });

    return {
      feasible,
      source,
      target,
      reasons,
      suggestions,
    };
  }

  suggestLink(snapshot: TopologySnapshot, sourceDevice: string, targetDevice: string): LinkFeasibility {
    const sourcePlan = this.portPlanner.suggestPorts(snapshot, sourceDevice, targetDevice);
    const targetPlan = this.portPlanner.suggestPorts(snapshot, targetDevice, sourceDevice);
    const source = sourcePlan.sourceCandidates.find((candidate) => !candidate.occupied);
    const target = targetPlan.sourceCandidates.find((candidate) => !candidate.occupied);
    const reasons: string[] = [...sourcePlan.warnings, ...targetPlan.warnings];

    if (!source) reasons.push(`No free ports found on ${sourceDevice}.`);
    if (!target) reasons.push(`No free ports found on ${targetDevice}.`);

    return {
      feasible: Boolean(source && target),
      source,
      target,
      reasons,
      suggestions: [
        ...(source ? [source] : []),
        ...(target ? [target] : []),
      ],
    };
  }
}
