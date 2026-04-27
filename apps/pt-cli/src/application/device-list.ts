#!/usr/bin/env bun
/**
 * Helpers para `pt device list`.
 *
 * USA controller.listDevices() como unica fuente de verdad.
 * NO llama al bridge directamente.
 */

import { type PTController } from "@cisco-auto/pt-control/controller";
import { type ConnectionInfo, type UnresolvedLink } from "@cisco-auto/pt-control/contracts";
import { createDefaultPTController } from "./controller-provider.js";

const DEBUG = process.env.PT_DEBUG === "1";

const log = (...args: unknown[]) => {
  if (DEBUG) console.log("[device-list]", ...args);
};

export type { ConnectionInfo };

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
  mac?: string;
  speed?: string;
  duplex?: "auto" | "full" | "half";
  vlan?: number;
  mode?: "unknown" | "trunk" | "access" | "dynamic";
  link?: string;
  connection?: PortConnection;
  portVlan?: number;
  trunkVlan?: string;
  nativeVlan?: number;
}

export interface XmlVlanInfo {
  id: number;
  name: string;
  state: string;
}

export interface XmlModuleInfo {
  name: string;
  ports: number;
}

export interface XmlWirelessInfo {
  ssid?: string;
  mode?: string;
}

export interface XmlParsedSummary {
  hostname?: string;
  version?: string;
  uptime?: string;
  serialNumber?: string;
  configRegister?: string;
  vlans: XmlVlanInfo[];
  modules: XmlModuleInfo[];
  wireless?: XmlWirelessInfo;
  arpCount?: number;
  macCount?: number;
  routingCount?: number;
  [key: string]: unknown;
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
  mac?: string;
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
  mac?: string;
  xmlParsed?: XmlParsedSummary;
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
  mac?: string;
}

export type { UnresolvedLink };

export interface DeviceListResult {
  devices: ListedDevice[];
  count: number;
  connectionsByDevice: Record<string, ConnectionInfo[]>;
  unresolvedLinks: UnresolvedLink[];
}

function hasMacAddresses(devices: ListedDevice[]): boolean {
  return devices.some((device) => device.ports?.some((port) => Boolean(port.macAddress)) ?? false);
}

function enrichMacAddresses(
  devices: ListedDevice[],
  snapshotDevices:
    | Record<
        string,
        { name: string; ports?: Array<{ name: string; macAddress?: string; mac?: string }> }
      >
    | undefined,
): ListedDevice[] {
  if (!snapshotDevices) return devices;

  const snapshotByName = new Map(
    Object.values(snapshotDevices).map((device) => [device.name, device] as const),
  );

  return devices.map((device) => {
    const cachedDevice = snapshotByName.get(device.name);
    if (!cachedDevice?.ports?.length || !device.ports?.length) return device;

    const ports = device.ports.map((port) => {
      const currentMac = port.macAddress ?? port.mac;
      if (currentMac) return { ...port, macAddress: currentMac, mac: currentMac };
      const cachedPort = cachedDevice.ports?.find((candidate) => candidate.name === port.name);
      const cachedMac = cachedPort?.macAddress ?? cachedPort?.mac;
      return cachedMac ? { ...port, macAddress: cachedMac, mac: cachedMac } : port;
    });

    return { ...device, ports };
  });
}

function getControllerDevices(
  result: Awaited<ReturnType<PTController["listDevices"]>>,
): TopologyDeviceLike[] {
  if (Array.isArray(result)) {
    return result as TopologyDeviceLike[];
  }

  if (
    result &&
    typeof result === "object" &&
    "devices" in result &&
    Array.isArray((result as { devices?: unknown }).devices)
  ) {
    return (result as { devices: TopologyDeviceLike[] }).devices;
  }

  return [];
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

  const deviceCount = Object.keys(snapshot.devices ?? {}).length;

  if (deviceCount === 0) {
    return {
      devices: [],
      count: 0,
      connectionsByDevice: {},
      unresolvedLinks: [],
    };
  }

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

type ControllerDevice = Awaited<ReturnType<PTController["listDevices"]>>[number];

function mapControllerResult(result: Awaited<ReturnType<PTController["listDevices"]>>): DeviceListResult {
  const rawDevices = getControllerDevices(result);

  const devices: ListedDevice[] = rawDevices.map((device: ControllerDevice | TopologyDeviceLike) => {
    const deviceRecord = device as Record<string, unknown>;
    const ports: ListedPort[] = ((deviceRecord.ports as Array<unknown>) ?? []).map((port) => {
      const portRecord = port as Record<string, unknown>;
      return {
        name: String(portRecord.name ?? ""),
        type: portRecord.type as string | undefined,
        status: portRecord.status as "up" | "down" | "administratively down" | undefined,
        protocol: portRecord.protocol as "up" | "down" | undefined,
        ipAddress: portRecord.ipAddress as string | undefined,
        subnetMask: portRecord.subnetMask as string | undefined,
        macAddress: (portRecord.macAddress as string | undefined) ?? (portRecord.mac as string | undefined),
        mac: (portRecord.mac as string | undefined) ?? (portRecord.macAddress as string | undefined),
        speed: portRecord.speed as string | undefined,
        duplex: portRecord.duplex as "auto" | "full" | "half" | undefined,
        vlan: portRecord.vlan as number | undefined,
        mode: portRecord.mode as "unknown" | "trunk" | "access" | "dynamic" | undefined,
        link: portRecord.link as string | undefined,
        connection: undefined as PortConnection | undefined,
        portVlan: portRecord.portVlan as number | undefined,
        trunkVlan: portRecord.trunkVlan as string | undefined,
        nativeVlan: portRecord.nativeVlan as number | undefined,
      };
    });

    const xmlp = deviceRecord.xmlParsed as unknown as XmlParsedSummary | undefined;
    return {
      name: String(deviceRecord.name ?? "unknown"),
      model: String(deviceRecord.model ?? "unknown"),
      type: String(deviceRecord.type ?? "generic"),
      power: Boolean(deviceRecord.power),
      ports,
      displayName: deviceRecord.displayName as string | undefined,
      x: deviceRecord.x as number | undefined,
      y: deviceRecord.y as number | undefined,
      hostname: deviceRecord.hostname as string | undefined,
      ip: deviceRecord.ip as string | undefined,
      mask: deviceRecord.mask as string | undefined,
      mac: deviceRecord.mac as string | undefined,
      xmlParsed: xmlp,
    };
  });

  return {
    devices,
    count: rawDevices.length,
    connectionsByDevice: {},
    unresolvedLinks: [],
  };
}

export async function loadLiveDeviceListFromController(
  controller: PTController,
  type?: string,
  timeoutMs = 15000,
  options?: { refreshCache?: boolean },
): Promise<DeviceListResult> {
  log(`listDevices() type=${String(type ?? "none")} timeoutMs=${timeoutMs}`);

  let result: Awaited<ReturnType<PTController["listDevices"]>>;
  try {
    // La ruta viva manda: el estado del bridge solo influye en el fallback.
    result = await controller.listDevices(type);
  log(`controller.listDevices() ok, devices=${getControllerDevices(result).length}`);
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

    if (typeof controller.snapshot === "function") {
      const liveSnapshot = await controller.snapshot().catch(() => null);
      if (liveSnapshot) {
        log("controller.listDevices() failed, returning fresh snapshot");
        return buildDeviceListFromSnapshot(liveSnapshot as Parameters<typeof buildDeviceListFromSnapshot>[0]);
      }
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

    throw new Error(
      "Packet Tracer no respondió. Verifica que esté abierto y el runtime generado esté cargado.",
    );
  }

  const mapped = mapControllerResult(result);
  const cachedSnapshot = controller.getCachedSnapshot?.();
  let devices = enrichMacAddresses(mapped.devices, cachedSnapshot?.devices);
  let liveSnapshot: Awaited<ReturnType<PTController["snapshot"]>> | null = null;

  if ((devices.length === 0 || !hasMacAddresses(devices)) && typeof controller.snapshot === "function") {
    liveSnapshot = await controller.snapshot().catch(() => null);
  }

  if (devices.length === 0 && liveSnapshot && !isEmptyTopologySnapshot(liveSnapshot)) {
    log("controller.listDevices() returned empty, using live snapshot");
    return buildDeviceListFromSnapshot(liveSnapshot);
  }

  if (!hasMacAddresses(devices) && liveSnapshot) {
    devices = enrichMacAddresses(devices, liveSnapshot.devices);
  }

  return {
    ...mapped,
    devices,
  };
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
      throw new Error(
        "Packet Tracer no respondió. Verifica que PT esté abierto y el runtime cargado.",
      );
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

function extractXmlSummary(xmlParsed: Record<string, unknown> | null | undefined): XmlParsedSummary | undefined {
  if (!xmlParsed) return undefined;

  const vlans = Array.isArray(xmlParsed.vlans)
    ? xmlParsed.vlans.map((v: Record<string, unknown>) => ({
        id: Number(v.id) || 0,
        name: String(v.name ?? ""),
        state: String(v.state ?? ""),
      }))
    : [];

  const modules = Array.isArray(xmlParsed.modules)
    ? xmlParsed.modules.map((m: Record<string, unknown>) => ({
        name: String(m.name ?? ""),
        ports: Number(m.portCount) || Number(m.ports) || 0,
      }))
    : [];

  const wireless = xmlParsed.wireless as Record<string, unknown> | undefined;
  const wirelessInfo: XmlWirelessInfo | undefined = wireless
    ? {
        ssid: wireless.ssid as string | undefined,
        mode: wireless.mode as string | undefined,
      }
    : undefined;

  return {
    hostname: xmlParsed.hostname as string | undefined,
    version: xmlParsed.version as string | undefined,
    uptime: xmlParsed.uptime as string | undefined,
    serialNumber: xmlParsed.serialNumber as string | undefined,
    configRegister: xmlParsed.configRegister as string | undefined,
    vlans,
    modules,
    wireless: wirelessInfo,
    arpCount: Array.isArray(xmlParsed.arpTable) ? xmlParsed.arpTable.length : undefined,
    macCount: Array.isArray(xmlParsed.macTable) ? xmlParsed.macTable.length : undefined,
    routingCount: Array.isArray(xmlParsed.routingTable) ? xmlParsed.routingTable.length : undefined,
  };
}

export async function loadLiveDeviceListXml(
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

    const baseResult = await loadLiveDeviceListFromController(controller, type, 15000, options);

    const enrichedDevices: ListedDevice[] = [];
    for (const device of baseResult.devices) {
      try {
        const inspected = await controller.inspectDevice(device.name, true);
        const inspectedAny = inspected as unknown as Record<string, unknown>;
        const xmlRaw = inspectedAny.xmlParsed as Record<string, unknown> | undefined;
        const xmlSummary = extractXmlSummary(xmlRaw);
        const enriched: ListedDevice = { ...device } as ListedDevice;
        if (xmlSummary) {
          enriched.xmlParsed = xmlSummary;
        }
        enrichedDevices.push(enriched);
      } catch {
        enrichedDevices.push(device);
      }
    }

    return {
      ...baseResult,
      devices: enrichedDevices as ListedDevice[],
    };

    return {
      ...baseResult,
      devices: enrichedDevices,
    };
  } catch (err) {
    if (err instanceof Error && err.message.includes("no respondió a tiempo")) {
      throw new Error(
        "Packet Tracer no respondió. Verifica que PT esté abierto y el runtime cargado.",
      );
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
