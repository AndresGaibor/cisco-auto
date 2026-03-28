/**
 * DEVICE CATALOG SCHEMA
 * 
 * Define la estructura para el catálogo de dispositivos de Packet Tracer.
 * Cada entrada describe un modelo específico con sus capacidades y puertos.
 */

import type { DeviceType, DeviceFamily } from '../canonical/types';

// =============================================================================
// PORT DEFINITION
// =============================================================================

export interface PortDefinition {
  /** Nombre base del puerto (ej: FastEthernet, GigabitEthernet) */
  type: string;
  
  /** Prefijo corto (ej: Fa, Gi) */
  prefix: string;
  
  /** Slot/module */
  module: number;
  
  /** Rango de puertos [inicio, fin] */
  range: [number, number];
  
  /** Velocidad en Mbps */
  speed: number;
  
  /** Soporta PoE */
  poe?: boolean;
  
  /** Tipo de interfaz física */
  connector: 'rj45' | 'sfp' | 'sfp+' | 'serial' | 'console' | 'usb';
  
  /** Soporta fibra */
  supportsFiber?: boolean;
  
  /** Soporta cobre */
  supportsCopper?: boolean;
}

// =============================================================================
// MODULE DEFINITION
// =============================================================================

export interface ModuleDefinition {
  /** Código del módulo (ej: HWIC-2T) */
  code: string;
  
  /** Nombre descriptivo */
  name: string;
  
  /** Tipo de slot */
  slotType: 'hwic' | 'wic' | 'nme' | 'sm' | 'nm' | 'pvdm';
  
  /** Puertos que añade */
  ports: PortDefinition[];
  
  /** Descripción */
  description?: string;
}

// =============================================================================
// DEVICE CAPABILITIES
// =============================================================================

export interface DeviceCapabilities {
  // Layer 2
  supportsVlans: boolean;
  maxVlans: number;
  supportsVtp: boolean;
  supportsStp: boolean;
  stpModes: ('pvst' | 'rapid-pvst' | 'mst')[];
  supportsEtherchannel: boolean;
  maxEtherchannels: number;
  supportsPortSecurity: boolean;
  
  // Layer 3
  supportsRouting: boolean;
  supportsIpv6: boolean;
  routingProtocols: ('static' | 'rip' | 'ospf' | 'eigrp' | 'bgp')[];
  
  // Security
  supportsAcl: boolean;
  maxAcls: number;
  supportsNat: boolean;
  supportsVpn: boolean;
  supportsFirewall: boolean;
  
  // Services
  supportsDhcp: boolean;
  supportsDns: boolean;
  supportsNtp: boolean;
  supportsSnmp: boolean;
  supportsSsh: boolean;
  supportsTelnet: boolean;
  supportsHttp: boolean;
  
  // Wireless
  supportsWireless: boolean;
  wirelessStandards: ('802.11a' | '802.11b' | '802.11g' | '802.11n' | '802.11ac')[];
  
  // Voice
  supportsVoice: boolean;
  supportsPoe: boolean;
  poeBudget?: number;  // Watts
  
  // QoS
  supportsQos: boolean;
  
  // Hardware
  supportsModules: boolean;
  moduleSlots: number;
  supportedModules: string[];
  
  // Management
  supportsConsole: boolean;
  supportsUsb: boolean;
  supportsSdCard: boolean;
  
  // Packet Tracer specific
  ptSupportedVersion: string;  // e.g., "7.0", "8.0"
}

// =============================================================================
// DEVICE CATALOG ENTRY
// =============================================================================

export interface DeviceCatalogEntry {
  // Identificación
  /** ID único del catálogo */
  id: string;
  
  /** Modelo específico (ej: 2960-24TT-L) */
  model: string;
  
  /** Serie (ej: Catalyst 2960) */
  series: string;
  
  /** Familia (ej: Catalyst) */
  family: string;
  
  /** Vendor */
  vendor: string;
  
  /** Tipo de dispositivo */
  type: DeviceType;
  
  /** Familia lógica */
  deviceFamily: DeviceFamily;
  
  // Configuración de puertos
  /** Puertos fijos */
  fixedPorts: PortDefinition[];
  
  /** Slots de expansión */
  moduleSlots: {
    type: string;
    count: number;
    supportedModules: string[];
  }[];
  
  // Capabilities
  capabilities: DeviceCapabilities;
  
  // Metadatos
  /** Nombre para mostrar */
  displayName: string;
  
  /** Descripción corta */
  description: string;
  
  /** Imagen/thumbnail (ruta) */
  image?: string;
  
  /** Categoría en Packet Tracer */
  ptCategory: string;
  
  /** Tags de búsqueda */
  tags: string[];
  
  /** Año de lanzamiento (aprox) */
  releaseYear?: number;
  
  /** ¿Dispositivo genérico de PT? */
  isGeneric?: boolean;
  
  /** ¿Dispositivo legacy/obsoleto? */
  isLegacy?: boolean;
}

// =============================================================================
// CATALOG QUERY
// =============================================================================

export interface CatalogQuery {
  /** Filtrar por tipo */
  type?: DeviceType | DeviceType[];
  
  /** Filtrar por familia */
  family?: DeviceFamily | DeviceFamily[];
  
  /** Filtrar por vendor */
  vendor?: string;
  
  /** Filtrar por serie */
  series?: string;
  
  /** Búsqueda de texto libre */
  search?: string;
  
  /** Filtrar por capability */
  hasCapability?: keyof DeviceCapabilities;
  
  /** Filtrar por capability value */
  capabilityValue?: boolean | number | string[];
  
  /** Filtrar por cantidad de puertos */
  minPorts?: number;
  
  /** Filtrar por soporte de módulos */
  supportsModules?: boolean;
  
  /** Tags */
  tags?: string[];
  
  /** Incluir dispositivos genéricos */
  includeGeneric?: boolean;
  
  /** Incluir dispositivos legacy */
  includeLegacy?: boolean;
}

// =============================================================================
// PORT UTILITIES
// =============================================================================

/**
 * Genera lista de puertos a partir de una definición
 */
export function generatePorts(definition: PortDefinition): string[] {
  const ports: string[] = [];
  const [start, end] = definition.range;
  
  for (let i = start; i <= end; i++) {
    ports.push(`${definition.type}${definition.module}/${i}`);
  }
  
  return ports;
}

/**
 * Obtiene la velocidad formateada
 */
export function formatSpeed(speedMbps: number): string {
  if (speedMbps >= 1000) {
    return `${speedMbps / 1000}Gbps`;
  }
  return `${speedMbps}Mbps`;
}

/**
 * Obtiene el número total de puertos
 */
export function getTotalPorts(ports: PortDefinition[]): number {
  return ports.reduce((sum, p) => {
    const [start, end] = p.range;
    return sum + (end - start + 1);
  }, 0);
}
