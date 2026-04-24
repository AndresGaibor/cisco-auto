import type { RuntimePrimitivePort } from "../../ports/runtime-primitive-port.js";
import type { TopologyCachePort } from "../ports/topology-cache.port.js";
import type { DeviceState } from "@cisco-auto/types";

/**
 * Servicio de consulta de dispositivos.
 * Proporciona operaciones de lectura sobre dispositivos PT.
 */
export class DeviceQueryService {
  constructor(
    private primitivePort: RuntimePrimitivePort,
    private cache: TopologyCachePort,
    private generateId: () => string,
  ) {}

  /**
   * Inspecciona un dispositivo y retorna su estado completo.
   * @param device - Nombre del dispositivo
   * @param includeXml - Si true, incluye XML de configuración
   * @returns Estado completo del dispositivo
   */
  async inspect(device: string, includeXml = false): Promise<DeviceState> {
    if (!includeXml) {
      const cachedDevice = this.cache.getDevice(device);
      if (cachedDevice) return cachedDevice;

      const snapshotResult = await this.primitivePort.runPrimitive("topology.snapshot", {
        id: this.generateId(),
      });

      if (snapshotResult.ok && snapshotResult.value && typeof snapshotResult.value === "object") {
        const snapshot = snapshotResult.value as { devices?: Record<string, DeviceState>; links?: unknown };
        if (snapshot.devices && typeof snapshot.devices === "object") {
          const snapshotDevice =
            snapshot.devices[device] ??
            Object.values(snapshot.devices).find((entry) => entry?.name === device || (entry as any)?.id === device);

          if (snapshotDevice) {
            if (typeof this.cache.applySnapshot === "function" && snapshot.links && typeof snapshot.links === "object") {
              this.cache.applySnapshot({
                devices: snapshot.devices,
                links: snapshot.links as Record<string, unknown>,
              } as any);
            }

            return snapshotDevice;
          }
        }
      }
    }

    const result = await this.primitivePort.runPrimitive("device.inspect", {
      id: this.generateId(),
      device,
      includeXml,
    });
    if (!result.ok) throw new Error(`Failed to inspect device '${device}': ${result.error}`);
    return result.value as DeviceState;
  }

  /**
   * Obtiene información de hardware de un dispositivo.
   * @param device - Nombre del dispositivo
   * @returns Información de hardware
   */
  async hardwareInfo(device: string): Promise<unknown> {
    const result = await this.primitivePort.runPrimitive("snapshot.hardware", {
      id: this.generateId(),
      device,
    });
    if (!result.ok) throw new Error(`Failed to get hardware info for '${device}': ${result.error}`);
    return result.value;
  }

  /**
   * Obtiene el catálogo de hardware disponible.
   * @param deviceType - Filtrar por tipo de dispositivo opcional
   * @returns Catálogo de hardware
   */
  async hardwareCatalog(deviceType?: string): Promise<unknown> {
    const result = await this.primitivePort.runPrimitive("snapshot.catalog", {
      id: this.generateId(),
      deviceType,
    });
    if (!result.ok) throw new Error(`Failed to get hardware catalog: ${result.error}`);
    return result.value;
  }

  /**
   * Obtiene el log de comandos ejecutados en un dispositivo.
   * @param device - Nombre del dispositivo (opcional)
   * @param limit - Límite de entradas a retornar
   * @returns Lista de entradas del log
   */
  async commandLog(device?: string, limit = 100): Promise<unknown[]> {
    const result = await this.primitivePort.runPrimitive("snapshot.commandLog", {
      id: this.generateId(),
      device,
      limit,
    });
    return (result.value ?? []) as unknown[];
  }

  /**
   * Inspecciona el servidor DHCP de un dispositivo.
   * @param device - Nombre del dispositivo
   * @returns Estado del servidor DHCP
   */
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

  /**
   * Realiza una inspección profunda de un dispositivo.
   * @param path - Path de inspección
   * @param method - Método opcional a invocar
   * @param args - Argumentos opcionales
   * @returns Resultado de la inspección
   */
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
