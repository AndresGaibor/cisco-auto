// ============================================================================
// TopologyService - Device and topology management
// ============================================================================

import { FileBridge } from "../../infrastructure/pt/file-bridge.js";
import { TopologyCache } from "../../infrastructure/pt/topology-cache.js";
import type { TopologySnapshot, DeviceState, LinkState, AddLinkPayload } from "../../contracts/index.js";

export class TopologyService {
  constructor(
    private bridge: FileBridge,
    private cache: TopologyCache,
    private generateId: () => string
  ) {}

  /**
   * Get current cached snapshot or fetch from PT
   */
  async snapshot(): Promise<TopologySnapshot | null> {
    const cachedSnapshot = this.cache.getSnapshot();

    if (cachedSnapshot) {
      return cachedSnapshot;
    }

    const { value } = await this.bridge.sendCommandAndWait<TopologySnapshot>({
      type: "snapshot",
      id: this.generateId(),
    }, 30000);

    if (value) {
      this.cache.applySnapshot(value);
    }
    return value ?? null;
  }

  /**
   * List all devices, optionally filtered
   */
  async listDevices(filter?: string | number | string[]): Promise<DeviceState[]> {
    const cachedDevices = this.cache.getDevices();

    if (cachedDevices.length > 0) {
      if (typeof filter === "undefined") {
        return cachedDevices;
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

    const { value } = await this.bridge.sendCommandAndWait<
      DeviceState[] | { devices?: DeviceState[]; data?: unknown }
    >({
      type: "listDevices",
      id: this.generateId(),
      filter,
    });

    if (Array.isArray(value)) {
      return value;
    }

    if (value && typeof value === "object" && Array.isArray(value.devices)) {
      return value.devices;
    }

    return [];
  }

  /**
   * Add a device to the topology
   */
  async addDevice(
    name: string,
    model: string,
    options?: { x?: number; y?: number }
  ): Promise<DeviceState> {
    const { event } = await this.bridge.sendCommandAndWait({
      type: "addDevice",
      id: this.generateId(),
      name,
      model,
      x: options?.x ?? 100,
      y: options?.y ?? 100,
    });

    return (event as { value: DeviceState }).value;
  }

  /**
   * Remove a device from the topology
   */
  async removeDevice(name: string): Promise<void> {
    await this.bridge.sendCommandAndWait({
      type: "removeDevice",
      id: this.generateId(),
      name,
    });
  }

  /**
   * Rename a device
   */
  async renameDevice(oldName: string, newName: string): Promise<void> {
    await this.bridge.sendCommandAndWait({
      type: "renameDevice",
      id: this.generateId(),
      oldName,
      newName,
    });
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
    const { event } = await this.bridge.sendCommandAndWait({
      type: "addLink",
      id: this.generateId(),
      device1,
      port1,
      device2,
      port2,
      linkType,
    });

    return (event as { value: LinkState }).value;
  }

  /**
   * Remove a link
   */
  async removeLink(device: string, port: string): Promise<void> {
    await this.bridge.sendCommandAndWait({
      type: "removeLink",
      id: this.generateId(),
      device,
      port,
    });
  }

  /**
   * Get cached snapshot
   */
  getCachedSnapshot(): TopologySnapshot | null {
    return this.cache.getSnapshot();
  }
}
