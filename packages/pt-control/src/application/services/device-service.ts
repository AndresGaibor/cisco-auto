// ============================================================================
// DeviceService - Device inspection and module management
// ============================================================================

import type { FileBridgePort } from "../ports/file-bridge.port.js";
import type { TopologyCachePort } from "../ports/topology-cache.port.js";
import type { DeviceState } from "../../contracts/index.js";
import { validateModuleExists, validateModuleSlotCompatible } from "@cisco-auto/pt-runtime/value-objects";

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

    const result = await this.bridge.sendCommandAndWait<DeviceState>(
      "inspect",
      {
        id: this.generateId(),
        device,
        includeXml,
      },
      30000,
    );

    if (!result.value) {
      throw new Error(`Failed to inspect device '${device}'`);
    }

    return result.value;
  }

  /**
   * Add a module to a device
   */
  async addModule(device: string, slot: number, module: string): Promise<void> {
    const currentDevice = await this.inspect(device, false);
    const moduleValidation = validateModuleExists(module);
    if (!moduleValidation.valid) {
      throw new Error(moduleValidation.error ?? `Módulo inválido: ${module}`);
    }

    const slotValidation = validateModuleSlotCompatible(currentDevice.model, slot, module);
    if (!slotValidation.valid) {
      throw new Error(slotValidation.error ?? `El módulo ${module} no es válido para ${currentDevice.model}`);
    }

    await this.bridge.sendCommandAndWait("addModule", {
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
    await this.bridge.sendCommandAndWait("removeModule", {
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
    await this.bridge.sendCommandAndWait("configHost", {
      id: this.generateId(),
      device,
      ...options,
    });
  }

  /**
   * Get hardware info for a device
   */
  async hardwareInfo(device: string): Promise<unknown> {
    const result = await this.bridge.sendCommandAndWait("hardwareInfo", {
      id: this.generateId(),
      device,
    });
    return result.value;
  }

  /**
   * Get hardware catalog
   */
  async hardwareCatalog(deviceType?: string): Promise<unknown> {
    const result = await this.bridge.sendCommandAndWait("hardwareCatalog", {
      id: this.generateId(),
      deviceType,
    });
    return result.value;
  }

  /**
   * Get command log
   */
  async commandLog(device?: string, limit = 100): Promise<unknown[]> {
    const result = await this.bridge.sendCommandAndWait<unknown[]>("commandLog", {
      id: this.generateId(),
      device,
      limit,
    });
    return result.value ?? [];
  }

  /**
   * Configure a host (PC/Server) to use DHCP for IP configuration
   */
  async configureHostDhcp(device: string): Promise<void> {
    await this.configHost(device, { dhcp: true });
  }

  /**
   * Configure DHCP server on a device
   */
  async configureDhcpServer(
    device: string,
    options: {
      poolName: string;
      network: string;
      subnetMask: string;
      defaultRouter?: string;
      dnsServers?: string[];
      excludedAddresses?: string[];
      leaseTime?: number;
      domainName?: string;
    }
  ): Promise<void> {
    await this.bridge.sendCommandAndWait("configureDhcpServer", {
      id: this.generateId(),
      device,
      ...options,
    });
  }

  /**
   * Inspect DHCP server configuration on a device
   */
  async inspectDhcpServer(
    device: string
  ): Promise<{
    ok: boolean;
    device: string;
    pools: Array<{
      name: string;
      network: string;
      subnetMask: string;
      defaultRouter?: string;
      dnsServers?: string[];
      leaseTime?: number;
      domainName?: string;
    }>;
    excludedAddresses?: string[];
    poolCount: number;
    excludedAddressCount: number;
  }> {
    const result = await this.bridge.sendCommandAndWait<{
      ok: boolean;
      device: string;
      pools: Array<{
        name: string;
        network: string;
        subnetMask: string;
        defaultRouter?: string;
        dnsServers?: string[];
        leaseTime?: number;
        domainName?: string;
      }>;
      excludedAddresses?: string[];
      poolCount: number;
      excludedAddressCount: number;
    }>("inspectDhcpServer", {
      id: this.generateId(),
      device,
    });

    if (!result.value) {
      throw new Error(`Failed to inspect DHCP server on device '${device}'`);
    }

    return result.value;
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
}
