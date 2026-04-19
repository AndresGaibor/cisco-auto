import type { FileBridgePort } from "../ports/file-bridge.port.js";
import type { RuntimePrimitivePort } from "../../ports/runtime-primitive-port.js";
import type { DeviceState } from "../../contracts/index.js";
import { validateModuleExists, validateModuleSlotCompatible } from "@cisco-auto/pt-runtime";
import { DeviceQueryService } from "./device-query-service.js";

export class DeviceMutationService {
  constructor(
    private readonly bridge: FileBridgePort,
    private readonly primitivePort: RuntimePrimitivePort,
    private readonly query: DeviceQueryService,
    private readonly generateId: () => string,
  ) {}

  async addModule(device: string, slot: number, module: string): Promise<void> {
    const currentDevice = await this.query.inspect(device, false);
    const moduleValidation = validateModuleExists(module);
    if (!moduleValidation.valid)
      throw new Error(moduleValidation.error ?? `Módulo inválido: ${module}`);

    const slotValidation = validateModuleSlotCompatible(currentDevice.model, slot, module);
    if (!slotValidation.valid)
      throw new Error(
        slotValidation.error ?? `El módulo ${module} no es válido para ${currentDevice.model}`,
      );

    const result = await this.primitivePort.runPrimitive("module.add", { device, slot, module });
    if (!result.ok) {
      throw new Error(result.error ?? `Error añadiendo módulo ${module} a ${device}`);
    }
  }

  async removeModule(device: string, slot: number): Promise<void> {
    const result = await this.primitivePort.runPrimitive("module.remove", { device, slot });
    if (!result.ok) {
      throw new Error(result.error ?? `Error removiendo módulo de ${device}`);
    }
  }

  async configHost(
    device: string,
    options: { ip?: string; mask?: string; gateway?: string; dns?: string; dhcp?: boolean },
  ): Promise<void> {
    // TODO: [workflow-migration] Migrar a planner/workflow
    // Este método compone múltiples primitivas (host.setIp, host.setGateway, etc.)
    // y tiene lógica de negocio: determinar qué primitivas invocar según las opciones.
    await this.bridge.sendCommandAndWait("configHost", {
      id: this.generateId(),
      device,
      ...options,
    });
  }

  async configureHostDhcp(device: string): Promise<void> {
    // TODO: [workflow-migration] Delegar a workflow de DHCP que use primitiva host.setDhcp
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
    },
  ): Promise<void> {
    // TODO: [workflow-migration] Migrar a planner/workflow
    // Lógica de negocio compleja: validación de pools, exclusión de IPs, lease time, etc.
    await this.bridge.sendCommandAndWait("configDhcpServer", {
      id: this.generateId(),
      device,
      ...options,
    });
  }

  async inspectDhcpServer(
    device: string,
    port?: string,
  ): Promise<{
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
    // TODO: [workflow-migration] query con lógica de parsing - posible usar device.inspect + parsing
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

  async moveDevice(
    name: string,
    x: number,
    y: number,
  ): Promise<
    { ok: true; name: string; x: number; y: number } | { ok: false; error: string; code: string }
  > {
    const result = await this.primitivePort.runPrimitive("device.move", { name, x, y });
    if (!result.ok) {
      return { ok: false, error: result.error ?? "Unknown error", code: result.code ?? "UNKNOWN" };
    }
    const value = result.value as { name?: string; x?: number; y?: number } | undefined;
    if (!value?.name || value.x === undefined || value.y === undefined) {
      return { ok: false, error: "Respuesta inválida de primitiva", code: "INVALID_RESPONSE" };
    }
    return { ok: true, name: value.name, x: value.x, y: value.y };
  }

  async ensureVlans(
    device: string,
    vlans: Array<{ id: number; name?: string }>,
  ): Promise<{
    ok: boolean;
    device: string;
    vlans: Array<{ id: number; name: string; created: boolean }>;
  }> {
    // TODO: [workflow-migration] Migrar a planner/workflow
    // Lógica de negocio: crear VLANs, asignar nombres, manejar errores por VLAN
    const result = await this.bridge.sendCommandAndWait<{
      ok: boolean;
      device: string;
      vlans: Array<{ id: number; name: string; created: boolean; error?: string }>;
    }>("ensureVlans", { id: this.generateId(), device, vlans });
    return result.value!;
  }

  async configVlanInterfaces(
    device: string,
    interfaces: Array<{ vlanId: number; ip: string; mask: string }>,
  ): Promise<{
    ok: boolean;
    device: string;
    interfaces: Array<{ vlanId: number; ip: string; mask: string; error?: string }>;
  }> {
    // TODO: [workflow-migration] Migrar a planner/workflow
    // Lógica de negocio: validar VLANs, configurar interfaces, aplicar IP/subnet
    const result = await this.bridge.sendCommandAndWait<{
      ok: boolean;
      device: string;
      interfaces: Array<{ vlanId: number; ip: string; mask: string; error?: string }>;
    }>("configVlanInterfaces", { id: this.generateId(), device, interfaces });
    return result.value!;
  }
}
