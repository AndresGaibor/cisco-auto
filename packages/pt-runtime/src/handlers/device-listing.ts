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

export function composeDeviceListing(input: DeviceListingInput): ListedDevice[] {
  const { net, connectionsByDevice, portIndex } = input;
  const devices: ListedDevice[] = [];
  const count = net.getDeviceCount();

  for (let i = 0; i < count; i++) {
    const device = net.getDeviceAt(i);
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

function filterValidConnections(connectionsRaw: ConnectionInfo[]): ConnectionInfo[] {
  const connections: ConnectionInfo[] = [];
  for (let ci = 0; ci < connectionsRaw.length; ci++) {
    const conn = connectionsRaw[ci];
    if (
      conn.confidence === "exact" ||
      conn.confidence === "merged" ||
      conn.confidence === "registry"
    ) {
      connections.push(conn);
    } else if (conn.remoteDevice && conn.remotePort) {
      connections.push(conn);
    }
  }
  return connections;
}

function attachConnectionsToPorts(
  devicePorts: any[],
  connections: ConnectionInfo[],
  portIndex: PortOwnerIndex,
  deviceName: string,
): void {
  for (let pi = 0; pi < devicePorts.length; pi++) {
    const port = devicePorts[pi];
    const portNameNorm = normalizeIfaceName(port.name);
    let conn: ConnectionInfo | null = null;

    for (let ci = 0; ci < connections.length; ci++) {
      const c = connections[ci];
      if (c.localPort === port.name || normalizeIfaceName(c.localPort || "") === portNameNorm) {
        conn = c;
        break;
      }
    }

    if (conn) {
      (port as any).connection = conn;
      continue;
    }

    const linkedMac = (port as any).linkedPortMac as string | undefined;
    const linkedPortName = (port as any).linkedPortName as string | undefined;
    if (linkedMac || linkedPortName) {
      const remoteOwner = linkedMac ? (portIndex.byMac[linkedMac] ?? null) : null;
      const remoteByName =
        !remoteOwner && linkedPortName ? (portIndex.byName[linkedPortName] ?? []) : [];
      const resolvedRemote =
        remoteOwner ?? (remoteByName.length === 1 ? remoteByName[0] : null) ?? null;

      if (resolvedRemote && resolvedRemote.deviceName !== deviceName) {
        (port as any).connection = {
          localPort: port.name,
          remoteDevice: resolvedRemote.deviceName,
          remotePort: resolvedRemote.portName,
          confidence: linkedMac ? "exact" : "ambiguous",
          evidence: { source: linkedMac ? "track2-mac" : "track2-name" },
        };
      }
    }
  }
}
