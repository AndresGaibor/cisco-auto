/**
 * Kernel Bridge - Puente entre la CLI y el kernel.
 * Singleton que crea un PluginRegistry y registra los plugins disponibles.
 */

import { DefaultPluginRegistry, type PluginRegistry } from '@cisco-auto/kernel/plugin-api';
import { vlanPlugin } from '@cisco-auto/kernel/plugins/vlan';
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
    registry.register('backend', packetTracerBackendPlugin);
  }
  return registry;
}

/**
 * Obtiene el plugin VLAN del registro.
 */
export function getVlanPlugin() {
  const reg = getKernelRegistry();
  return reg.get('protocol', 'vlan');
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
