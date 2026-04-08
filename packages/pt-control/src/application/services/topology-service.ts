// ============================================================================
// TopologyService - Device and topology management
// ============================================================================

import type { FileBridgePort } from "../ports/file-bridge.port.js";
import type { TopologyCachePort } from "../ports/topology-cache.port.js";
import type { TopologySnapshot, DeviceState, LinkState, AddLinkPayload } from "../../contracts/index.js";
import { validatePTModel } from "../../shared/utils/helpers.js";
import { PT_NON_CREATABLE_MODELS } from "@cisco-auto/pt-runtime/value-objects";
import { validatePortExists } from "@cisco-auto/pt-runtime/value-objects";

function ptDeviceTypeToString(typeId: number): DeviceState["type"] {
  const map: Record<number, DeviceState["type"]> = {
    0: "router",
    1: "switch",
    2: "generic",
    3: "pc",
    4: "server",
    5: "generic",
    6: "access_point",
    7: "cloud",
    8: "generic",
  };
  return map[typeId] ?? "generic";
}

export class TopologyService {
  constructor(
    private bridge: FileBridgePort,
    private cache: TopologyCachePort,
    private generateId: () => string
  ) {}

  /**
   * Get current snapshot. Queries PT first; falls back to cache only if PT is unreachable.
   * Returns null only if there is no materialized snapshot anywhere.
   */
  async snapshot(): Promise<TopologySnapshot | null> {
    try {
      const result = await this.bridge.sendCommandAndWait<TopologySnapshot>(
        "snapshot",
        {
          id: this.generateId(),
        },
        30000,
      );

      const value = result.value;
      if (value && typeof value === "object" && "devices" in value && "links" in value) {
        this.cache.applySnapshot(value);
        return value;
      }

      const freshSnapshot = this.bridge.readState<TopologySnapshot>();
      if (freshSnapshot) {
        this.cache.applySnapshot(freshSnapshot);
        return freshSnapshot;
      }
    } catch {
      // PT no responde; usar caché si está materializada
    }

    if (this.cache.isMaterialized()) {
      return this.cache.getSnapshot();
    }

    return null;
  }

  /**
   * List all devices, optionally filtered.
   * Filter can be: string (matches name/model/type), number (PT device type ID),
   * or string[] (match any).
   */
  async listDevices(filter?: string | number | string[]): Promise<DeviceState[]> {
    const cachedDevices = this.cache.getDevices().filter((device) => {
      const model = String(device.model || '').toLowerCase();
      return !PT_NON_CREATABLE_MODELS.some((item: string) => item.toLowerCase() === model);
    });

    const filterAutoCreated = (devices: DeviceState[]) =>
      devices.filter((device) => {
        const model = String(device.model || '').toLowerCase();
        return !PT_NON_CREATABLE_MODELS.some((item: string) => item.toLowerCase() === model);
      });

    if (cachedDevices.length > 0) {
      if (typeof filter === "undefined") {
        return cachedDevices;
      }

      if (typeof filter === "number") {
        const targetType = ptDeviceTypeToString(filter);
      return cachedDevices.filter((device) => device.type === targetType);
      }

      const normalizedFilter = String(filter).toLowerCase();
      return cachedDevices.filter((device) => {
        return (
          device.name.toLowerCase().includes(normalizedFilter) ||
          device.model.toLowerCase().includes(normalizedFilter) ||
          device.type.toLowerCase().includes(normalizedFilter)
        );
      });
    }

    const result = await this.bridge.sendCommandAndWait<
      DeviceState[] | { devices?: DeviceState[]; data?: unknown }
    >("listDevices", {
      id: this.generateId(),
      filter,
    });
    const value = result.value;

    if (Array.isArray(value)) {
      return filterAutoCreated(value);
    }

    if (value && typeof value === "object" && Array.isArray(value.devices)) {
      return filterAutoCreated(value.devices);
    }

    return [];
  }

  /**
   * Add a device to the topology
   * VALIDATES model against catalog before sending to PT
   */
  async addDevice(
    name: string,
    model: string,
    options?: { x?: number; y?: number }
  ): Promise<DeviceState> {
    // Validar modelo contra catálogo de core - THROWS si inválido
    const validatedModel = validatePTModel(model);
    
    const result = await this.bridge.sendCommandAndWait<{
      ok: boolean;
      name: string;
      model: string;
      type: string;
      power: boolean;
      x: number;
      y: number;
      ports: unknown[];
    }>(
      "addDevice",
      {
        id: this.generateId(),
        name,
        model: validatedModel,
        x: options?.x ?? 100,
        y: options?.y ?? 100,
      },
    );

    const value = result.value;
    if (!value) {
      throw new Error(`Failed to add device '${name}'`);
    }

    return {
      name: value.name,
      model: value.model,
      type: value.type as DeviceState["type"],
      power: value.power,
      x: value.x,
      y: value.y,
      ports: value.ports as DeviceState["ports"],
    };
  }

  /**
   * Remove a device from the topology
   */
  async removeDevice(name: string): Promise<void> {
    await this.bridge.sendCommandAndWait("removeDevice", {
      id: this.generateId(),
      name,
    });
  }

  /**
   * Rename a device
   */
  async renameDevice(oldName: string, newName: string): Promise<void> {
    await this.bridge.sendCommandAndWait("renameDevice", {
      id: this.generateId(),
      oldName,
      newName,
    });
  }

  /**
   * Move a device to a new position on the canvas
   */
  async moveDevice(
    name: string,
    x: number,
    y: number
  ): Promise<{ ok: true; name: string; x: number; y: number } | { ok: false; error: string; code: string }> {
    const result = await this.bridge.sendCommandAndWait<{ ok: boolean; name?: string; x?: number; y?: number; error?: string; code?: string }>(
      "moveDevice",
      {
        id: this.generateId(),
        name,
        x,
        y,
      },
    );

    const value = result.value;
    if (value?.ok) {
      return { ok: true, name: value.name!, x: value.x!, y: value.y! };
    }
    return { ok: false, error: value?.error ?? "Unknown error", code: value?.code ?? "UNKNOWN" };
  }

  /**
   * Add a link between two devices
   */
  async addLink(
    device1: string,
    port1: string,
    device2: string,
    port2: string,
    linkType: AddLinkPayload["linkType"] = "auto"
  ): Promise<LinkState> {
    const device1State = this.getDeviceState(device1);
    const device2State = this.getDeviceState(device2);

    if (device1State?.model) {
      const validation = validatePortExists(device1State.model, port1);
      if (!validation.valid) {
        throw new Error(validation.error ?? `Puerto inválido: ${device1State.model}:${port1}`);
      }
    }

    if (device2State?.model) {
      const validation = validatePortExists(device2State.model, port2);
      if (!validation.valid) {
        throw new Error(validation.error ?? `Puerto inválido: ${device2State.model}:${port2}`);
      }
    }

    const result = await this.bridge.sendCommandAndWait<{
      ok: boolean;
      id: string;
      device1: string;
      port1: string;
      device2: string;
      port2: string;
      cableType: string;
    }>(
      "addLink",
      {
        id: this.generateId(),
        device1,
        port1,
        device2,
        port2,
        linkType,
      },
    );

    const value = result.value;
    if (!value) {
      throw new Error(`Failed to add link between ${device1}:${port1} and ${device2}:${port2}`);
    }

    return {
      id: value.id,
      device1: value.device1,
      port1: value.port1,
      device2: value.device2,
      port2: value.port2,
      cableType: value.cableType as LinkState["cableType"],
    };
  }

  /**
   * Remove a link
   */
  async removeLink(device: string, port: string): Promise<void> {
    await this.bridge.sendCommandAndWait("removeLink", {
      id: this.generateId(),
      device,
      port,
    });
  }

  /**
   * Vaciar toda la topología visible en PT
   */
  async clearTopology(): Promise<{ removedDevices: number; removedLinks: number; remainingDevices: number; remainingLinks: number }> {
    let removedDevices = 0;
    let removedLinks = 0;

    for (let pass = 0; pass < 5; pass++) {
      const snapshot = await this.snapshot();
      const devices = await this.listDevices();
      const linkEntries = Object.values(snapshot?.links ?? {});
      const deviceNames = Array.from(new Set(devices.map((device) => device.name).filter(Boolean)));

      if (linkEntries.length === 0 && deviceNames.length === 0) {
        return { removedDevices, removedLinks, remainingDevices: 0, remainingLinks: 0 };
      }

      for (const link of linkEntries) {
        try {
          await this.removeLink(link.device1, link.port1);
          removedLinks += 1;
        } catch {
          try {
            await this.removeLink(link.device2, link.port2);
            removedLinks += 1;
          } catch {
            // Si un enlace ya no existe, seguimos con el resto.
          }
        }
      }

      for (const name of deviceNames) {
        try {
          await this.removeDevice(name);
          removedDevices += 1;
        } catch {
          // Si un dispositivo ya no existe, seguimos con el resto.
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 250));

      const afterSnapshot = await this.snapshot();
      const afterDevices = await this.listDevices();
      const remainingDevices = Array.from(new Set(afterDevices.map((device) => device.name).filter(Boolean))).length;
      const remainingLinks = Object.keys(afterSnapshot?.links ?? {}).length;

      if (remainingDevices === 0 && remainingLinks === 0) {
        return { removedDevices, removedLinks, remainingDevices, remainingLinks };
      }
    }

    const finalSnapshot = await this.snapshot();
    const finalDevices = await this.listDevices();
    const uniqueDeviceNames = Array.from(new Set(finalDevices.map((device) => device.name).filter(Boolean)));
    const remainingDevices = Object.keys(finalSnapshot?.devices ?? {}).length;
    const remainingLinks = Object.keys(finalSnapshot?.links ?? {}).length;

    return {
      removedDevices,
      removedLinks,
      remainingDevices: Math.max(remainingDevices, uniqueDeviceNames.length),
      remainingLinks,
    };
  }

  /**
   * Get cached snapshot
   */
  getCachedSnapshot(): TopologySnapshot | null {
    if (this.cache.isMaterialized()) {
      return this.cache.getSnapshot();
    }

    return null;
  }

  private getDeviceState(deviceName: string): DeviceState | undefined {
    const snapshot = this.cache.getSnapshot();
    return snapshot?.devices?.[deviceName] ?? this.cache.getDevice(deviceName);
  }
}
