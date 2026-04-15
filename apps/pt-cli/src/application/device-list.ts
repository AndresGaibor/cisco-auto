#!/usr/bin/env bun
/**
 * Helpers para `pt device list`.
 *
 * Siempre consulta directamente a PT via PTController.
 * NO usa cache, estado persistido ni histórico.
 */

import { createDefaultPTController } from "@cisco-auto/pt-control";

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

export async function loadLiveDeviceList(type?: string): Promise<DeviceListResult> {
  const controller = createDefaultPTController();

  try {
    console.log("[pt-cli] start()...");
    await controller.start();
    console.log("[pt-cli] listDevices()...");
    const devices = (await controller.listDevices(type)).map((device) => ({
      name: String(device.name ?? "unknown"),
      model: String(device.model ?? device.type ?? "unknown"),
      type: String(device.type ?? "unknown"),
      power: Boolean(device.power),
      ports: Array.isArray(device.ports) ? device.ports : [],
      displayName: (device as any).displayName,
      x: (device as any).x,
      y: (device as any).y,
      hostname: (device as any).hostname,
      ip: (device as any).ip,
      mask: (device as any).mask,
    }));

    return {
      devices,
      count: devices.length,
      deviceLinks: {},
    };
  } finally {
    try {
      console.log("[pt-cli] stop()...");
      await controller.stop();
    } catch {
      // Silenciar el cierre; solo limpiamos recursos.
    }
  }
}
