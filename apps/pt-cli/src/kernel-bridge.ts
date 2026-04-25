/**
 * Kernel Bridge - Puente entre la CLI y el kernel.
 * Singleton que crea un PluginRegistry y registra los plugins disponibles.
 */

import { DefaultPluginRegistry, type PluginRegistry } from "@cisco-auto/kernel/plugin-api";
import { basicConfigPlugin } from "@cisco-auto/kernel/plugins/basic-config";
import { vlanPlugin } from "@cisco-auto/kernel/plugins/vlan";
import { switchingPlugin } from "@cisco-auto/kernel/plugins/switching";
import { routingPlugin } from "@cisco-auto/kernel/plugins/routing";
import { securityPlugin } from "@cisco-auto/kernel/plugins/security";
import { servicesPlugin } from "@cisco-auto/kernel/plugins/services";
import { ipv6Plugin } from "@cisco-auto/kernel/plugins/ipv6";
import { portTemplatePlugin } from "@cisco-auto/kernel/plugins/port-template";
import { configOrchestratorPlugin } from "@cisco-auto/kernel/plugins/orchestrator";
import {
  createPacketTracerBackendPlugin,
  createPacketTracerAdapter,
  type PacketTracerBackendPlugin,
  type PacketTracerAdapterDependencies,
} from "@cisco-auto/kernel/backends/packet-tracer";
import { createPTController } from "@cisco-auto/pt-control";
import { generateVlanCommands, validateVlanConfig } from "@cisco-auto/kernel/plugins/vlan";
import type { VlanConfigInput } from "@cisco-auto/kernel/plugins/vlan";
import {
  generateBasicCommands,
  validateBasicConfig,
} from "@cisco-auto/kernel/plugins/basic-config";
import type { BasicConfigInput } from "@cisco-auto/kernel/plugins/basic-config";
import { orchestrateConfig } from "@cisco-auto/kernel/plugins/orchestrator";
import type { DeviceConfigSpecInput } from "@cisco-auto/kernel/plugins/orchestrator";

export type { VlanConfigInput, BasicConfigInput, DeviceConfigSpecInput };
export {
  generateVlanCommands,
  validateVlanConfig,
  generateBasicCommands,
  validateBasicConfig,
  orchestrateConfig,
};

let registry: PluginRegistry | null = null;

/**
 * Obtiene el registro de plugins singleton.
 * Se crea una sola vez y se reutiliza entre comandos.
 */
export function getKernelRegistry(): PluginRegistry {
  if (!registry) {
    registry = new DefaultPluginRegistry();
    registry.register("protocol", basicConfigPlugin);
    registry.register("protocol", vlanPlugin);
    registry.register("protocol", switchingPlugin);
    registry.register("protocol", routingPlugin);
    registry.register("protocol", securityPlugin);
    registry.register("protocol", servicesPlugin);
    registry.register("protocol", ipv6Plugin);
    registry.register("protocol", portTemplatePlugin);
    registry.register("protocol", configOrchestratorPlugin);

    // Crear backend plugin con factory pública de pt-control.
    // No instanciar PTController directamente: el constructor espera ControlComposition,
    // mientras que el backend entrega PacketTracerBackendConfig { devDir }.
    const deps: PacketTracerAdapterDependencies = {
      createController: (config) => createPTController(config),
    };
    const adapter = createPacketTracerAdapter(deps);
    const ptPlugin = createPacketTracerBackendPlugin(adapter);
    registry.register("backend", ptPlugin);
  }
  return registry;
}

/**
 * Obtiene un plugin de protocolo por ID.
 */
export function getProtocolPlugin(id: string) {
  const reg = getKernelRegistry();
  return reg.get("protocol", id);
}

/**
 * Obtiene el plugin de configuración básica del registro.
 */
export function getBasicConfigPlugin() {
  return getProtocolPlugin("basic-config");
}

/**
 * Obtiene el plugin VLAN del registro.
 */
export function getVlanPlugin() {
  return getProtocolPlugin("vlan");
}

/**
 * Obtiene el plugin de switching del registro.
 */
export function getSwitchingPlugin() {
  return getProtocolPlugin("switching");
}

/**
 * Obtiene el backend de Packet Tracer del registro.
 */
export function getPacketTracerBackend(): PacketTracerBackendPlugin | undefined {
  const reg = getKernelRegistry();
  const backend = reg.get("backend", "packet-tracer");
  return backend as PacketTracerBackendPlugin | undefined;
}

/**
 * Resetea el singleton (solo para tests).
 */
export function resetKernelRegistry(): void {
  registry = null;
}
