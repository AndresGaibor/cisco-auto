// ============================================================================
// DeviceService - Device inspection and module management
// ============================================================================

import type { RuntimePrimitivePort } from "../../ports/runtime-primitive-port.js";
import type { TopologyCachePort } from "../ports/topology-cache.port.js";
import { DeviceQueryService, type DeviceInspectFastState } from "./device-query-service.js";
import { DeviceMutationService, type AddModuleResult, type AddModuleError, type RemoveModuleResult } from "./device-mutation-service.js";

/**
 * Servicio para inspección y gestión de dispositivos de red.
 *
 * Delega a DeviceQueryService para lecturas (inspect, show) y a
 * DeviceMutationService para escrituras (addModule, removeModule,
 * configureDhcpServer, deepInspect).
 *
 * @param primitivePort - Puerto para ejecutar operaciones primitivas en PT
 * @param cache - Cache de topología para estados de dispositivos
 * @param generateId - Generador de IDs único para tracking de comandos
 */
export class DeviceService {
  private readonly query: DeviceQueryService;
  private readonly mutation: DeviceMutationService;

  constructor(
    primitivePort: RuntimePrimitivePort,
    cache: TopologyCachePort,
    generateId: () => string,
  ) {
    this.query = new DeviceQueryService(primitivePort, cache, generateId);
    this.mutation = new DeviceMutationService(primitivePort, this.query);
  }

  inspect(device: string, includeXml = false) {
    return this.query.inspect(device, includeXml);
  }

  inspectFast(device: string): Promise<DeviceInspectFastState> {
    return this.query.inspectFast(device) as Promise<DeviceInspectFastState>;
  }

  addModule(device: string, slot: number | "auto", module: string): Promise<{ ok: true; value: AddModuleResult } | AddModuleError> {
    return this.mutation.addModule(device, slot, module);
  }

  inspectModuleSlots(device: string) {
    return this.mutation.inspectModuleSlots(device);
  }

  removeModule(device: string, slot: number): Promise<{ ok: true; value: RemoveModuleResult } | { ok: false; value?: unknown }> {
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
    },
  ) {
    return this.mutation.configureDhcpServer(device, options);
  }

  inspectDhcpServer(device: string, port?: string) {
    return this.mutation.inspectDhcpServer(device, port);
  }

  configureHostDhcp(device: string) {
    return this.mutation.configureHostDhcp(device);
  }

  moveDevice(name: string, x: number, y: number) {
    return this.mutation.moveDevice(name, x, y);
  }

  deepInspect(path: string, method?: string, args?: unknown[]) {
    return this.query.deepInspect(path, method, args);
  }
}
