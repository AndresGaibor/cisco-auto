#!/usr/bin/env bun
/**
 * Helpers para `pt device list`.
 *
 * USA controller.listDevices() como unica fuente de verdad.
 * NO llama al bridge directamente.
 */

import { createDefaultPTController, type PTController } from "@cisco-auto/pt-control";
import type { DeviceListResult as ControllerDeviceListResult } from "@cisco-auto/pt-control";

const DEBUG = process.env.PT_DEBUG === "1";

const log = (...args: unknown[]) => {
  if (DEBUG) console.log("[device-list]", ...args);
};

export interface ConnectionInfo {
  localPort: string | null;
  remoteDevice: string | null;
  remotePort: string | null;
  confidence: "exact" | "merged" | "registry" | "ambiguous" | "unknown";
  evidence?: { localCandidates?: string[]; remoteCandidates?: string[] };
}

export interface PortConnection {
  remoteDevice: string;
  remotePort: string;
  confidence: ConnectionInfo["confidence"];
}

export interface ListedPort {
  name: string;
  type?: string;
  status?: "up" | "down" | "administratively down";
  protocol?: "up" | "down";
  ipAddress?: string;
  subnetMask?: string;
  macAddress?: string;
  speed?: string;
  duplex?: "auto" | "full" | "half";
  vlan?: number;
  mode?: "unknown" | "trunk" | "access" | "dynamic";
  link?: string;
  connection?: PortConnection;
}

export interface TopologyDeviceLike {
  name: string;
  model: string;
  type: string;
  power: boolean;
  ports?: Array<unknown>;
  displayName?: string;
  x?: number;
  y?: number;
  hostname?: string;
  ip?: string;
  mask?: string;
}

export interface ListedDevice {
  name: string;
  model: string;
  type: string;
  power: boolean;
  ports?: ListedPort[];
  displayName?: string;
  x?: number;
  y?: number;
  hostname?: string;
  ip?: string;
  mask?: string;
}

export interface UnresolvedLink {
  port1Name: string;
  port2Name: string;
  candidates1: string[];
  candidates2: string[];
  confidence: ConnectionInfo["confidence"];
  evidence: string[];
}

export interface DeviceListResult {
  devices: ListedDevice[];
  count: number;
  connectionsByDevice: Record<string, ConnectionInfo[]>;
  unresolvedLinks: UnresolvedLink[];
}

export function isEmptyTopologySnapshot(
  snapshot:
    | {
        devices?: Record<string, unknown>;
        links?: Record<string, unknown>;
        metadata?: { deviceCount?: number; linkCount?: number };
      }
    | null
    | undefined,
): boolean {
  if (!snapshot) return true;
  const deviceCount = Object.keys(snapshot.devices ?? {}).length;
  const linkCount = Object.keys(snapshot.links ?? {}).length;
  return deviceCount === 0 && linkCount === 0;
}

export function buildDeviceListFromSnapshot(snapshot: {
  devices?: Record<string, TopologyDeviceLike>;
  links?: Record<
    string,
    {
      device1: string;
      port1: string;
      device2: string;
      port2: string;
    }
  >;
}): DeviceListResult {
  const connectionsByDevice: Record<string, ConnectionInfo[]> = {};
  const unresolvedLinks: UnresolvedLink[] = [];

  for (const link of Object.values(snapshot.links ?? {})) {
    const arr = connectionsByDevice[link.device1] ?? [];
    arr.push({
      localPort: link.port1,
      remoteDevice: link.device2,
      remotePort: link.port2,
      confidence: "registry",
    });
    connectionsByDevice[link.device1] = arr;
  }

  const devices = Object.values(snapshot.devices ?? {}).map((device) => {
    const ports = Array.isArray(device.ports)
      ? (device.ports as ListedPort[]).map((port) => ({
          ...port,
          connection: undefined as PortConnection | undefined,
        }))
      : [];

    for (const conn of connectionsByDevice[device.name ?? ""] ?? []) {
      if (conn.localPort) {
        const port = ports.find((p) => p.name === conn.localPort);
        if (port) {
          port.connection = {
            remoteDevice: conn.remoteDevice ?? "",
            remotePort: conn.remotePort ?? "",
            confidence: conn.confidence,
          };
        }
      }
    }

    return {
      name: String(device.name ?? "unknown"),
      model: String(device.model ?? device.type ?? "unknown"),
      type: String(device.type ?? "unknown"),
      power: Boolean(device.power),
      ports,
      displayName: device.displayName,
      x: device.x,
      y: device.y,
      hostname: device.hostname,
      ip: device.ip,
      mask: device.mask,
    };
  });

  return {
    devices,
    count: devices.length,
    connectionsByDevice,
    unresolvedLinks,
  };
}

const CERTAIN_CONFIDENCES: ConnectionInfo["confidence"][] = ["exact", "merged", "registry"];
const UNCERTAIN_CONFIDENCES: ConnectionInfo["confidence"][] = ["ambiguous", "unknown"];

function mapControllerResult(result: ControllerDeviceListResult): DeviceListResult {
  const connectionsByDevice: Record<string, ConnectionInfo[]> = {};
  const unresolvedLinks: UnresolvedLink[] = [];

  for (const [deviceName, connections] of Object.entries(result.connectionsByDevice)) {
    const certainConns: ConnectionInfo[] = [];

    for (const conn of connections) {
      if (CERTAIN_CONFIDENCES.includes(conn.confidence)) {
        certainConns.push(conn);
      } else if (UNCERTAIN_CONFIDENCES.includes(conn.confidence)) {
        unresolvedLinks.push({
          port1Name: conn.localPort ?? "",
          port2Name: conn.remotePort ?? "",
          candidates1: conn.evidence?.localCandidates ?? [],
          candidates2: conn.evidence?.remoteCandidates ?? [],
          confidence: conn.confidence,
          evidence: [conn.evidence?.source ?? ""].filter(Boolean),
        });
      }
    }

    if (certainConns.length > 0) {
      connectionsByDevice[deviceName] = certainConns;
    }
  }

  const devices: ListedDevice[] = result.devices.map((device) => {
    const ports: ListedPort[] = (device.ports ?? []).map((port) => ({
      ...port,
      connection: undefined as PortConnection | undefined,
    }));

    const conns = connectionsByDevice[device.name] ?? [];
    for (const conn of conns) {
      if (conn.localPort) {
        const port = ports.find((p) => p.name === conn.localPort);
        if (port && conn.remoteDevice && conn.remotePort) {
          port.connection = {
            remoteDevice: conn.remoteDevice,
            remotePort: conn.remotePort,
            confidence: conn.confidence,
          };
        }
      }
    }

    return {
      ...device,
      ports,
    };
  });

  return {
    devices,
    count: result.count,
    connectionsByDevice,
    unresolvedLinks,
  };
}

export async function loadLiveDeviceListFromController(
  controller: PTController,
  type?: string,
  timeoutMs = 15000,
  options?: { refreshCache?: boolean },
): Promise<DeviceListResult> {
  log(`listDevices() type=${String(type ?? "none")} timeoutMs=${timeoutMs}`);

  let result: ControllerDeviceListResult;
  try {
    // La ruta viva manda: el estado del bridge solo influye en el fallback.
    result = await controller.listDevices(type);
    log(`controller.listDevices() ok, devices=${result.devices.length}`);
  } catch (err) {
    const bridgeStatus = controller.getBridgeStatus?.();
    const cachedSnapshot = controller.getCachedSnapshot?.();
    if (cachedSnapshot) {
      log(
        `controller.listDevices() failed${bridgeStatus?.ready === false ? " (bridge not ready)" : ""}, returning cached snapshot`,
      );
      return buildDeviceListFromSnapshot(cachedSnapshot);
    }

    const stateSnapshot = controller.readState?.();
    if (
      stateSnapshot &&
      typeof stateSnapshot === "object" &&
      "devices" in stateSnapshot &&
      "links" in stateSnapshot
    ) {
      log("controller.listDevices() failed, returning state snapshot");
      return buildDeviceListFromSnapshot(
        stateSnapshot as Parameters<typeof buildDeviceListFromSnapshot>[0],
      );
    }

    if (bridgeStatus && bridgeStatus.ready === false) {
      log("controller.listDevices() failed and bridge not ready, returning empty list");
      return {
        devices: [],
        count: 0,
        connectionsByDevice: {},
        unresolvedLinks: [],
      };
    }

    throw new Error("Packet Tracer no respondió. Verifica que esté abierto y el script cargado.");
  }

  return mapControllerResult(result);
}

export async function loadLiveDeviceList(
  type?: string,
  options?: { refreshCache?: boolean },
): Promise<DeviceListResult> {
  let controller: PTController;
  try {
    controller = createDefaultPTController();
  } catch (err) {
    throw new Error(
      "No se pudo crear el controller PT. Asegurate de que Packet Tracer esté abierto: " +
        String(err),
    );
  }

  try {
    await controller.start();
    return await loadLiveDeviceListFromController(controller, type, 15000, options);
  } catch (err) {
    if (err instanceof Error && err.message.includes("no respondió a tiempo")) {
      throw new Error("Packet Tracer no respondió. Verifica que esté abierto y el script cargado.");
    }
    throw err;
  } finally {
    try {
      await controller.stop();
    } catch {
      // Ignorar fallos de cierre: ya tenemos el resultado o el error principal.
    }
  }
}
