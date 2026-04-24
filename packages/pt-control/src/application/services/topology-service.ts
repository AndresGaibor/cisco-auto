// ============================================================================
// TopologyService - Device and topology management
// ============================================================================

import type { TopologyCachePort } from "../ports/topology-cache.port.js";
import type { RuntimePrimitivePort } from "../../ports/runtime-primitive-port.js";
import type {
  TopologySnapshot,
  DeviceState,
  LinkState,
  AddLinkPayload,
  DeviceListResult,
} from "../../contracts/index.js";
import { TopologyQueryService } from "./topology-query-service.js";
import { TopologyMutationService } from "./topology-mutation-service.js";

export class TopologyService {
  private readonly query: TopologyQueryService;
  private readonly mutation: TopologyMutationService;

  constructor(
    primitivePort: RuntimePrimitivePort,
    cache: TopologyCachePort,
    generateId: () => string,
  ) {
    this.query = new TopologyQueryService(cache, primitivePort, generateId);
    this.mutation = new TopologyMutationService(primitivePort, generateId, (deviceName) =>
      this.getDeviceState(deviceName),
    );
  }

  /**
   * Obtiene un snapshot completo de la topología desde PT.
   * @returns Snapshot de topología o null si no hay estado
   */
  snapshot(): Promise<TopologySnapshot | null> {
    return this.query.snapshot();
  }

  /**
   * Lista dispositivos con filtros opcionales.
   * @param filter - Filter por tipo, nombre o array de nombres
   * @returns Resultado con dispositivos y conexiones
   */
  listDevices(filter?: string | number | string[]): Promise<DeviceListResult> {
    return this.query.listDevices(filter);
  }

  /**
   * Agrega un dispositivo a la topología.
   * @param name - Nombre del dispositivo
   * @param model - Modelo del dispositivo (ej: "2911", "2960")
   * @param options - Posición opcional x/y
   * @returns Estado del dispositivo creado
   */
  addDevice(
    name: string,
    model: string,
    options?: { x?: number; y?: number },
  ): Promise<DeviceState> {
    return this.mutation.addDevice(name, model, options);
  }

  /**
   * Elimina un dispositivo de la topología.
   * @param name - Nombre del dispositivo a eliminar
   */
  removeDevice(name: string): Promise<void> {
    return this.mutation.removeDevice(name);
  }

  /**
   * Renombra un dispositivo.
   * @param oldName - Nombre actual
   * @param newName - Nuevo nombre
   */
  renameDevice(oldName: string, newName: string): Promise<void> {
    return this.mutation.renameDevice(oldName, newName);
  }

  /**
   * Mueve un dispositivo a nuevas coordenadas.
   * @param name - Nombre del dispositivo
   * @param x - Nueva coordenada X
   * @param y - Nueva coordenada Y
   * @returns Resultado con éxito o error
   */
  moveDevice(
    name: string,
    x: number,
    y: number,
  ): Promise<
    { ok: true; name: string; x: number; y: number } | { ok: false; error: string; code: string }
  > {
    return this.mutation.moveDevice(name, x, y);
  }

  /**
   * Agrega un enlace entre dos dispositivos.
   * @param device1 - Primer dispositivo
   * @param port1 - Puerto del primer dispositivo
   * @param device2 - Segundo dispositivo
   * @param port2 - Puerto del segundo dispositivo
   * @param linkType - Tipo de cable (auto por defecto)
   * @returns Estado del enlace creado
   */
  addLink(
    device1: string,
    port1: string,
    device2: string,
    port2: string,
    linkType: AddLinkPayload["linkType"] = "auto",
  ): Promise<LinkState> {
    return this.mutation.addLink(device1, port1, device2, port2, linkType);
  }

  /**
   * Elimina un enlace.
   * @param device - Dispositivo
   * @param port - Puerto del enlace a eliminar
   */
  removeLink(device: string, port: string): Promise<void> {
    return this.mutation.removeLink(device, port);
  }

  /**
   * Limpia toda la topología (elimina todos los dispositivos y enlaces).
   * @returns Estadísticas de lo eliminado
   */
  clearTopology(): Promise<{
    removedDevices: number;
    removedLinks: number;
    remainingDevices: number;
    remainingLinks: number;
  }> {
    return this.mutation.clearTopology();
  }

  /**
   * Obtiene snapshot cacheado sin consultar PT.
   * @returns Snapshot o null si no hay estado cacheado
   */
  getCachedSnapshot(): TopologySnapshot | null {
    return this.query.getCachedSnapshot();
  }

  private getDeviceState(deviceName: string): DeviceState | undefined {
    return this.query.getCachedSnapshot()?.devices?.[deviceName] ?? undefined;
  }
}
