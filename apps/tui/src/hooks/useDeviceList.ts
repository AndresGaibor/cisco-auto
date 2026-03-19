/**
 * @cisco-auto/tui
 * 
 * Hook para obtener y filtrar la lista de dispositivos del simulador.
 */

import { useMemo } from 'react';
import { useSimulator } from './useSimulator';
import type { DeviceRuntime } from '@cisco-auto/sim-runtime';
import type { DeviceType, DeviceFamily } from '@cisco-auto/lab-model';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Opciones de filtrado para la lista de dispositivos
 */
export interface DeviceFilterOptions {
  /** Filtrar por tipo de dispositivo */
  type?: DeviceType | DeviceType[];
  
  /** Filtrar por familia de dispositivo */
  family?: DeviceFamily | DeviceFamily[];
  
  /** Filtrar por estado de power */
  powerOn?: boolean;
  
  /** Filtrar por nombre (búsqueda parcial) */
  nameContains?: string;
  
  /** Solo dispositivos con interfaces up */
  hasActiveLinks?: boolean;
  
  /** Solo dispositivos seleccionados */
  selected?: boolean;
}

/**
 * Información extendida del dispositivo para visualización
 */
export interface DeviceListItem extends DeviceRuntime {
  /** Número de interfaces activas */
  activeInterfaces: number;
  
  /** Número total de interfaces */
  totalInterfaces: number;
  
  /** ¿Tiene configuración IP? */
  hasIPConfig: boolean;
  
  /** Tipo resumido para display */
  displayType: string;
  
  /** Ícono para visualización */
  icon: string;
}

/**
 * Retorno del hook useDeviceList
 */
export interface UseDeviceListReturn {
  /** Lista completa de dispositivos */
  devices: DeviceListItem[];
  
  /** Lista filtrada según opciones */
  filteredDevices: DeviceListItem[];
  
  /** Dispositivo actualmente seleccionado */
  selectedDevice: DeviceListItem | null;
  
  /** Conteo por tipo */
  countByType: Record<string, number>;
  
  /** Conteo por familia */
  countByFamily: Record<string, number>;
  
  /** Total de dispositivos */
  total: number;
  
  /** Total de dispositivos activos (powerOn) */
  activeCount: number;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Obtiene el ícono para un tipo de dispositivo
 */
function getDeviceIcon(type: DeviceType): string {
  const icons: Record<DeviceType, string> = {
    'router': '🌐',
    'switch': '🔌',
    'multilayer-switch': '🔀',
    'hub': '◉',
    'access-point': '📡',
    'wireless-router': '📶',
    'firewall': '🛡️',
    'cloud': '☁️',
    'modem': '📠',
    'pc': '💻',
    'laptop': '📒',
    'server': '🖥️',
    'printer': '🖨️',
    'ip-phone': '📞',
    'tablet': '📱',
    'smartphone': '📱',
    'tv': '📺',
    'home-gateway': '🏠',
    'sensor': '📡',
    'actuator': '⚙️',
    'mcu': '🔧',
    'repeater': '🔁',
    'sniffer': '🔍',
    'unknown': '❓'
  };
  
  return icons[type] || '❓';
}

/**
 * Obtiene un tipo resumido para display
 */
function getDisplayType(type: DeviceType): string {
  const displayTypes: Record<DeviceType, string> = {
    'router': 'Router',
    'switch': 'Switch',
    'multilayer-switch': 'L3 Switch',
    'hub': 'Hub',
    'access-point': 'AP',
    'wireless-router': 'WiFi Router',
    'firewall': 'Firewall',
    'cloud': 'Cloud',
    'modem': 'Modem',
    'pc': 'PC',
    'laptop': 'Laptop',
    'server': 'Server',
    'printer': 'Printer',
    'ip-phone': 'IP Phone',
    'tablet': 'Tablet',
    'smartphone': 'Phone',
    'tv': 'TV',
    'home-gateway': 'Gateway',
    'sensor': 'Sensor',
    'actuator': 'Actuator',
    'mcu': 'MCU',
    'repeater': 'Repeater',
    'sniffer': 'Sniffer',
    'unknown': 'Unknown'
  };
  
  return displayTypes[type] || type;
}

/**
 * Convierte DeviceRuntime a DeviceListItem
 */
function toDeviceListItem(device: DeviceRuntime): DeviceListItem {
  const interfaces = Array.from(device.interfaces.values());
  const activeInterfaces = interfaces.filter(i => 
    i.adminStatus === 'up' && i.linkStatus === 'up'
  ).length;
  
  const hasIPConfig = interfaces.some(i => i.ip && i.ip.length > 0);
  
  return {
    ...device,
    activeInterfaces,
    totalInterfaces: interfaces.length,
    hasIPConfig,
    displayType: getDisplayType(device.type),
    icon: getDeviceIcon(device.type)
  };
}

/**
 * Aplica filtros a la lista de dispositivos
 */
function applyFilters(
  devices: DeviceListItem[],
  filters: DeviceFilterOptions,
  selectedDeviceId: string | null
): DeviceListItem[] {
  return devices.filter(device => {
    // Filtro por tipo
    if (filters.type) {
      const types = Array.isArray(filters.type) ? filters.type : [filters.type];
      if (!types.includes(device.type)) return false;
    }
    
    // Filtro por familia
    if (filters.family) {
      const families = Array.isArray(filters.family) ? filters.family : [filters.family];
      if (!families.includes(device.family)) return false;
    }
    
    // Filtro por power
    if (filters.powerOn !== undefined && device.powerOn !== filters.powerOn) {
      return false;
    }
    
    // Filtro por nombre
    if (filters.nameContains) {
      const search = filters.nameContains.toLowerCase();
      if (!device.name.toLowerCase().includes(search)) return false;
    }
    
    // Filtro por interfaces activas
    if (filters.hasActiveLinks && device.activeInterfaces === 0) {
      return false;
    }
    
    // Filtro por selección
    if (filters.selected && device.id !== selectedDeviceId) {
      return false;
    }
    
    return true;
  });
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

/**
 * Hook para obtener y filtrar la lista de dispositivos
 * 
 * @param filters - Opciones de filtrado
 * @returns Lista de dispositivos y utilidades de conteo
 * 
 * @example
 * ```tsx
 * function DeviceList() {
 *   const { devices, countByType, activeCount } = useDeviceList({ 
 *     family: 'infrastructure' 
 *   });
 *   
 *   return (
 *     <Box flexDirection="column">
 *       <Text>Active: {activeCount}/{devices.length}</Text>
 *       {devices.map(d => (
 *         <Text key={d.id}>{d.icon} {d.name}</Text>
 *       ))}
 *     </Box>
 *   );
 * }
 * ```
 */
export function useDeviceList(filters: DeviceFilterOptions = {}): UseDeviceListReturn {
  const { getDevices, selectedDevice } = useSimulator();
  
  // Obtener y enriquecer dispositivos
  const devices = useMemo(() => {
    const rawDevices = getDevices();
    return rawDevices.map(toDeviceListItem);
  }, [getDevices]);
  
  // Aplicar filtros
  const filteredDevices = useMemo(() => {
    return applyFilters(devices, filters, selectedDevice);
  }, [devices, filters, selectedDevice]);
  
  // Dispositivo seleccionado
  const selectedDeviceItem = useMemo(() => {
    if (!selectedDevice) return null;
    return devices.find(d => d.id === selectedDevice) ?? null;
  }, [devices, selectedDevice]);
  
  // Conteos
  const countByType = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const device of devices) {
      counts[device.type] = (counts[device.type] ?? 0) + 1;
    }
    return counts;
  }, [devices]);
  
  const countByFamily = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const device of devices) {
      counts[device.family] = (counts[device.family] ?? 0) + 1;
    }
    return counts;
  }, [devices]);
  
  const activeCount = useMemo(() => {
    return devices.filter(d => d.powerOn).length;
  }, [devices]);
  
  return {
    devices,
    filteredDevices,
    selectedDevice: selectedDeviceItem,
    countByType,
    countByFamily,
    total: devices.length,
    activeCount
  };
}

export default useDeviceList;
