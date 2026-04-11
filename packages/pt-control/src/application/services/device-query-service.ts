import type { FileBridgePort } from "../ports/file-bridge.port.js";
import type { TopologyCachePort } from "../ports/topology-cache.port.js";
import type { DeviceState } from "../../contracts/index.js";

export class DeviceQueryService {
  constructor(
    private bridge: FileBridgePort,
    private cache: TopologyCachePort,
    private generateId: () => string,
  ) {}

  async inspect(device: string, includeXml = false): Promise<DeviceState> {
    if (!includeXml) {
      const cachedDevice = this.cache.getDevice(device);
      if (cachedDevice) return cachedDevice;
    }

    const result = await this.bridge.sendCommandAndWait<DeviceState>("inspect", { id: this.generateId(), device, includeXml }, 30000);
    if (!result.value) throw new Error(`Failed to inspect device '${device}'`);
    return result.value;
  }

  async hardwareInfo(device: string): Promise<unknown> {
    const result = await this.bridge.sendCommandAndWait("hardwareInfo", { id: this.generateId(), device });
    return result.value;
  }

  async hardwareCatalog(deviceType?: string): Promise<unknown> {
    const result = await this.bridge.sendCommandAndWait("hardwareCatalog", { id: this.generateId(), deviceType });
    return result.value;
  }

  async commandLog(device?: string, limit = 100): Promise<unknown[]> {
    const result = await this.bridge.sendCommandAndWait<unknown[]>("commandLog", { id: this.generateId(), device, limit });
    return result.value ?? [];
  }

  async inspectDhcpServer(device: string): Promise<{
    ok: boolean;
    device: string;
    pools: Array<{ name: string; network: string; subnetMask: string; defaultRouter?: string; dnsServers?: string[]; leaseTime?: number; domainName?: string; }>;
    excludedAddresses?: string[];
    poolCount: number;
    excludedAddressCount: number;
  }> {
    const result = await this.bridge.sendCommandAndWait<{
      ok: boolean;
      device: string;
      pools: Array<{ name: string; network: string; subnetMask: string; defaultRouter?: string; dnsServers?: string[]; leaseTime?: number; domainName?: string; }>;
      excludedAddresses?: string[];
      poolCount: number;
      excludedAddressCount: number;
    }>("inspectDhcpServer", { id: this.generateId(), device });
    if (!result.value) throw new Error(`Failed to inspect DHCP server on device '${device}'`);
    return result.value;
  }
}
