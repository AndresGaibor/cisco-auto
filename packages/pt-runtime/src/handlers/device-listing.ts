import type { HandlerDeps } from "../utils/helpers";
import type { PTDevice } from "../pt-api/pt-api-registry";
import { getDeviceTypeString, collectPorts, normalizeIfaceName } from "../utils/helpers";
import type { PortOwnerIndex, ConnectionInfo } from "../domain";

export interface DeviceListingInput {
  net: ReturnType<HandlerDeps["getNet"]>;
  connectionsByDevice: Record<string, ConnectionInfo[]>;
  portIndex: PortOwnerIndex;
}

export interface ListedDevice {
  name: string;
  model: string;
  type: string;
  power: boolean;
  ports: any[];
}

export interface PortLinkResult {
  localPort: string;
  remoteDevice: string;
  remotePort: string;
  confidence: string;
  evidence: { source: string };
}

interface PortWithLinks {
  name: string;
  linkedPortMac?: string;
  linkedPortName?: string;
  connection?: ConnectionInfo;
}

function getLinkedPortMac(port: unknown): string | undefined {
  return (port as PortWithLinks).linkedPortMac;
}

function getLinkedPortName(port: unknown): string | undefined {
  return (port as PortWithLinks).linkedPortName;
}

function setPortConnection(port: unknown, connection: ConnectionInfo): void {
  (port as PortWithLinks).connection = connection;
}

export function composeDeviceListing(input: DeviceListingInput): ListedDevice[] {
  const { net, connectionsByDevice, portIndex } = input;
  const devices: ListedDevice[] = [];
  const deviceCount = net.getDeviceCount();

  for (let deviceIndex = 0; deviceIndex < deviceCount; deviceIndex++) {
    const device = net.getDeviceAt(deviceIndex);
    if (!device) continue;

    const name = device.getName();
    const devicePorts = collectPorts(device);
    const connectionsRaw = connectionsByDevice[name] || [];
    const connections = filterValidConnections(connectionsRaw);

    attachConnectionsToPorts(devicePorts, connections, portIndex, name);

    devices.push({
      name,
      model: device.getModel(),
      type: getDeviceTypeString(device.getType()),
      power: device.getPower(),
      ports: devicePorts,
    });
  }

  return devices;
}

function isHighConfidenceConnection(connection: ConnectionInfo): boolean {
  return (
    connection.confidence === "exact" ||
    connection.confidence === "merged" ||
    connection.confidence === "registry"
  );
}

function filterValidConnections(connectionsRaw: ConnectionInfo[]): ConnectionInfo[] {
  return connectionsRaw.filter(
    (conn) => isHighConfidenceConnection(conn) || (conn.remoteDevice && conn.remotePort),
  );
}

function attachConnectionsToPorts(
  devicePorts: unknown[],
  connections: ConnectionInfo[],
  portIndex: PortOwnerIndex,
  deviceName: string,
): void {
  for (let i = 0; i < devicePorts.length; i++) {
    const port = devicePorts[i] as PortWithLinks;
    const portNameNorm = normalizeIfaceName(port.name);
    let conn: ConnectionInfo | null = null;

    for (let connectionIndex = 0; connectionIndex < connections.length; connectionIndex++) {
      const connection = connections[connectionIndex];
      if (connection.localPort === port.name || normalizeIfaceName(connection.localPort || "") === portNameNorm) {
        conn = connection;
        break;
      }
    }

    if (conn) {
      setPortConnection(port, conn);
      continue;
    }

    const linkedMac = getLinkedPortMac(port);
    const linkedPortName = getLinkedPortName(port);
    if (linkedMac || linkedPortName) {
      const remoteOwner = linkedMac ? (portIndex.byMac[linkedMac] ?? null) : null;
      const remoteByName =
        !remoteOwner && linkedPortName ? (portIndex.byName[linkedPortName] ?? []) : [];
      const resolvedRemote =
        remoteOwner ?? (remoteByName.length === 1 ? remoteByName[0] : null) ?? null;

      if (resolvedRemote && resolvedRemote.deviceName !== deviceName) {
        setPortConnection(port, {
          localPort: port.name,
          remoteDevice: resolvedRemote.deviceName,
          remotePort: resolvedRemote.portName,
          confidence: linkedMac ? "exact" : "ambiguous",
          evidence: { source: linkedMac ? "track2-mac" : "track2-name" },
        });
      }
    }
  }
}
