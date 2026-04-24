/**
 * Información de un dispositivo en Packet Tracer.
 */
export interface DeviceInfo {
  name: string;
  model: string;
  type: string;
  power: boolean;
  ports: Array<Record<string, unknown>>;
}

/**
 * Información de un enlace entre dispositivos.
 */
export interface LinkInfo {
  id: string;
  device1: string;
  port1: string;
  device2: string;
  port2: string;
  cableType: string;
}

/**
 * Resultado de snapshot de la topología.
 * Contiene el estado completo de la simulación.
 */
export interface SnapshotResult {
  version: string;
  timestamp: number;
  devices: Record<string, DeviceInfo>;
  links: Record<string, LinkInfo>;
  metadata?: { deviceCount: number; linkCount: number };
}

/**
 * Configuración para conectar al backend de Packet Tracer.
 */
export interface PacketTracerBackendConfig {
  devDir: string;
}

/**
 * Interface del controlador de Packet Tracer.
 * Abstrae la comunicación con el proceso de PT.
 */
export interface PacketTracerControllerLike {
  start(): Promise<void>;
  stop(): Promise<void>;
  addDevice(name: string, model: string, options?: { x?: number; y?: number }): Promise<DeviceInfo>;
  removeDevice(name: string): Promise<void>;
  configIosWithResult(
    name: string,
    commands: string[],
    options?: { save?: boolean },
  ): Promise<Record<string, unknown>>;
  show(name: string, command: string): Promise<string>;
  showVlan(name: string): Promise<Record<string, unknown>>;
  addLink(
    device1: string,
    port1: string,
    device2: string,
    port2: string,
    cableType?: string,
  ): Promise<LinkInfo>;
  removeLink(device: string, port: string): Promise<void>;
  snapshot(): Promise<SnapshotResult>;
}

/**
 * Adapter que implementa la interfaz de backend para Packet Tracer.
 * Delega toda la lógica al controlador proporcionado por dependencias.
 */
export interface PacketTracerBackendAdapter {
  connect(config: unknown): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  addDevice(name: string, model: string, options?: { x?: number; y?: number }): Promise<unknown>;
  removeDevice(name: string): Promise<void>;
  configureDevice(name: string, commands: string[]): Promise<unknown>;
  execShow(name: string, command: string): Promise<unknown>;
  addLink(device1: string, port1: string, device2: string, port2: string): Promise<unknown>;
  removeLink(device: string, port: string): Promise<void>;
  getTopology(): Promise<unknown>;
}

/**
 * Dependencias requeridas por el adapter.
 * Proveen la factory para crear controladores de PT.
 */
export interface PacketTracerAdapterDependencies {
  createController(config: PacketTracerBackendConfig): PacketTracerControllerLike;
}

/**
 * Verifica si el config es un PacketTracerBackendConfig válido.
 */
function isPacketTracerBackendConfig(config: unknown): config is PacketTracerBackendConfig {
  return (
    typeof config === "object" &&
    config !== null &&
    "devDir" in config &&
    typeof (config as { devDir?: unknown }).devDir === "string"
  );
}

/**
 * Resuelve el controlador o lanza si no está conectado.
 */
function resolveController(
  controller: PacketTracerControllerLike | null,
): PacketTracerControllerLike {
  if (!controller) {
    throw new Error("Packet Tracer backend is not connected");
  }

  return controller;
}

/**
 * Factory que crea el adapter de Packet Tracer.
 * Recibe dependencias que proporcionan el controlador.
 * 
 * @param dependencies - Factory para crear controladores de PT
 * @returns Adapter listo para usar con connect/disconnect
 * 
 * @example
 * const adapter = createPacketTracerAdapter({
 *   createController: (config) => new PacketTracerController(config)
 * });
 * await adapter.connect({ devDir: '/path/to/pt-dev' });
 */
export function createPacketTracerAdapter(
  dependencies: PacketTracerAdapterDependencies,
): PacketTracerBackendAdapter {
  const { createController } = dependencies;

  let controller: PacketTracerControllerLike | null = null;

  return {
    async connect(config: unknown) {
      if (!isPacketTracerBackendConfig(config)) {
        throw new TypeError("devDir is required to connect the Packet Tracer backend");
      }

      const instance = createController(config);
      try {
        await instance.start();
        controller = instance;
      } catch (error) {
        controller = null;
        throw error;
      }
    },
    async disconnect() {
      if (!controller) {
        return;
      }

      await controller.stop();
      controller = null;
    },
    isConnected() {
      return controller !== null;
    },
    async addDevice(name, model, options) {
      return resolveController(controller).addDevice(name, model, options);
    },
    async removeDevice(name) {
      await resolveController(controller).removeDevice(name);
    },
    async configureDevice(name, commands) {
      return resolveController(controller).configIosWithResult(name, commands, { save: true });
    },
    async execShow(name, command) {
      const controllerInstance = resolveController(controller);
      const normalizedCommand = command.trim().toLowerCase();

      if (normalizedCommand === "show vlan" || normalizedCommand === "show vlan brief") {
        return controllerInstance.showVlan(name);
      }

      return controllerInstance.show(name, command);
    },
    async addLink(device1, port1, device2, port2) {
      return resolveController(controller).addLink(device1, port1, device2, port2);
    },
    async removeLink(device, port) {
      await resolveController(controller).removeLink(device, port);
    },
    async getTopology() {
      return resolveController(controller).snapshot();
    },
  };
}
