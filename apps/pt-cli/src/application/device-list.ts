#!/usr/bin/env bun
/**
 * Helpers para `pt device list`.
 *
 * Siempre consulta directamente a PT via PTController.
 * NO usa cache, estado persistido ni histórico.
 */

import { createDefaultPTController } from "@cisco-auto/pt-control";
import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import { getDefaultDevDir } from "../system/paths.js";

interface LiveDeviceListController {
  start(): Promise<void> | void;
  stop(): Promise<void> | void;
  getBridge(): {
    sendCommandAndWait<T = unknown>(
      type: string,
      payload: unknown,
      timeoutMs?: number,
    ): Promise<{ value: T }>;
  };
}

export interface ConnectionInfo {
  localPort: string | null;
  remoteDevice: string | null;
  remotePort: string | null;
  confidence: "exact" | "registry" | "ambiguous" | "unknown";
  evidence?: { localCandidates?: string[]; remoteCandidates?: string[] };
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
  ports?: Array<unknown>;
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
  const devices = Object.values(snapshot.devices ?? {}).map((device) => ({
    name: String(device.name ?? "unknown"),
    model: String(device.model ?? device.type ?? "unknown"),
    type: String(device.type ?? "unknown"),
    power: Boolean(device.power),
    ports: Array.isArray(device.ports) ? device.ports : [],
    displayName: device.displayName,
    x: device.x,
    y: device.y,
    hostname: device.hostname,
    ip: device.ip,
    mask: device.mask,
  }));

  const connectionsByDevice: Record<string, ConnectionInfo[]> = {};
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

  return {
    devices,
    count: devices.length,
    connectionsByDevice,
    unresolvedLinks: [],
  };
}

function mapLiveDevices(value: unknown): ListedDevice[] {
  const rawDevices = Array.isArray(value)
    ? value
    : value && typeof value === "object" && Array.isArray((value as { devices?: unknown }).devices)
      ? (value as { devices: unknown[] }).devices
      : [];

  return rawDevices.map((device) => ({
    name: String((device as { name?: unknown }).name ?? "unknown"),
    model: String(
      (device as { model?: unknown }).model ?? (device as { type?: unknown }).type ?? "unknown",
    ),
    type: String((device as { type?: unknown }).type ?? "unknown"),
    power: Boolean((device as { power?: unknown }).power),
    ports: Array.isArray((device as { ports?: unknown }).ports)
      ? (device as { ports: unknown[] }).ports
      : [],
    displayName: (device as { displayName?: string }).displayName,
    x: (device as { x?: number }).x,
    y: (device as { y?: number }).y,
    hostname: (device as { hostname?: string }).hostname,
    ip: (device as { ip?: string }).ip,
    mask: (device as { mask?: string }).mask,
  }));
}

export async function loadLiveDeviceListFromController(
  controller: LiveDeviceListController,
  type?: string,
  timeoutMs = 15000,
  options?: { refreshCache?: boolean },
): Promise<DeviceListResult> {
  console.log(`[pt-cli] listDevices() type=${String(type ?? "none")} timeoutMs=${timeoutMs}`);
  try {
    const commandsDir = resolve(getDefaultDevDir(), "commands");
    const files = readdirSync(commandsDir).filter((name) => name.endsWith(".json"));
    console.log(`[pt-cli] host commandsDir=${commandsDir} files=${files.length}`);
    console.log(`[pt-cli] host commands sample=${files.slice(0, 5).join(",") || "none"}`);
  } catch (e) {
    console.log(`[pt-cli] host commandsDir check failed=${String(e)}`);
  }
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error("Bridge no respondió a tiempo")), timeoutMs);
  });

  console.log("[pt-cli] sendCommandAndWait start...");
  const result = await Promise.race([
    controller
      .getBridge()
      .sendCommandAndWait<unknown>(
        "listDevices",
        { id: `ctrl_${Date.now()}`, filter: type, refreshCache: options?.refreshCache },
        timeoutMs,
      ),
    timeout,
  ]);
  console.log("[pt-cli] sendCommandAndWait done");
  const value = result.value as any;
  const devices = mapLiveDevices(value);
  console.log(`[pt-cli] devices mapped count=${devices.length}`);

  const connectionsByDevice =
    value && typeof value === "object"
      ? (value.connectionsByDevice as Record<string, ConnectionInfo[]>) || {}
      : {};
  const unresolvedLinks =
    value && typeof value === "object" ? (value.unresolvedLinks as UnresolvedLink[]) || [] : [];
  const totalCount =
    value && typeof value === "object" ? value.count || devices.length : devices.length;

  return {
    devices,
    count: totalCount,
    connectionsByDevice,
    unresolvedLinks,
  };
}

export async function loadLiveDeviceList(
  type?: string,
  options?: { refreshCache?: boolean },
): Promise<DeviceListResult> {
  let controller: LiveDeviceListController;
  try {
    controller = createDefaultPTController() as unknown as LiveDeviceListController;
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
