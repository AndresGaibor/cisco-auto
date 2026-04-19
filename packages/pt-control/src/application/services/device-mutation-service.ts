import type { RuntimePrimitivePort } from "../../ports/runtime-primitive-port.js";
import { validateModuleExists, validateModuleSlotCompatible } from "@cisco-auto/pt-runtime";
import { DeviceQueryService } from "./device-query-service.js";

export class DeviceMutationService {
  constructor(
    private readonly primitivePort: RuntimePrimitivePort,
    private readonly query: DeviceQueryService,
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
    const result = await this.primitivePort.runPrimitive("host.configure", { device, ...options });
    if (!result.ok) {
      throw new Error(result.error ?? `Error configurando host ${device}`);
    }
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
    const result = await this.primitivePort.runPrimitive("dhcp.configure", { device, ...options });
    if (!result.ok) {
      throw new Error(result.error ?? `Error configurando DHCP server en ${device}`);
    }
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
    const result = await this.primitivePort.runPrimitive("dhcp.inspect", { device, port });
    if (!result.ok) {
      return {
        ok: false,
        device,
        enabled: false,
        pools: [],
        excludedAddresses: [],
      };
    }
    return result.value as {
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
    };
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
    const result = await this.primitivePort.runPrimitive("vlan.ensure", { device, vlans });
    if (!result.ok) {
      throw new Error(result.error ?? `Error asegurando VLANs en ${device}`);
    }
    return result.value as {
      ok: boolean;
      device: string;
      vlans: Array<{ id: number; name: string; created: boolean }>;
    };
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
    const result = await this.primitivePort.runPrimitive("vlan.configInterfaces", { device, interfaces });
    if (!result.ok) {
      throw new Error(result.error ?? `Error configurando interfaces VLAN en ${device}`);
    }
    return result.value as {
      ok: boolean;
      device: string;
      interfaces: Array<{ vlanId: number; ip: string; mask: string; error?: string }>;
    };
  }
}
