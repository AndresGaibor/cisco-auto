import type { RuntimePrimitivePort } from "../../ports/runtime-primitive-port.js";
import { validateModuleExists, validateModuleSlotCompatible, findFirstCompatibleSlot } from "@cisco-auto/pt-runtime";
import { DeviceQueryService } from "./device-query-service.js";

export interface AddModuleResult {
  device: string;
  module: string;
  slot: number;
  wasPoweredOff: boolean;
  powerRestored: boolean;
}

export interface AddModuleError {
  ok: false;
  error: string;
  code: string;
  advice?: string[];
}

/**
 * Servicio de mutación de dispositivos.
 * Proporciona operaciones de escritura sobre dispositivos PT.
 */
export class DeviceMutationService {
  constructor(
    private readonly primitivePort: RuntimePrimitivePort,
    private readonly query: DeviceQueryService,
  ) {}

  /**
   * Añade un módulo a un dispositivo.
   * @param device - Nombre del dispositivo
   * @param slot - Slot donde instalar el módulo ("auto" para descubrimiento automático)
   * @param module - Tipo de módulo
   */
  async addModule(device: string, slot: number | "auto", module: string): Promise<{ ok: true; value: AddModuleResult } | AddModuleError> {
    const currentDevice = await this.query.inspect(device, false);
    const moduleValidation = validateModuleExists(module);
    if (!moduleValidation.valid)
      return { ok: false, error: moduleValidation.error ?? `Módulo '${module}' no encontrado en catálogo`, code: "MODULE_NOT_FOUND" };

    let resolvedSlot: number;
    if (slot === "auto") {
      const autoSlot = findFirstCompatibleSlot(currentDevice.model, module);
      if (!autoSlot.valid)
        return { ok: false, error: autoSlot.error ?? `No se encontró slot compatible para '${module}' en '${currentDevice.model}'`, code: "NO_COMPATIBLE_SLOT" };
      resolvedSlot = autoSlot.slot;
    } else {
      const slotValidation = validateModuleSlotCompatible(currentDevice.model, slot, module);
      if (!slotValidation.valid)
        return { ok: false, error: slotValidation.error ?? `Slot inválido para '${module}'`, code: "SLOT_INCOMPATIBLE" };
      resolvedSlot = slot;
    }

    const result = await this.primitivePort.runPrimitive("module.add", { device, slot: resolvedSlot, module });
    if (!result.ok) {
      return { ok: false, error: result.error ?? "Error añadiendo módulo", code: "MODULE_ADD_FAILED" };
    }

    const value = result.value as { wasPoweredOff?: boolean };
    return {
      ok: true,
      value: {
        device,
        module,
        slot: resolvedSlot,
        wasPoweredOff: value?.wasPoweredOff ?? false,
        powerRestored: value?.wasPoweredOff ?? false,
      },
    };
  }

  async inspectModuleSlots(device: string): Promise<{ ok: boolean; value?: unknown }> {
    const result = await this.primitivePort.runPrimitive("module.slots", { device });
    if (!result.ok) {
      return { ok: false };
    }

    return { ok: true, value: result.value };
  }

  /**
   * Remueve un módulo de un dispositivo.
   * @param device - Nombre del dispositivo
   * @param slot - Slot del módulo a remover
   */
  async removeModule(device: string, slot: number): Promise<{ ok: boolean; value?: unknown }> {
    const result = await this.primitivePort.runPrimitive("module.remove", { device, slot });
    if (!result.ok) {
      return { ok: false };
    }

    return { ok: true, value: result.value };
  }

  /**
   * Configura los parámetros IP de un host (PC/Server).
   * @param device - Nombre del dispositivo host
   * @param options - Opciones de configuración IP
   */
  async configHost(
    device: string,
    options: { ip?: string; mask?: string; gateway?: string; dns?: string; dhcp?: boolean },
  ): Promise<void> {
    const result = await this.primitivePort.runPrimitive("host.configure", { device, ...options });
    
    if (!result.ok || !(result.value as any)?.ok) {
        // RESCUE MODE: Si la primitiva falla, intentamos via terminal
        if (options.ip && options.mask) {
            try {
                const cmd = `ipconfig ${options.ip} ${options.mask} ${options.gateway || ""}`;
                // execPc ahora usa el CommandExecutor robusto, no necesita delays externos
                await this.primitivePort.runPrimitive("execPc", { device, command: cmd });

                // RE-VERIFICACIÓN: ¿Realmente se puso la IP?
                const check = await this.primitivePort.runPrimitive("host.configure", { device });
                const currentIp = (check.value as any)?.ip;
                
                if (currentIp !== options.ip) {
                    throw new Error(`Rescue mode failed: IP in terminal set but hardware still reports ${currentIp}`);
                }
                return;
            } catch (e) {
                throw new Error(result.error ?? `Error configurando host ${device} incluso en modo rescate: ${String(e)}`);
            }
        }
        throw new Error(result.error ?? `Error configurando host ${device}`);
    }
  }

  /**
   * Configura un host para usar DHCP.
   * @param device - Nombre del dispositivo host
   */
  async configureHostDhcp(device: string): Promise<void> {
    await this.configHost(device, { dhcp: true });
  }

  /**
   * Configura el servidor DHCP en un dispositivo.
   * @param device - Nombre del dispositivo
   * @param options - Configuración del servidor DHCP
   */
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

  /**
   * Inspecciona el estado del servidor DHCP.
   * @param device - Nombre del dispositivo
   * @param port - Puerto opcional
   * @returns Estado del servidor DHCP con pools y leases
   */
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

  /**
   * Mueve un dispositivo a nuevas coordenadas.
   * @param name - Nombre del dispositivo
   * @param x - Nueva coordenada X
   * @param y - Nueva coordenada Y
   * @returns Resultado con éxito o error
   */
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

  /**
   * Asegura que las VLANs existan en el dispositivo.
   * @param device - Nombre del dispositivo
   * @param vlans - Lista de VLANs a asegurar
   * @returns Resultado con VLANs creadas y existentes
   */
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

  /**
   * Configura interfaces VLAN con IP y máscara.
   * @param device - Nombre del dispositivo
   * @param interfaces - Lista de interfaces VLAN a configurar
   * @returns Resultado de la configuración
   */
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
