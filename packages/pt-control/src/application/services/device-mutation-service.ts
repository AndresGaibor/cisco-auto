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
    options: { poolName: string; network: string; subnetMask: string; defaultRouter?: string; dnsServers?: string[]; excludedAddresses?: string[]; leaseTime?: number; domainName?: string; }
  ): Promise<void> {
    await this.bridge.sendCommandAndWait("configureDhcpServer", { id: this.generateId(), device, ...options });
  }

  async moveDevice(name: string, x: number, y: number): Promise<{ ok: true; name: string; x: number; y: number } | { ok: false; error: string; code: string }> {
    const result = await this.bridge.sendCommandAndWait<{ ok: boolean; name?: string; x?: number; y?: number; error?: string; code?: string }>("moveDevice", { id: this.generateId(), name, x, y });
    const value = result.value;
    if (value?.ok) return { ok: true, name: value.name!, x: value.x!, y: value.y! };
    return { ok: false, error: value?.error ?? "Unknown error", code: value?.code ?? "UNKNOWN" };
  }
}
