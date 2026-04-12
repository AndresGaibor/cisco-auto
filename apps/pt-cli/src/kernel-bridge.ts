/**
 * Kernel Bridge - Puente entre la CLI y el kernel.
 * Singleton que crea un PluginRegistry y registra los plugins disponibles.
 */

import { DefaultPluginRegistry, type PluginRegistry } from '@cisco-auto/kernel/plugin-api';
import { vlanPlugin } from '@cisco-auto/kernel/plugins/vlan';
import { routingPlugin } from '@cisco-auto/kernel/plugins/routing';
import { securityPlugin } from '@cisco-auto/kernel/plugins/security';
import { servicesPlugin } from '@cisco-auto/kernel/plugins/services';
import { packetTracerBackendPlugin, type PacketTracerBackendPlugin } from '@cisco-auto/kernel/backends/packet-tracer';
import { generateVlanCommands, validateVlanConfig } from '@cisco-auto/kernel/plugins/vlan';
import type { VlanConfigInput } from '@cisco-auto/kernel/plugins/vlan';

export type { VlanConfigInput };
export { generateVlanCommands, validateVlanConfig };

let registry: PluginRegistry | null = null;

/**
 * Obtiene el registro de plugins singleton.
 * Se crea una sola vez y se reutiliza entre comandos.
 */
export function getKernelRegistry(): PluginRegistry {
  if (!registry) {
    registry = new DefaultPluginRegistry();
    registry.register('protocol', vlanPlugin);
    registry.register('protocol', routingPlugin);
    registry.register('protocol', securityPlugin);
    registry.register('protocol', servicesPlugin);
    registry.register('backend', packetTracerBackendPlugin);
  }
  return registry;
}

/**
 * Obtiene un plugin de protocolo por ID.
 */
export function getProtocolPlugin(id: string) {
  const reg = getKernelRegistry();
  return reg.get('protocol', id);
}

/**
 * Obtiene el plugin VLAN del registro.
 */
export function getVlanPlugin() {
  return getProtocolPlugin('vlan');
}

/**
 * Obtiene el backend de Packet Tracer del registro.
 */
export function getPacketTracerBackend(): PacketTracerBackendPlugin | undefined {
  const reg = getKernelRegistry();
  const backend = reg.get('backend', 'packet-tracer');
  return backend as PacketTracerBackendPlugin | undefined;
}

/**
 * Resetea el singleton (solo para tests).
 */
export function resetKernelRegistry(): void {
  registry = null;
}
