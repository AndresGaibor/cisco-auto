/**
 * DEVICE CATALOG SERVICE
 * 
 * Servicio principal para búsqueda y consulta del catálogo de dispositivos.
 * Proporciona API unificada para acceder a todos los catálogos.
 */

import type {
  DeviceCatalogEntry,
  CatalogQuery,
  PortDefinition
} from './schema';
import { getTotalPorts } from './schema';
import { DeviceModelVO, DeviceHardwareProfile } from './value-objects';

import routerCatalog from './routers';
import switchCatalog from './switches';
import endDeviceCatalog from './end-devices';
import { wirelessCatalog } from './wireless';
import { securityCatalog } from './security';
import { otherDeviceCatalog } from './other-devices';

import type { DeviceType, DeviceFamily } from '../canonical/types';

// =============================================================================
// COMBINED CATALOG
// =============================================================================

const allDevices: DeviceCatalogEntry[] = [
  ...routerCatalog,
  ...switchCatalog,
  ...endDeviceCatalog,
  ...wirelessCatalog,
  ...securityCatalog,
  ...otherDeviceCatalog
];

// =============================================================================
// CATALOG SERVICE
// =============================================================================

export interface DeviceCatalogConfig {
  extraDevices?: DeviceCatalogEntry[];
  skipDefaults?: boolean;
}

export class DeviceCatalog {
  private devices: Map<string, DeviceCatalogEntry>;
  private byType: Map<DeviceType, DeviceCatalogEntry[]>;
  private byFamily: Map<DeviceFamily, DeviceCatalogEntry[]>;
  private byVendor: Map<string, DeviceCatalogEntry[]>;
  
  constructor(config?: DeviceCatalogConfig) {
    this.devices = new Map();
    this.byType = new Map();
    this.byFamily = new Map();
    this.byVendor = new Map();
    
    if (!config?.skipDefaults) {
      for (const device of allDevices) {
        this.register(device);
      }
    }

    if (config?.extraDevices) {
      for (const device of config.extraDevices) {
        this.register(device);
      }
    }
  }

  /** Registra un dispositivo en el catálogo en todos los índices */
  register(device: DeviceCatalogEntry): void {
    // Por ID
    this.devices.set(device.id, device);
    
    // Por tipo
    if (!this.byType.has(device.type)) {
      this.byType.set(device.type, []);
    }
    this.byType.get(device.type)!.push(device);
    
    // Por familia
    if (!this.byFamily.has(device.deviceFamily)) {
      this.byFamily.set(device.deviceFamily, []);
    }
    this.byFamily.get(device.deviceFamily)!.push(device);
    
    // Por vendor
    const vendorKey = device.vendor.toLowerCase();
    if (!this.byVendor.has(vendorKey)) {
      this.byVendor.set(vendorKey, []);
    }
    this.byVendor.get(vendorKey)!.push(device);
  }
  
  /**
   * Obtiene un dispositivo por ID
   */
  getById(id: string): DeviceCatalogEntry | undefined {
    return this.devices.get(id);
  }
  
  /**
   * Obtiene un dispositivo por modelo
   */
  getByModel(model: string): DeviceCatalogEntry | undefined {
    return allDevices.find(d => 
      d.model.toLowerCase() === model.toLowerCase()
    );
  }

  /**
   * Obtiene el modelo como value object de dominio.
   */
  getModelVO(model: string): DeviceModelVO | undefined {
    const device = this.getByModel(model);
    return device ? DeviceModelVO.from(device) : undefined;
  }

  /**
   * Obtiene un perfil de hardware para un modelo dado.
   */
  getHardwareProfile(model: string, installedModules: { slotIndex: number; code: string; enabled?: boolean }[] = []): DeviceHardwareProfile | undefined {
    const device = this.getByModel(model);
    return device ? DeviceHardwareProfile.fromCatalogEntry(device, installedModules) : undefined;
  }
  
  /**
   * Obtiene todos los dispositivos
   */
  getAll(): DeviceCatalogEntry[] {
    return [...allDevices];
  }
  
  /**
   * Obtiene dispositivos por tipo
   */
  getByType(type: DeviceType): DeviceCatalogEntry[] {
    return this.byType.get(type) || [];
  }
  
  /**
   * Obtiene dispositivos por familia
   */
  getByFamily(family: DeviceFamily): DeviceCatalogEntry[] {
    return this.byFamily.get(family) || [];
  }
  
  /**
   * Obtiene dispositivos por vendor
   */
  getByVendor(vendor: string): DeviceCatalogEntry[] {
    return this.byVendor.get(vendor.toLowerCase()) || [];
  }

  /**
   * Permite inyectar dispositivos adicionales en runtime.
   */
  addDevices(devices: DeviceCatalogEntry[]): void {
    for (const device of devices) {
      this.register(device);
    }
  }
  
  /**
   * Búsqueda avanzada con múltiples criterios
   */
  search(query: CatalogQuery): DeviceCatalogEntry[] {
    let results = [...allDevices];
    
    // Filtrar por tipo
    if (query.type) {
      const types = Array.isArray(query.type) ? query.type : [query.type];
      results = results.filter(d => types.includes(d.type));
    }
    
    // Filtrar por familia
    if (query.family) {
      const families = Array.isArray(query.family) ? query.family : [query.family];
      results = results.filter(d => families.includes(d.deviceFamily));
    }
    
    // Filtrar por vendor
    if (query.vendor) {
      results = results.filter(d => 
        d.vendor.toLowerCase() === query.vendor!.toLowerCase()
      );
    }
    
    // Filtrar por serie
    if (query.series) {
      results = results.filter(d => 
        d.series.toLowerCase().includes(query.series!.toLowerCase())
      );
    }
    
    // Búsqueda de texto libre
    if (query.search) {
      const searchLower = query.search.toLowerCase();
      results = results.filter(d =>
        d.model.toLowerCase().includes(searchLower) ||
        d.displayName.toLowerCase().includes(searchLower) ||
        d.description.toLowerCase().includes(searchLower) ||
        d.tags.some(t => t.toLowerCase().includes(searchLower))
      );
    }
    
    // Filtrar por capability
    if (query.hasCapability && query.capabilityValue !== undefined) {
      results = results.filter(d => {
        const capabilities = d.capabilities as unknown as Record<string, unknown>;
        const capability = capabilities[query.hasCapability!];
        if (typeof capability === 'boolean') {
          return capability === query.capabilityValue;
        }
        if (typeof capability === 'number') {
          return capability >= (query.capabilityValue as number);
        }
        if (Array.isArray(capability)) {
          return (query.capabilityValue as string[]).every(v => 
            (capability as string[]).includes(v)
          );
        }
        return false;
      });
    }
    
    // Filtrar por cantidad de puertos
    if (query.minPorts) {
      results = results.filter(d => 
        getTotalPorts(d.fixedPorts) >= query.minPorts!
      );
    }
    
    // Filtrar por soporte de módulos
    if (query.supportsModules !== undefined) {
      results = results.filter(d => 
        d.capabilities.supportsModules === query.supportsModules
      );
    }
    
    // Filtrar por tags
    if (query.tags && query.tags.length > 0) {
      results = results.filter(d =>
        query.tags!.some(tag => 
          d.tags.some(t => t.toLowerCase() === tag.toLowerCase())
        )
      );
    }
    
    // Filtrar dispositivos genéricos
    if (!query.includeGeneric) {
      results = results.filter(d => !d.isGeneric);
    }
    
    // Filtrar dispositivos legacy
    if (!query.includeLegacy) {
      results = results.filter(d => !d.isLegacy);
    }
    
    return results;
  }
  
  /**
   * Obtiene dispositivos con routing
   */
  getRouters(): DeviceCatalogEntry[] {
    return this.getByType('router');
  }
  
  /**
   * Obtiene switches L2
   */
  getLayer2Switches(): DeviceCatalogEntry[] {
    return this.search({
      type: 'switch',
      hasCapability: 'supportsRouting',
      capabilityValue: false
    });
  }
  
  /**
   * Obtiene switches L3 (multilayer)
   */
  getLayer3Switches(): DeviceCatalogEntry[] {
    return this.search({
      type: 'multilayer-switch'
    });
  }
  
  /**
   * Obtiene dispositivos con PoE
   */
  getPoEDevices(): DeviceCatalogEntry[] {
    return allDevices.filter(d => d.capabilities.supportsPoe);
  }
  
  /**
   * Obtiene dispositivos wireless
   */
  getWirelessDevices(): DeviceCatalogEntry[] {
    return allDevices.filter(d => d.capabilities.supportsWireless);
  }
  
  /**
   * Obtiene firewalls/dispositivos de seguridad
   */
  getSecurityDevices(): DeviceCatalogEntry[] {
    return allDevices.filter(d => 
      d.type === 'firewall' || d.capabilities.supportsFirewall
    );
  }
  
  /**
   * Obtiene dispositivos industriales
   */
  getIndustrialDevices(): DeviceCatalogEntry[] {
    return this.search({
      family: 'infrastructure',
      tags: ['industrial']
    });
  }
  
  /**
   * Obtiene dispositivos para CCNA
   */
  getCCNADevices(): DeviceCatalogEntry[] {
    return this.search({
      tags: ['router', 'switch', 'layer2'],
      includeLegacy: true,
      includeGeneric: true
    }).filter(d => 
      d.model.includes('2960') || 
      d.model.includes('2950') ||
      d.model.includes('1941') ||
      d.model.includes('2901') ||
      d.model.includes('ISR') ||
      d.isGeneric
    );
  }
  
  /**
   * Obtiene el total de puertos de un dispositivo
   */
  getDevicePortCount(deviceId: string, installedModules: { slotIndex: number; code: string; enabled?: boolean }[] = []): number {
    const device = this.getById(deviceId);
    if (!device) return 0;

    const profile = DeviceHardwareProfile.fromCatalogEntry(device, installedModules);
    return profile.portCount;
  }
  
  /**
   * Verifica compatibilidad de dispositivos
   */
  areCompatible(device1Id: string, device2Id: string): {
    compatible: boolean;
    reasons: string[];
  } {
    const device1 = this.getById(device1Id);
    const device2 = this.getById(device2Id);
    
    const reasons: string[] = [];
    
    if (!device1 || !device2) {
      return { compatible: false, reasons: ['Device not found'] };
    }
    
    // Verificar versión de PT
    const v1 = parseFloat(device1.capabilities.ptSupportedVersion);
    const v2 = parseFloat(device2.capabilities.ptSupportedVersion);
    
    if (Math.abs(v1 - v2) > 1) {
      reasons.push(`PT version mismatch: ${device1.model} (${device1.capabilities.ptSupportedVersion}) vs ${device2.model} (${device2.capabilities.ptSupportedVersion})`);
    }
    
    // Más validaciones pueden agregarse aquí
    
    return {
      compatible: reasons.length === 0,
      reasons
    };
  }
  
  /**
   * Obtiene estadísticas del catálogo
   */
  getStats(): {
    total: number;
    byType: Record<string, number>;
    byFamily: Record<string, number>;
    byVendor: Record<string, number>;
    generic: number;
    legacy: number;
  } {
    const byType: Record<string, number> = {};
    const byFamily: Record<string, number> = {};
    const byVendor: Record<string, number> = {};
    
    Array.from(this.byType.entries()).forEach(([type, devices]) => {
      byType[type] = devices.length;
    });
    
    Array.from(this.byFamily.entries()).forEach(([family, devices]) => {
      byFamily[family] = devices.length;
    });
    
    Array.from(this.byVendor.entries()).forEach(([vendor, devices]) => {
      byVendor[vendor] = devices.length;
    });
    
    return {
      total: allDevices.length,
      byType,
      byFamily,
      byVendor,
      generic: allDevices.filter(d => d.isGeneric).length,
      legacy: allDevices.filter(d => d.isLegacy).length
    };
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let defaultCatalog: DeviceCatalog | null = null;

export function getDefaultCatalog(): DeviceCatalog {
  if (!defaultCatalog) {
    defaultCatalog = new DeviceCatalog();
  }
  return defaultCatalog;
}

export function resetDefaultCatalog(): void {
  defaultCatalog = null;
}

export const deviceCatalog = getDefaultCatalog();

export default deviceCatalog;
