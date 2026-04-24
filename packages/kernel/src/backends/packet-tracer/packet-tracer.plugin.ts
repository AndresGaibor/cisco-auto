import type { BackendPlugin } from "../../plugin-api/backend.plugin.js";
import type { PluginValidationResult } from "../../plugin-api/plugin.types.js";
import { toValidationResult } from '../../plugins/shared/validation.utils.js';
import {
  createPacketTracerAdapter,
  type PacketTracerBackendAdapter,
} from "./packet-tracer.adapter.js";

/**
 * Valida la configuración del plugin de Packet Tracer.
 * Requiere que devDir sea un string no vacío.
 * 
 * @param config - Configuración a validar
 * @returns Resultado de validación
 */
function validateConfig(config: unknown): PluginValidationResult {
  if (typeof config !== "object" || config === null) {
    return toValidationResult([
      { path: "config", message: "Configuration must be an object", code: "invalid_type" },
    ]);
  }

  const cfg = config as { devDir?: unknown };
  if (
    !("devDir" in cfg) ||
    typeof cfg.devDir !== "string" ||
    cfg.devDir.trim() === ""
  ) {
    return toValidationResult([
      { path: "devDir", message: "devDir is required", code: "missing_dev_dir" },
    ]);
  }

  return toValidationResult([]);
}

/**
 * Interface extendida del plugin de backend para Packet Tracer.
 * Incluye todos los métodos específicos de PT.
 */
export interface PacketTracerBackendPlugin extends BackendPlugin {
  id: "packet-tracer";
  description: string;
  addDevice(name: string, model: string, options?: { x?: number; y?: number }): Promise<unknown>;
  removeDevice(name: string): Promise<void>;
  configureDevice(name: string, commands: string[]): Promise<unknown>;
  execShow(name: string, command: string): Promise<unknown>;
  addLink(device1: string, port1: string, device2: string, port2: string): Promise<unknown>;
  removeLink(device: string, port: string): Promise<void>;
  getTopology(): Promise<unknown>;
}

/**
 * Factory para crear el plugin de backend de Packet Tracer.
 * Envuelve el adapter con la interfaz de plugin correcta.
 * 
 * @param adapter - Adapter de Packet Tracer
 * @returns Plugin listo para registrar en el sistema
 */
export function createPacketTracerBackendPlugin(
  adapter: PacketTracerBackendAdapter,
): PacketTracerBackendPlugin {
  return {
    id: "packet-tracer",
    category: "backend",
    name: "Cisco Packet Tracer",
    version: "1.0.0",
    description: "Packet Tracer backend plugin for the kernel.",
    validate: validateConfig,
    connect: (config: unknown) => adapter.connect(config),
    disconnect: () => adapter.disconnect(),
    isConnected: () => adapter.isConnected(),
    addDevice: (name, model, options) => adapter.addDevice(name, model, options),
    removeDevice: (name) => adapter.removeDevice(name),
    configureDevice: (name, commands) => adapter.configureDevice(name, commands),
    execShow: (name, command) => adapter.execShow(name, command),
    addLink: (device1, port1, device2, port2) => adapter.addLink(device1, port1, device2, port2),
    removeLink: (device, port) => adapter.removeLink(device, port),
    getTopology: () => adapter.getTopology(),
  };
}

export { createPacketTracerAdapter };
export type {
  PacketTracerAdapterDependencies,
  PacketTracerBackendAdapter,
  PacketTracerControllerLike,
  PacketTracerBackendConfig,
} from "./packet-tracer.adapter.js";
