#!/usr/bin/env bun
/**
 * Helpers para `pt device list`.
 *
 * Siempre consulta directamente a PT via PTController.
 * NO usa cache, estado persistido ni histórico.
 */

import { createDefaultPTController } from "@cisco-auto/pt-control";
import { getDefaultDevDir } from "../system/paths.js";

export interface ListedDevice {
  name: string;
  model: string;
  type: string;
  power: boolean;
  ports?: Array<unknown>;
}

export interface DeviceListResult {
  devices: ListedDevice[];
  count: number;
  deviceLinks: Record<string, string[]>;
}

export async function loadLiveDeviceList(type?: string): Promise<DeviceListResult> {
  const controller = createDefaultPTController();

  try {
    await controller.start();
    await controller.loadRuntimeFromFile(`${getDefaultDevDir()}/runtime.js`);

    const snapshot = await controller.snapshot();
    const devicesSource = Object.values(snapshot?.devices ?? {});

    const devices = devicesSource
      .map((device: any) => ({
        name: String(device?.name ?? "unknown"),
        model: String(device?.model ?? device?.type ?? "unknown"),
        type: String(device?.type ?? device?.family ?? "unknown"),
        power: Boolean(device?.power),
        ports: Array.isArray(device?.ports) ? device.ports : [],
      }))
      .filter((device) => (type ? device.type === type : true));

    return {
      devices,
      count: devices.length,
      deviceLinks: {},
    };
  } finally {
    try {
      await controller.stop();
    } catch {
      // Silenciar el cierre; solo limpiamos recursos.
    }
  }
}
