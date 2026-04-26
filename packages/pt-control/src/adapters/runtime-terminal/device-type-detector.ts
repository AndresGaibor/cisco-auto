// Device type detection with fallback chain
// Pure detection logic — async but stateless aside from bridge state

import type { FileBridgePort } from "../../application/ports/file-bridge.port.js";

export type DeviceType = "host" | "ios" | "unknown";

/**
 * Detect device type using multiple fallback strategies:
 * 1. listDevices from PT (always alive)
 * 2. State snapshot cache
 * 3. Heuristic by device name
 */
export async function detectDeviceType(
  bridge: FileBridgePort,
  deviceName: string,
): Promise<DeviceType> {
  // Fuente primaria: listDevices directo desde PT (siemprevivo)
  try {
    const listResult = await bridge.sendCommandAndWait("listDevices", {}, 5000);
    if (listResult.ok && listResult.value) {
      const devices = Array.isArray((listResult.value as any)?.devices)
        ? (listResult.value as any).devices
        : Object.values((listResult.value as any)?.devices ?? {});
      const device = devices.find((d: any) => d?.name === deviceName);
      if (device) {
        const model = String(device.model || "").toLowerCase();
        const type = String(device.type || "").toLowerCase();
        if (
          model.includes("pc") ||
          model.includes("server") ||
          model.includes("laptop") ||
          type === "pc" ||
          type === "server"
        ) {
          return "host";
        }
        if (
          model.includes("router") ||
          model.includes("switch") ||
          type === "router" ||
          type === "switch" ||
          type === "switch_layer3"
        ) {
          return "ios";
        }
        return "ios";
      }
    }
  } catch {
    // Fallback a snapshot si listDevices falla
  }

  // Fallback: usar snapshot cacheado
  const state = bridge.getStateSnapshot?.() ?? bridge.readState?.();
  if (state && typeof state === "object") {
    const devices = Array.isArray((state as any).devices)
      ? (state as any).devices
      : Object.values((state as any).devices ?? {});
    const device = devices.find((d: any) => d?.name === deviceName);
    if (device) {
      const model = String(device.model || "").toLowerCase();
      const type = String(device.type || "").toLowerCase();
      if (
        model.includes("pc") ||
        model.includes("server") ||
        model.includes("laptop") ||
        type === "pc" ||
        type === "server"
      ) {
        return "host";
      }
      if (
        model.includes("router") ||
        model.includes("switch") ||
        type === "router" ||
        type === "switch" ||
        type === "switch_layer3"
      ) {
        return "ios";
      }
      return "ios";
    }
  }

  // Fallback heurístico por nombre
  if (deviceName.toLowerCase().includes("pc") || deviceName.toLowerCase().includes("server")) {
    return "host";
  }

  return "unknown";
}
