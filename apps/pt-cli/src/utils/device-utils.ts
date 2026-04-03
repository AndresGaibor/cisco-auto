/**
 * Device management utilities for CLI commands
 * Handles device enumeration, validation, and interactive selection
 */

import type { PTController, DeviceState } from '@cisco-auto/pt-control';
import chalk from 'chalk';

/**
 * Device model catalog for interactive selection
 */
export const DEVICE_MODELS: Record<string, { name: string; type: string }[]> = {
  router: [
    { name: '2911', type: 'router' },
    { name: '4321', type: 'router' },
    { name: '1941', type: 'router' },
    { name: '2901', type: 'router' },
    { name: '2951', type: 'router' },
  ],
  switch: [
    { name: '2960', type: 'switch' },
    { name: '2960-24TT', type: 'switch' },
    { name: '3560', type: 'switch' },
    { name: '3650', type: 'switch' },
  ],
  pc: [
    { name: 'PC', type: 'pc' },
    { name: 'Laptop', type: 'pc' },
  ],
  server: [
    { name: 'Server', type: 'server' },
    { name: 'Server-PT', type: 'server' },
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
    return (Array.isArray(devices) ? devices : []) as DeviceState[];
  } catch (error) {
    throw new Error(`Failed to fetch devices: ${error instanceof Error ? error.message : 'unknown error'}`);
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
  name: string
): Promise<DeviceState | undefined> {
  try {
    const devices = await fetchDeviceList(controller);
    return devices.find((d) => d.name === name);
  } catch {
    return undefined;
  }
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
  name: string
): Promise<void> {
  const exists = await deviceExists(controller, name);
  if (exists) {
    throw new Error(`Device '${name}' already exists in topology`);
  }
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
  return devices.filter((d) => d.type === 'router' || d.type === 'switch');
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
    parts.push(`Power: ${device.power ? 'ON' : 'OFF'}`);
  }

  if (device.ports && device.ports.length > 0) {
    parts.push(`Ports: ${device.ports.length}`);
  }

  return parts.join(' • ');
}

/**
 * Gets device type name for display (capitalized)
 * @param type - Device type (router, switch, pc, server)
 * @returns Formatted type name
 */
export function formatDeviceType(type: string): string {
  const typeMap: Record<string, string> = {
    router: 'Router',
    switch: 'Switch',
    pc: 'PC',
    server: 'Server',
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
