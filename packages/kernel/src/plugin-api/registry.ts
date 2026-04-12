import type { BackendPlugin } from './backend.plugin.js';
import type { DevicePlugin } from './device.plugin.js';
import type { ProtocolPlugin } from './protocol.plugin.js';

export type PluginKind = 'protocol' | 'device' | 'backend';

type PluginMap = {
  protocol: ProtocolPlugin;
  device: DevicePlugin;
  backend: BackendPlugin;
};

export interface PluginRegistry {
  register<K extends PluginKind>(kind: K, plugin: PluginMap[K]): void;
  get<K extends PluginKind>(kind: K, id: string): PluginMap[K] | undefined;
  list<K extends PluginKind>(kind: K): readonly PluginMap[K][];
}

export class DefaultPluginRegistry implements PluginRegistry {
  private readonly plugins: { [K in PluginKind]: Map<string, PluginMap[K]> } = {
    protocol: new Map<string, ProtocolPlugin>(),
    device: new Map<string, DevicePlugin>(),
    backend: new Map<string, BackendPlugin>(),
  };

  register<K extends PluginKind>(kind: K, plugin: PluginMap[K]): void {
    const key = 'id' in plugin ? plugin.id : plugin.name;
    this.plugins[kind].set(key, plugin);
  }

  get<K extends PluginKind>(kind: K, id: string): PluginMap[K] | undefined {
    return this.plugins[kind].get(id);
  }

  list<K extends PluginKind>(kind: K): readonly PluginMap[K][] {
    return [...this.plugins[kind].values()];
  }
}
