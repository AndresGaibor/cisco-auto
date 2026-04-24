import type { BackendPlugin } from './backend.plugin.js';
import type { DevicePlugin } from './device.plugin.js';
import type { ProtocolPlugin } from './protocol.plugin.js';

/**
 * Categorías de plugin disponibles en el sistema.
 * Cada plugin pertenece a una categoría que determina su rol.
 */
export type PluginKind = 'protocol' | 'device' | 'backend';

/**
 * Mapa de plugins por categoría.
 * Cada categoría contiene plugins identificados por su id/name.
 */
type PluginMap = {
  protocol: ProtocolPlugin;
  device: DevicePlugin;
  backend: BackendPlugin;
};

/**
 * Interface para el registro de plugins del sistema.
 * Permite registrar, consultar y listar plugins por categoría.
 */
export interface PluginRegistry {
  /**
   * Registra un plugin en una categoría específica.
   * Si ya existe un plugin con el mismo id/name, lo sobrescribe.
   * 
   * @param kind - Categoría del plugin
   * @param plugin - Instancia del plugin a registrar
   */
  register<K extends PluginKind>(kind: K, plugin: PluginMap[K]): void;
  
  /**
   * Obtiene un plugin por categoría e id.
   * 
   * @param kind - Categoría del plugin
   * @param id - Identificador único del plugin
   * @returns El plugin si existe, undefined si no
   */
  get<K extends PluginKind>(kind: K, id: string): PluginMap[K] | undefined;
  
  /**
   * Lista todos los plugins de una categoría.
   * 
   * @param kind - Categoría de plugins a listar
   * @returns Array readonly de plugins de esa categoría
   */
  list<K extends PluginKind>(kind: K): readonly PluginMap[K][];
}

/**
 * Implementación por defecto del registro de plugins.
 * Usa Map interno para organizar plugins por categoría.
 */
export class DefaultPluginRegistry implements PluginRegistry {
  private readonly plugins: { [K in PluginKind]: Map<string, PluginMap[K]> } = {
    protocol: new Map<string, ProtocolPlugin>(),
    device: new Map<string, DevicePlugin>(),
    backend: new Map<string, BackendPlugin>(),
  };

  /**
   * Registra un plugin. Extrae el key del plugin usando 'id' o 'name'.
   */
  register<K extends PluginKind>(kind: K, plugin: PluginMap[K]): void {
    const key = 'id' in plugin ? plugin.id : plugin.name;
    this.plugins[kind].set(key, plugin);
  }

  /**
   * Obtiene plugin por categoría e id.
   */
  get<K extends PluginKind>(kind: K, id: string): PluginMap[K] | undefined {
    return this.plugins[kind].get(id);
  }

  /**
   * Lista todos los plugins de una categoría.
   */
  list<K extends PluginKind>(kind: K): readonly PluginMap[K][] {
    return [...this.plugins[kind].values()];
  }
}
