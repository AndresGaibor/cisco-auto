// ============================================================================
// DeviceService - Device inspection and module management
// ============================================================================

import type { FileBridgePort } from "../ports/file-bridge.port.js";
import type { TopologyCachePort } from "../ports/topology-cache.port.js";
import type { DeviceState } from "../../contracts/index.js";

export class DeviceService {
  constructor(
    private bridge: FileBridgePort,
    private cache: TopologyCachePort,
    private generateId: () => string
  ) {}

  /**
   * Inspect a specific device
   */
  async inspect(device: string, includeXml = false): Promise<DeviceState> {
    if (!includeXml) {
      const cachedDevice = this.cache.getDevice(device);

      if (cachedDevice) {
        return cachedDevice;
      }
    }

    const { value } = await this.bridge.sendCommandAndWait<DeviceState>({
      type: "inspect",
      id: this.generateId(),
      device,
      includeXml,
    }, 30000);

    return value;
  }

  /**
   * Add a module to a device
   */
  async addModule(device: string, slot: number, module: string): Promise<void> {
    await this.bridge.sendCommandAndWait({
      type: "addModule",
      id: this.generateId(),
      device,
      slot,
      module,
    });
  }

  /**
   * Remove a module from a device
   */
  async removeModule(device: string, slot: number): Promise<void> {
    await this.bridge.sendCommandAndWait({
      type: "removeModule",
      id: this.generateId(),
      device,
      slot,
    });
  }

  /**
   * Configure a host (PC/Server) IP settings
   */
  async configHost(
    device: string,
    options: {
      ip?: string;
      mask?: string;
      gateway?: string;
      dns?: string;
      dhcp?: boolean;
    }
  ): Promise<void> {
    await this.bridge.sendCommandAndWait({
      type: "configHost",
      id: this.generateId(),
      device,
      ...options,
    });
  }

  /**
   * Get hardware info for a device
   */
  async hardwareInfo(device: string): Promise<unknown> {
    const { value } = await this.bridge.sendCommandAndWait({
      type: "hardwareInfo",
      id: this.generateId(),
      device,
    });
    return value;
  }

  /**
   * Get hardware catalog
   */
  async hardwareCatalog(deviceType?: string): Promise<unknown> {
    const { value } = await this.bridge.sendCommandAndWait({
      type: "hardwareCatalog",
      id: this.generateId(),
      deviceType,
    });
    return value;
  }

  /**
   * Get command log
   */
  async commandLog(device?: string, limit = 100): Promise<unknown[]> {
    const { value } = await this.bridge.sendCommandAndWait<unknown[]>({
      type: "commandLog",
      id: this.generateId(),
      device,
      limit,
    });
    return value ?? [];
  }
}
