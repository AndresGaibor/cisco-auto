import type { BackendPlugin } from "../../plugin-api/backend.plugin.js";
import type { PluginValidationResult } from "../../plugin-api/plugin.types.js";
import { toValidationResult } from '../../plugins/shared/validation.utils.js';
import {
  createPacketTracerAdapter,
  type PacketTracerBackendAdapter,
  type PacketTracerAdapterDependencies,
} from "./packet-tracer.adapter.js";

function validateConfig(config: unknown): PluginValidationResult {
  if (typeof config !== "object" || config === null) {
    return toValidationResult([
      { path: "config", message: "Configuration must be an object", code: "invalid_type" },
    ]);
  }

  if (
    !("devDir" in config) ||
    typeof (config as { devDir?: unknown }).devDir !== "string" ||
    (config as { devDir?: string }).devDir.trim() === ""
  ) {
    return toValidationResult([
      { path: "devDir", message: "devDir is required", code: "missing_dev_dir" },
    ]);
  }

  return toValidationResult([]);
}

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
