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

export interface DeviceListResult {
  devices: ListedDevice[];
  count: number;
  deviceLinks: Record<string, string[]>;
}

export function isEmptyTopologySnapshot(snapshot: {
  devices?: Record<string, unknown>;
  links?: Record<string, unknown>;
  metadata?: { deviceCount?: number; linkCount?: number };
} | null | undefined): boolean {
  if (!snapshot) return true;
  const deviceCount = Object.keys(snapshot.devices ?? {}).length;
  const linkCount = Object.keys(snapshot.links ?? {}).length;
  return deviceCount === 0 && linkCount === 0;
}

export function buildDeviceListFromSnapshot(snapshot: {
  devices?: Record<string, TopologyDeviceLike>;
  links?: Record<string, {
    device1: string;
    port1: string;
    device2: string;
    port2: string;
  }>;
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

  const deviceLinks: Record<string, string[]> = {};
  for (const link of Object.values(snapshot.links ?? {})) {
    if (!deviceLinks[link.device1]) deviceLinks[link.device1] = [];
    if (!deviceLinks[link.device2]) deviceLinks[link.device2] = [];
    deviceLinks[link.device1].push(`${link.device2}:${link.port2}`);
    deviceLinks[link.device2].push(`${link.device1}:${link.port1}`);
  }

  return {
    devices,
    count: devices.length,
    deviceLinks,
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
    model: String((device as { model?: unknown }).model ?? (device as { type?: unknown }).type ?? "unknown"),
    type: String((device as { type?: unknown }).type ?? "unknown"),
    power: Boolean((device as { power?: unknown }).power),
    ports: Array.isArray((device as { ports?: unknown }).ports) ? (device as { ports: unknown[] }).ports : [],
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
    controller.getBridge().sendCommandAndWait<unknown>(
      "listDevices",
      { id: `ctrl_${Date.now()}`, filter: type },
      timeoutMs,
    ),
    timeout,
  ]);
  console.log("[pt-cli] sendCommandAndWait done");
  const devices = mapLiveDevices(result.value);
  console.log(`[pt-cli] devices mapped count=${devices.length}`);

  return {
    devices,
    count: devices.length,
    deviceLinks: {},
  };
}

export async function loadLiveDeviceList(type?: string): Promise<DeviceListResult> {
  let controller: LiveDeviceListController;
  try {
    controller = createDefaultPTController() as unknown as LiveDeviceListController;
  } catch (err) {
    throw new Error("No se pudo crear el controller PT. Asegurate de que Packet Tracer esté abierto: " + String(err));
  }

  try {
    await controller.start();
    return await loadLiveDeviceListFromController(controller, type);
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
