// ============================================================================
// DeviceService - Device inspection and module management
// ============================================================================

import type { FileBridgePort } from "../ports/file-bridge.port.js";
import type { TopologyCachePort } from "../ports/topology-cache.port.js";
import { DeviceQueryService } from "./device-query-service.js";
import { DeviceMutationService } from "./device-mutation-service.js";

export class DeviceService {
  private readonly query: DeviceQueryService;
  private readonly mutation: DeviceMutationService;

  constructor(
    bridge: FileBridgePort,
    cache: TopologyCachePort,
    generateId: () => string,
  ) {
    this.query = new DeviceQueryService(bridge, cache, generateId);
    this.mutation = new DeviceMutationService(bridge, this.query, generateId);
  }

  inspect(device: string, includeXml = false) {
    return this.query.inspect(device, includeXml);
  }

  addModule(device: string, slot: number, module: string) {
    return this.mutation.addModule(device, slot, module);
  }

  removeModule(device: string, slot: number) {
    return this.mutation.removeModule(device, slot);
  }

  configHost(device: string, options: { ip?: string; mask?: string; gateway?: string; dns?: string; dhcp?: boolean }) {
    return this.mutation.configHost(device, options);
  }

  hardwareInfo(device: string) {
    return this.query.hardwareInfo(device);
  }

  hardwareCatalog(deviceType?: string) {
    return this.query.hardwareCatalog(deviceType);
  }

  commandLog(device?: string, limit = 100) {
    return this.query.commandLog(device, limit);
  }

  configureHostDhcp(device: string) {
    return this.mutation.configureHostDhcp(device);
  }

  configureDhcpServer(
    device: string,
    options: {
      enabled: boolean;
      port?: string;
      pools: Array<{
        name: string;
        network: string;
        mask: string;
        defaultRouter: string;
        dns?: string;
        startIp?: string;
        endIp?: string;
        maxUsers?: number;
      }>;
      excluded?: Array<{ start: string; end: string }>;
    }
  ) {
    return this.mutation.configureDhcpServer(device, options);
  }

  inspectDhcpServer(device: string, port?: string) {
    return this.mutation.inspectDhcpServer(device, port);
  }

  moveDevice(name: string, x: number, y: number) {
    return this.mutation.moveDevice(name, x, y);
  }
}
