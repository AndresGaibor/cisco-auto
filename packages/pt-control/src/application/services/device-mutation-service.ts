import type { FileBridgePort } from "../ports/file-bridge.port.js";
import type { DeviceState } from "../../contracts/index.js";
import { validateModuleExists, validateModuleSlotCompatible } from "@cisco-auto/pt-runtime/value-objects";
import { DeviceQueryService } from "./device-query-service.js";

export class DeviceMutationService {
  constructor(
    private bridge: FileBridgePort,
    private query: DeviceQueryService,
    private generateId: () => string,
  ) {}

  async addModule(device: string, slot: number, module: string): Promise<void> {
    const currentDevice = await this.query.inspect(device, false);
    const moduleValidation = validateModuleExists(module);
    if (!moduleValidation.valid) throw new Error(moduleValidation.error ?? `Módulo inválido: ${module}`);

    const slotValidation = validateModuleSlotCompatible(currentDevice.model, slot, module);
    if (!slotValidation.valid) throw new Error(slotValidation.error ?? `El módulo ${module} no es válido para ${currentDevice.model}`);

    await this.bridge.sendCommandAndWait("addModule", { id: this.generateId(), device, slot, module });
  }

  async removeModule(device: string, slot: number): Promise<void> {
    await this.bridge.sendCommandAndWait("removeModule", { id: this.generateId(), device, slot });
  }

  async configHost(device: string, options: { ip?: string; mask?: string; gateway?: string; dns?: string; dhcp?: boolean }): Promise<void> {
    await this.bridge.sendCommandAndWait("configHost", { id: this.generateId(), device, ...options });
  }

  async configureHostDhcp(device: string): Promise<void> {
    await this.configHost(device, { dhcp: true });
  }

  async configureDhcpServer(
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
  ): Promise<void> {
    await this.bridge.sendCommandAndWait("configDhcpServer", { id: this.generateId(), device, ...options });
  }

  async inspectDhcpServer(device: string, port?: string): Promise<{
    ok: boolean;
    device: string;
    enabled: boolean;
    pools: Array<{
      name: string;
      network: string;
      mask: string;
      defaultRouter: string;
      dns?: string;
      startIp?: string;
      endIp?: string;
      maxUsers?: number;
      leaseCount: number;
      leases: Array<{ mac: string; ip: string; expires: string }>;
    }>;
    excludedAddresses: Array<{ start: string; end: string }>;
  }> {
    const result = await this.bridge.sendCommandAndWait<{
      ok: boolean;
      device: string;
      enabled: boolean;
      pools: Array<{
        name: string;
        network: string;
        mask: string;
        defaultRouter: string;
        dns?: string;
        startIp?: string;
        endIp?: string;
        maxUsers?: number;
        leaseCount: number;
        leases: Array<{ mac: string; ip: string; expires: string }>;
      }>;
      excludedAddresses: Array<{ start: string; end: string }>;
    }>("inspectDhcpServer", { id: this.generateId(), device, port });
    return result.value!;
  }

  async moveDevice(name: string, x: number, y: number): Promise<{ ok: true; name: string; x: number; y: number } | { ok: false; error: string; code: string }> {
    const result = await this.bridge.sendCommandAndWait<{ ok: boolean; name?: string; x?: number; y?: number; error?: string; code?: string }>("moveDevice", { id: this.generateId(), name, x, y });
    const value = result.value;
    if (value?.ok) return { ok: true, name: value.name!, x: value.x!, y: value.y! };
    return { ok: false, error: value?.error ?? "Unknown error", code: value?.code ?? "UNKNOWN" };
  }

  async ensureVlans(
    device: string,
    vlans: Array<{ id: number; name?: string }>
  ): Promise<{
    ok: boolean;
    device: string;
    vlans: Array<{ id: number; name: string; created: boolean }>;
  }> {
    const result = await this.bridge.sendCommandAndWait<{
      ok: boolean;
      device: string;
      vlans: Array<{ id: number; name: string; created: boolean; error?: string }>;
    }>("ensureVlans", { id: this.generateId(), device, vlans });
    return result.value!;
  }

  async configVlanInterfaces(
    device: string,
    interfaces: Array<{ vlanId: number; ip: string; mask: string }>
  ): Promise<{
    ok: boolean;
    device: string;
    interfaces: Array<{ vlanId: number; ip: string; mask: string; error?: string }>;
  }> {
    const result = await this.bridge.sendCommandAndWait<{
      ok: boolean;
      device: string;
      interfaces: Array<{ vlanId: number; ip: string; mask: string; error?: string }>;
    }>("configVlanInterfaces", { id: this.generateId(), device, interfaces });
    return result.value!;
  }
}
