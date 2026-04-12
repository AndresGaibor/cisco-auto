import { PTController } from '@cisco-auto/pt-control';

export interface PacketTracerBackendConfig {
  devDir: string;
}

export interface PacketTracerControllerLike {
  start(): Promise<void>;
  stop(): Promise<void>;
  addDevice: PTController['addDevice'];
  removeDevice: PTController['removeDevice'];
  configIosWithResult: PTController['configIosWithResult'];
  show: PTController['show'];
  showVlan: PTController['showVlan'];
  addLink: PTController['addLink'];
  removeLink: PTController['removeLink'];
  snapshot: PTController['snapshot'];
}

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

export interface PacketTracerAdapterDependencies {
  createController(config: PacketTracerBackendConfig): PacketTracerControllerLike;
}

function isPacketTracerBackendConfig(config: unknown): config is PacketTracerBackendConfig {
  return typeof config === 'object' && config !== null && 'devDir' in config && typeof (config as { devDir?: unknown }).devDir === 'string';
}

function resolveController(controller: PacketTracerControllerLike | null): PacketTracerControllerLike {
  if (!controller) {
    throw new Error('Packet Tracer backend is not connected');
  }

  return controller;
}

export function createPacketTracerAdapter(
  dependencies: Partial<PacketTracerAdapterDependencies> = {},
): PacketTracerBackendAdapter {
  const createController = dependencies.createController ?? ((config: PacketTracerBackendConfig) => new PTController(config));

  let controller: PacketTracerControllerLike | null = null;

  return {
    async connect(config: unknown) {
      if (!isPacketTracerBackendConfig(config)) {
        throw new TypeError('devDir is required to connect the Packet Tracer backend');
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

      if (normalizedCommand === 'show vlan' || normalizedCommand === 'show vlan brief') {
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
