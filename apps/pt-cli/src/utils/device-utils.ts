/**
 * Device management utilities for CLI commands
 * Handles device enumeration, validation, and interactive selection
 */

import { type PTController } from "@cisco-auto/pt-control/controller";
import { type DeviceState } from "@cisco-auto/pt-control/contracts";
import chalk from "chalk";

type DeviceSummary = {
  name: string;
  type?: DeviceState["type"];
  model?: string;
  x?: number;
  y?: number;
};

function summarizeDevices(devices: readonly DeviceSummary[]): DeviceSummary[] {
  return devices.map((device) => ({
    name: device.name,
    type: device.type,
    model: device.model,
    x: device.x,
    y: device.y,
  }));
}

function normalizeDeviceName(name: string): string {
  return name.trim();
}

export class DeviceNotFoundError extends Error {
  readonly code = "DEVICE_NOT_FOUND";

  constructor(
    readonly requested: string,
    readonly availableDevices: readonly DeviceSummary[],
  ) {
    super(
      availableDevices.length === 0
        ? `Dispositivo '${requested}' no encontrado. No hay dispositivos en la topología.`
        : `Dispositivo '${requested}' no encontrado. Dispositivos existentes: ${availableDevices.map((device) => device.name).join(", ")}`,
    );

    this.name = "DeviceNotFoundError";
  }

  toDetails(): Record<string, unknown> {
    return {
      requested: this.requested,
      availableDevices: summarizeDevices(this.availableDevices),
      count: this.availableDevices.length,
    };
  }

  toAdvice(): string[] {
    return ["Ejecuta bun run pt device list --json para ver los nombres exactos."];
  }
}

export class DeviceAlreadyExistsError extends Error {
  readonly code = "DEVICE_ALREADY_EXISTS";

  constructor(
    readonly requested: string,
    readonly availableDevices: readonly DeviceSummary[],
  ) {
    super(`Dispositivo '${requested}' ya existe. Elige otro nombre.`);

    this.name = "DeviceAlreadyExistsError";
  }

  toDetails(): Record<string, unknown> {
    return {
      requested: this.requested,
      availableDevices: summarizeDevices(this.availableDevices),
      count: this.availableDevices.length,
    };
  }

  toAdvice(): string[] {
    return [
      "Usa otro nombre para el nuevo dispositivo.",
      "Ejecuta bun run pt device list --json para ver los nombres ya ocupados.",
    ];
  }
}

/**
 * Device model catalog for interactive selection
 */
export const DEVICE_MODELS: Record<string, { name: string; type: string }[]> = {
  router: [
    { name: "2911", type: "router" },
    { name: "4321", type: "router" },
    { name: "1941", type: "router" },
    { name: "2901", type: "router" },
    { name: "2951", type: "router" },
  ],
  switch: [
    { name: "2960", type: "switch" },
    { name: "2960-24TT", type: "switch" },
    { name: "3560", type: "switch" },
    { name: "3650", type: "switch" },
  ],
  pc: [
    { name: "PC", type: "pc" },
    { name: "Laptop", type: "pc" },
  ],
  server: [
    { name: "Server", type: "server" },
    { name: "Server-PT", type: "server" },
  ],
};

/**
 * Fetches list of devices from topology
 * @param controller - PT Controller instance
 * @returns Array of device states
 * @throws Error if unable to fetch devices
 */
export async function fetchDeviceList(controller: PTController): Promise<DeviceState[]> {
  try {
    const devices = await controller.listDevices();
    if (Array.isArray(devices)) {
      return devices as DeviceState[];
    }

    if (devices && typeof devices === "object" && "devices" in devices) {
      const listed = (devices as { devices?: unknown }).devices;
      return Array.isArray(listed) ? (listed as DeviceState[]) : [];
    }

    return [];
  } catch (error) {
    throw new Error(
      `Failed to fetch devices: ${error instanceof Error ? error.message : "unknown error"}`,
    );
  }
}

/**
 * Gets device by name
 * @param controller - PT Controller instance
 * @param name - Device name to find
 * @returns Device state or undefined if not found
 */
export async function getDeviceByName(
  controller: PTController,
  name: string,
): Promise<DeviceState | undefined> {
  const normalized = normalizeDeviceName(name);

  if (!normalized) {
    return undefined;
  }

  const devices = await fetchDeviceList(controller);
  return devices.find((d) => d.name === normalized);
}

/**
 * Checks if a device exists
 * @param controller - PT Controller instance
 * @param name - Device name to check
 * @returns true if device exists
 */
export async function deviceExists(controller: PTController, name: string): Promise<boolean> {
  const device = await getDeviceByName(controller, name);
  return device !== undefined;
}

/**
 * Validates that device name is not already used
 * @param controller - PT Controller instance
 * @param name - Device name to validate
 * @throws Error if device already exists
 */
export async function validateDeviceNameNotExists(
  controller: PTController,
  name: string,
): Promise<void> {
  const normalized = normalizeDeviceName(name);

  if (!normalized) {
    throw new Error("El nombre del dispositivo es requerido");
  }

  const devices = await fetchDeviceList(controller);

  if (devices.some((device) => device.name === normalized)) {
    throw new DeviceAlreadyExistsError(normalized, devices);
  }
}

export async function requireDeviceExists(
  controller: PTController,
  name: string,
): Promise<DeviceState> {
  const normalized = normalizeDeviceName(name);

  if (!normalized) {
    throw new Error("El nombre del dispositivo es requerido");
  }

  const devices = await fetchDeviceList(controller);
  const found = devices.find((device) => device.name === normalized);

  if (!found) {
    throw new DeviceNotFoundError(normalized, devices);
  }

  return found;
}

/**
 * Filters devices by type (router, switch, pc, server)
 * @param devices - List of devices
 * @param type - Device type to filter by
 * @returns Filtered devices
 */
export function filterDevicesByType(devices: DeviceState[], type: string): DeviceState[] {
  return devices.filter((d) => d.type === type);
}

/**
 * Gets IOS-capable devices (routers and switches)
 * @param devices - List of devices
 * @returns IOS-capable devices
 */
export function getIOSCapableDevices(devices: DeviceState[]): DeviceState[] {
  return devices.filter((d) => {
    const type = d.type;
    // Handle both string and number types (PT returns number type IDs)
    if (typeof type === "number") {
      // Device type IDs: 0=router, 1=switch, 16=multilayer-switch
      return type === 0 || type === 1 || type === 16;
    }
    return type === "router" || type === "switch" || type === "switch_layer3";
  });
}

/**
 * Formats device information for output
 * @param device - Device state
 * @returns Formatted string representation
 */
export function formatDevice(device: DeviceState): string {
  const parts: string[] = [];

  if (device.name) {
    parts.push(`${chalk.cyan(device.name)}`);
  }

  if (device.type) {
    parts.push(`[${device.type}]`);
  }

  if (device.model) {
    parts.push(`Model: ${device.model}`);
  }

  if (device.power !== undefined) {
    parts.push(`Power: ${device.power ? "ON" : "OFF"}`);
  }

  if (device.ports && device.ports.length > 0) {
    parts.push(`Ports: ${device.ports.length}`);
  }

  return parts.join(" • ");
}

/**
 * Gets device type name for display (capitalized)
 * @param type - Device type (router, switch, pc, server)
 * @returns Formatted type name
 */
export function formatDeviceType(type: string): string {
  const typeMap: Record<string, string> = {
    router: "Router",
    switch: "Switch",
    pc: "PC",
    server: "Server",
  };

  return typeMap[type] || type.charAt(0).toUpperCase() + type.slice(1);
}

/**
 * Gets display name for device model
 * @param model - Device model string
 * @returns Formatted model name with type hint
 */
export function formatDeviceModel(model: string, type?: string): string {
  if (!type) {
    return model;
  }

  const models = DEVICE_MODELS[type] || [];
  const found = models.find((m) => m.name === model);

  if (found) {
    return `${found.name} (${formatDeviceType(type)})`;
  }

  return `${model} (${formatDeviceType(type)})`;
}
