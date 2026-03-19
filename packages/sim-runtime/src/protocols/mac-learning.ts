/**
 * MAC Learning (IEEE 802.1D Bridge)
 * 
 * Gestión de tabla MAC, aprendizaje y aging de direcciones.
 * 
 * @module protocols/mac-learning
 */

import type { SimEngine } from '@cisco-auto/sim-engine';
import { NetworkEventType, createTimerEvent } from '@cisco-auto/sim-engine';
import type { MACEntry, DeviceRuntime, InterfaceRuntime } from '../runtime';
import { normalizeMAC, isBroadcastMAC, isValidMAC } from './ethernet';

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Tiempo de aging por defecto (300 segundos = 5 minutos)
 */
export const DEFAULT_AGING_TIME = 300;

/**
 * Tiempo mínimo de aging (10 segundos)
 */
export const MIN_AGING_TIME = 10;

/**
 * Tiempo máximo de aging (1000000 segundos)
 */
export const MAX_AGING_TIME = 1000000;

/**
 * Tamaño máximo de tabla MAC por defecto
 */
export const DEFAULT_MAC_TABLE_SIZE = 8192;

/**
 * Tipos de entrada MAC
 */
export const MAC_ENTRY_TYPE = {
  /** Aprendida dinámicamente */
  DYNAMIC: 'dynamic',
  /** Configurada estáticamente */
  STATIC: 'static',
  /** Secure MAC (port security) */
  SECURE: 'secure',
  /** Sticky (aprendida pero guardada como estática) */
  STICKY: 'sticky'
} as const;

// =============================================================================
// TYPES
// =============================================================================

/**
 * Configuración de MAC learning
 */
export interface MACLearningConfig {
  /** Tiempo de aging en segundos (sim time units) */
  agingTime: number;
  
  /** Tamaño máximo de la tabla MAC */
  maxTableSize: number;
  
  /** ¿Habilitar MAC learning? */
  learningEnabled: boolean;
  
  /** Puerto donde deshabilitar learning */
  learningDisabledPorts: Set<string>;
}

/**
 * Resultado de lookup de MAC
 */
export interface MACLookupResult {
  /** ¿Se encontró la entrada? */
  found: boolean;
  
  /** Puerto asociado */
  port?: string;
  
  /** VLAN */
  vlan?: number;
  
  /** Tipo de entrada */
  type?: 'dynamic' | 'static' | 'secure' | 'sticky';
  
  /** Edad de la entrada (en time units) */
  age?: number;
  
  /** ¿Está expirada? */
  expired?: boolean;
}

/**
 * Resultado de aprendizaje de MAC
 */
export interface MACLearnResult {
  /** ¿Se aprendió exitosamente? */
  learned: boolean;
  
  /** ¿Era una entrada nueva? */
  isNew: boolean;
  
  /** ¿Se actualizó el puerto? */
  portChanged: boolean;
  
  /** Puerto anterior (si cambió) */
  previousPort?: string;
  
  /** Motivo del resultado */
  reason: string;
}

/**
 * Entrada expandida con información adicional
 */
export interface MACEntryExtended extends MACEntry {
  /** Tipo de entrada */
  type: 'dynamic' | 'static' | 'secure' | 'sticky';
  
  /** Última vez que se vio */
  lastSeen: number;
  
  /** Contador de referencias */
  hitCount: number;
}

/**
 * Evento de MAC aging
 */
export interface MACAgingEvent {
  /** MAC que expiró */
  mac: string;
  
  /** VLAN */
  vlan: number;
  
  /** Puerto donde estaba */
  port: string;
  
  /** Tiempo que duró en la tabla */
  lifetime: number;
}

// =============================================================================
// MAC LEARNING ENGINE
// =============================================================================

/**
 * Motor de MAC learning
 */
export class MACLearningEngine {
  private config: MACLearningConfig;
  private agingTimers: Map<string, string>; // key -> timerId
  
  constructor(config: Partial<MACLearningConfig> = {}) {
    this.config = {
      agingTime: config.agingTime ?? DEFAULT_AGING_TIME,
      maxTableSize: config.maxTableSize ?? DEFAULT_MAC_TABLE_SIZE,
      learningEnabled: config.learningEnabled ?? true,
      learningDisabledPorts: config.learningDisabledPorts ?? new Set()
    };
    this.agingTimers = new Map();
  }
  
  /**
   * Obtiene la configuración actual
   */
  getConfig(): Readonly<MACLearningConfig> {
    return { ...this.config };
  }
  
  /**
   * Actualiza la configuración
   */
  updateConfig(updates: Partial<MACLearningConfig>): void {
    if (updates.agingTime !== undefined) {
      this.config.agingTime = Math.max(
        MIN_AGING_TIME,
        Math.min(MAX_AGING_TIME, updates.agingTime)
      );
    }
    if (updates.maxTableSize !== undefined) {
      this.config.maxTableSize = updates.maxTableSize;
    }
    if (updates.learningEnabled !== undefined) {
      this.config.learningEnabled = updates.learningEnabled;
    }
    if (updates.learningDisabledPorts !== undefined) {
      this.config.learningDisabledPorts = updates.learningDisabledPorts;
    }
  }
  
  /**
   * Aprende una dirección MAC
   * @param device - Estado del dispositivo
   * @param mac - Dirección MAC a aprender
   * @param port - Puerto donde se aprendió
   * @param vlan - VLAN de la MAC
   * @param now - Tiempo actual de simulación
   */
  learn(
    device: DeviceRuntime,
    mac: string,
    port: string,
    vlan: number,
    now: number
  ): MACLearnResult {
    // Verificar que learning está habilitado
    if (!this.config.learningEnabled) {
      return {
        learned: false,
        isNew: false,
        portChanged: false,
        reason: 'MAC learning is disabled globally'
      };
    }
    
    // Verificar que el puerto permite learning
    if (this.config.learningDisabledPorts.has(port)) {
      return {
        learned: false,
        isNew: false,
        portChanged: false,
        reason: `MAC learning is disabled on port ${port}`
      };
    }
    
    // No aprender MACs inválidas o broadcast
    // Primero validar formato, luego verificar si es broadcast
    if (!isValidMAC(mac)) {
      return {
        learned: false,
        isNew: false,
        portChanged: false,
        reason: 'Cannot learn invalid MAC'
      };
    }
    
    if (isBroadcastMAC(mac)) {
      return {
        learned: false,
        isNew: false,
        portChanged: false,
        reason: 'Cannot learn broadcast MAC'
      };
    }
    
    // Normalizar MAC
    const normalizedMAC = normalizeMAC(mac);
    const key = `${vlan}:${normalizedMAC}`;
    
    // Verificar si ya existe
    const existing = device.macTable.get(key);
    
    if (existing) {
      // Entrada existente - verificar si es estática
      if (existing.static) {
        return {
          learned: false,
          isNew: false,
          portChanged: false,
          reason: 'MAC entry is static, cannot update'
        };
      }
      
      // Actualizar si cambió el puerto
      const portChanged = existing.port !== port;
      const previousPort = existing.port;
      
      existing.port = port;
      existing.learnedAt = now;
      
      return {
        learned: true,
        isNew: false,
        portChanged,
        previousPort: portChanged ? previousPort : undefined,
        reason: portChanged 
          ? `MAC moved from ${previousPort} to ${port}`
          : 'MAC entry refreshed'
      };
    }
    
    // Nueva entrada - verificar capacidad
    const dynamicEntries = this.countDynamicEntries(device);
    if (dynamicEntries >= this.config.maxTableSize) {
      // Necesitamos hacer espacio
      this.evictOldest(device);
    }
    
    // Crear nueva entrada
    const entry: MACEntry = {
      mac: normalizedMAC,
      vlan,
      port,
      learnedAt: now,
      static: false
    };
    
    device.macTable.set(key, entry);
    
    return {
      learned: true,
      isNew: true,
      portChanged: false,
      reason: `New MAC learned on port ${port}`
    };
  }
  
  /**
   * Busca una dirección MAC en la tabla
   * @param device - Estado del dispositivo
   * @param mac - Dirección MAC a buscar
   * @param vlan - VLAN de la MAC
   * @param now - Tiempo actual (para verificar aging)
   */
  lookup(
    device: DeviceRuntime,
    mac: string,
    vlan: number,
    now: number
  ): MACLookupResult {
    const normalizedMAC = normalizeMAC(mac);
    const key = `${vlan}:${normalizedMAC}`;
    
    const entry = device.macTable.get(key);
    
    if (!entry) {
      return {
        found: false,
        reason: 'MAC not found in table'
      } as MACLookupResult;
    }
    
    const age = now - entry.learnedAt;
    const isExpired = !entry.static && age > this.config.agingTime;
    
    return {
      found: true,
      port: entry.port,
      vlan: entry.vlan,
      type: entry.static ? 'static' : 'dynamic',
      age,
      // Solo incluir 'expired' para entradas dinámicas
      ...(entry.static ? {} : { expired: isExpired })
    };
  }
  
  /**
   * Elimina una entrada MAC
   */
  remove(
    device: DeviceRuntime,
    mac: string,
    vlan: number
  ): boolean {
    const key = `${vlan}:${normalizeMAC(mac)}`;
    return device.macTable.delete(key);
  }
  
  /**
   * Elimina todas las entradas de un puerto
   */
  removeByPort(device: DeviceRuntime, port: string): number {
    let removed = 0;
    
    for (const [key, entry] of device.macTable) {
      if (entry.port === port && !entry.static) {
        device.macTable.delete(key);
        removed++;
      }
    }
    
    return removed;
  }
  
  /**
   * Elimina entradas expiradas
   */
  ageOut(device: DeviceRuntime, now: number): MACAgingEvent[] {
    const aged: MACAgingEvent[] = [];
    
    for (const [key, entry] of device.macTable) {
      if (entry.static) continue;
      
      const age = now - entry.learnedAt;
      if (age > this.config.agingTime) {
        aged.push({
          mac: entry.mac,
          vlan: entry.vlan,
          port: entry.port,
          lifetime: age
        });
        
        device.macTable.delete(key);
      }
    }
    
    return aged;
  }
  
  /**
   * Limpia la tabla MAC completa
   */
  clear(device: DeviceRuntime, includeStatic: boolean = false): number {
    if (includeStatic) {
      const size = device.macTable.size;
      device.macTable.clear();
      return size;
    }
    
    let removed = 0;
    for (const [key, entry] of device.macTable) {
      if (!entry.static) {
        device.macTable.delete(key);
        removed++;
      }
    }
    return removed;
  }
  
  /**
   * Añade una entrada estática
   */
  addStatic(
    device: DeviceRuntime,
    mac: string,
    port: string,
    vlan: number,
    now: number
  ): boolean {
    const normalizedMAC = normalizeMAC(mac);
    const key = `${vlan}:${normalizedMAC}`;
    
    const entry: MACEntry = {
      mac: normalizedMAC,
      vlan,
      port,
      learnedAt: now,
      static: true
    };
    
    device.macTable.set(key, entry);
    return true;
  }
  
  /**
   * Obtiene estadísticas de la tabla MAC
   */
  getStats(device: DeviceRuntime): {
    total: number;
    dynamic: number;
    static: number;
    byVlan: Map<number, number>;
    byPort: Map<string, number>;
  } {
    const stats = {
      total: device.macTable.size,
      dynamic: 0,
      static: 0,
      byVlan: new Map<number, number>(),
      byPort: new Map<string, number>()
    };
    
    for (const entry of device.macTable.values()) {
      if (entry.static) {
        stats.static++;
      } else {
        stats.dynamic++;
      }
      
      stats.byVlan.set(entry.vlan, (stats.byVlan.get(entry.vlan) ?? 0) + 1);
      stats.byPort.set(entry.port, (stats.byPort.get(entry.port) ?? 0) + 1);
    }
    
    return stats;
  }
  
  // === Private Methods ===
  
  private countDynamicEntries(device: DeviceRuntime): number {
    let count = 0;
    for (const entry of device.macTable.values()) {
      if (!entry.static) count++;
    }
    return count;
  }
  
  private evictOldest(device: DeviceRuntime): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    
    for (const [key, entry] of device.macTable) {
      if (!entry.static && entry.learnedAt < oldestTime) {
        oldestTime = entry.learnedAt;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      device.macTable.delete(oldestKey);
    }
  }
}

// =============================================================================
// FORWARDING DECISION
// =============================================================================

/**
 * Resultado de decisión de forwarding
 */
export interface ForwardingDecision {
  /** Acción a tomar */
  action: 'forward' | 'flood' | 'drop' | 'process-locally';
  
  /** Puertos de salida */
  outPorts: string[];
  
  /** Razón de la decisión */
  reason: string;
  
  /** VLAN de salida */
  outVlan: number;
}

/**
 * Toma una decisión de forwarding para un frame
 */
export function makeForwardingDecision(
  device: DeviceRuntime,
  srcMAC: string,
  dstMAC: string,
  inPort: string,
  vlan: number,
  macEngine: MACLearningEngine,
  now: number,
  interfaces: Map<string, InterfaceRuntime>
): ForwardingDecision {
  // Verificar MAC destino reservada (01:80:c2:00:00:0x)
  if (isReservedMAC(dstMAC)) {
    return {
      action: 'process-locally',
      outPorts: [],
      reason: 'Reserved MAC address for bridge protocol',
      outVlan: vlan
    };
  }
  
  // Broadcast
  if (isBroadcastMAC(dstMAC)) {
    return {
      action: 'flood',
      outPorts: getFloodPorts(vlan, interfaces, inPort),
      reason: 'Broadcast MAC - flooding',
      outVlan: vlan
    };
  }
  
  // Lookup MAC
  const lookup = macEngine.lookup(device, dstMAC, vlan, now);
  
  if (!lookup.found || lookup.expired) {
    // Unknown unicast - flood
    return {
      action: 'flood',
      outPorts: getFloodPorts(vlan, interfaces, inPort),
      reason: lookup.expired 
        ? 'MAC entry expired - flooding' 
        : 'Unknown unicast MAC - flooding',
      outVlan: vlan
    };
  }
  
  // Known MAC - verificar que no sea el mismo puerto
  if (lookup.port === inPort) {
    return {
      action: 'drop',
      outPorts: [],
      reason: 'Destination on same port as source',
      outVlan: vlan
    };
  }
  
  // Unicast forwarding
  return {
    action: 'forward',
    outPorts: [lookup.port!],
    reason: `Known unicast - forwarding to ${lookup.port}`,
    outVlan: vlan
  };
}

/**
 * Verifica si una MAC está reservada para protocolos de bridge
 */
function isReservedMAC(mac: string): boolean {
  const bytes = macToBytes(mac);
  return bytes[0] === 0x01 && bytes[1] === 0x80 && bytes[2] === 0xc2;
}

/**
 * Convierte MAC a bytes
 */
function macToBytes(mac: string): Uint8Array {
  const normalized = mac.toLowerCase().replace(/[-:.]/g, '');
  const bytes = new Uint8Array(6);
  for (let i = 0; i < 6; i++) {
    bytes[i] = parseInt(normalized.substr(i * 2, 2), 16);
  }
  return bytes;
}

/**
 * Obtiene puertos para flooding (excluyendo puerto de entrada)
 */
function getFloodPorts(
  vlan: number,
  interfaces: Map<string, InterfaceRuntime>,
  inPort: string
): string[] {
  const ports: string[] = [];
  
  for (const [portName, iface] of interfaces) {
    if (portName === inPort) continue;
    if (iface.adminStatus !== 'up') continue;
    if (iface.linkStatus !== 'up') continue;
    
    // Verificar membership de VLAN
    if (iface.switchportMode === 'access') {
      if (iface.vlan === vlan) {
        ports.push(portName);
      }
    } else if (iface.switchportMode === 'trunk') {
      if (iface.allowedVlans?.includes(vlan) || iface.nativeVlan === vlan) {
        ports.push(portName);
      }
    }
  }
  
  return ports;
}

// =============================================================================
// HELPER FUNCTIONS FOR FORWARDING
// =============================================================================
