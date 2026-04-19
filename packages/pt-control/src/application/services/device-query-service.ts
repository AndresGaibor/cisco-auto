import type { RuntimePrimitivePort } from "../../ports/runtime-primitive-port.js";
import type { TopologyCachePort } from "../ports/topology-cache.port.js";
import type { DeviceState } from "@cisco-auto/types";

export class DeviceQueryService {
  constructor(
    private primitivePort: RuntimePrimitivePort,
    private cache: TopologyCachePort,
    private generateId: () => string,
  ) {}

  async inspect(device: string, includeXml = false): Promise<DeviceState> {
    if (!includeXml) {
      const cachedDevice = this.cache.getDevice(device);
      if (cachedDevice) return cachedDevice;
    }

    const result = await this.primitivePort.runPrimitive("device.inspect", {
      id: this.generateId(),
      device,
      includeXml,
    });
    if (!result.ok) throw new Error(`Failed to inspect device '${device}': ${result.error}`);
    return result.value as DeviceState;
  }

  async hardwareInfo(device: string): Promise<unknown> {
    const result = await this.primitivePort.runPrimitive("snapshot.hardware", {
      id: this.generateId(),
      device,
    });
    if (!result.ok) throw new Error(`Failed to get hardware info for '${device}': ${result.error}`);
    return result.value;
  }

  async hardwareCatalog(deviceType?: string): Promise<unknown> {
    const result = await this.primitivePort.runPrimitive("snapshot.catalog", {
      id: this.generateId(),
      deviceType,
    });
    if (!result.ok) throw new Error(`Failed to get hardware catalog: ${result.error}`);
    return result.value;
  }

  async commandLog(device?: string, limit = 100): Promise<unknown[]> {
    const result = await this.primitivePort.runPrimitive("snapshot.commandLog", {
      id: this.generateId(),
      device,
      limit,
    });
    return (result.value ?? []) as unknown[];
  }

  async inspectDhcpServer(device: string): Promise<{
    ok: boolean;
    device: string;
    pools: Array<{ name: string; network: string; subnetMask: string; defaultRouter?: string; dnsServers?: string[]; leaseTime?: number; domainName?: string; }>;
    excludedAddresses?: string[];
    poolCount: number;
    excludedAddressCount: number;
  }> {
    const result = await this.primitivePort.runPrimitive("device.dhcp.inspect", {
      id: this.generateId(),
      device,
    });
    if (!result.ok) throw new Error(`Failed to inspect DHCP server on device '${device}': ${result.error}`);
    return result.value as {
      ok: boolean;
      device: string;
      pools: Array<{ name: string; network: string; subnetMask: string; defaultRouter?: string; dnsServers?: string[]; leaseTime?: number; domainName?: string; }>;
      excludedAddresses?: string[];
      poolCount: number;
      excludedAddressCount: number;
    };
  }

  async deepInspect(path: string, method?: string, args?: unknown[]): Promise<unknown> {
    const result = await this.primitivePort.runPrimitive("device.deepInspect", {
      id: this.generateId(),
      path,
      method,
      args,
    });
    if (!result.ok) throw new Error(`Deep inspection failed: ${result.error}`);
    return result.value;
  }
}
