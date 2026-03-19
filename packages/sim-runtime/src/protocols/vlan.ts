/**
 * Protocolo VLAN (IEEE 802.1Q)
 * 
 * Manejo de VLAN tagging, trunk/access ports y pertenencia a VLAN.
 * 
 * @module protocols/vlan
 */

import type { VLANTag } from './ethernet';
import type { InterfaceRuntime } from '../runtime';

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * VLAN IDs reservados
 */
export const VLAN_RESERVED = {
  /** VLAN por defecto */
  DEFAULT: 1,
  /** VLAN 0 (priority tagging only) */
  PRIORITY_ONLY: 0,
  /** Rango de VLANs normales */
  NORMAL_RANGE_MIN: 1,
  NORMAL_RANGE_MAX: 1005,
  /** Rango extendido */
  EXTENDED_RANGE_MIN: 1006,
  EXTENDED_RANGE_MAX: 4094,
  /** VLAN reservada (no usada) */
  RESERVED_MIN: 1002,
  RESERVED_MAX: 1005,
  /** VLANs 1002-1005 son reservadas para Token Ring, FDDI */
  TOKEN_RING: 1002,
  FDDI_DEFAULT: 1003,
  TOKEN_RING_DEFAULT: 1004,
  FDDI_NET: 1005,
  /** VLAN 4095 es reservada en implementaciones */
  MAX_PLUS_ONE: 4095
} as const;

/**
 * Valores de Priority Code Point (PCP)
 * Para QoS/CoS
 */
export const PCP_VALUES = {
  /** Best Effort (default) */
  BEST_EFFORT: 0,
  /** Background */
  BACKGROUND: 1,
  /** Excellent Effort */
  EXCELLENT_EFFORT: 2,
  /** Critical Applications */
  CRITICAL_APPLICATIONS: 3,
  /** Video */
  VIDEO: 4,
  /** Voice */
  VOICE: 5,
  /** Internetwork Control */
  INTERNETWORK_CONTROL: 6,
  /** Network Control */
  NETWORK_CONTROL: 7
} as const;

/**
 * Nombres de prioridad PCP
 */
export const PCP_NAMES: Record<number, string> = {
  [PCP_VALUES.BEST_EFFORT]: 'Best Effort',
  [PCP_VALUES.BACKGROUND]: 'Background',
  [PCP_VALUES.EXCELLENT_EFFORT]: 'Excellent Effort',
  [PCP_VALUES.CRITICAL_APPLICATIONS]: 'Critical Applications',
  [PCP_VALUES.VIDEO]: 'Video',
  [PCP_VALUES.VOICE]: 'Voice',
  [PCP_VALUES.INTERNETWORK_CONTROL]: 'Internetwork Control',
  [PCP_VALUES.NETWORK_CONTROL]: 'Network Control'
};

// =============================================================================
// TYPES
// =============================================================================

/**
 * Configuración de puerto switch
 */
export interface SwitchportConfig {
  /** Modo del puerto */
  mode: 'access' | 'trunk' | 'dynamic' | 'none';
  
  /** VLAN de access (solo para modo access) */
  accessVlan: number;
  
  /** VLAN nativa (solo para trunk) */
  nativeVlan: number;
  
  /** VLANs permitidas en trunk */
  allowedVlans: number[];
  
  /** VLANs de voice */
  voiceVlan?: number;
  
  /** ¿Permitir tráfico sin tag en trunk? */
  nativeVlanTagging: boolean;
}

/**
 * Definición de VLAN
 */
export interface VLANDefinition {
  /** ID de VLAN */
  id: number;
  
  /** Nombre de VLAN */
  name: string;
  
  /** Estado */
  status: 'active' | 'suspended' | 'shutdown';
  
  /** MTU */
  mtu: number;
  
  /** Tipo */
  type: 'ethernet' | 'fddi' | 'token-ring' | 'fddi-net';
  
  /** ¿Es VLAN por defecto? */
  isDefault?: boolean;
}

/**
 * Resultado de verificación de VLAN membership
 */
export interface VLANMembershipResult {
  /** ¿El frame puede pasar? */
  allowed: boolean;
  
  /** Razón del resultado */
  reason: string;
  
  /** VLAN de salida (puede ser diferente si es native) */
  outputVlan?: number;
  
  /** ¿Debe removerse el tag? */
  untagged?: boolean;
}

// =============================================================================
// VLAN TAG UTILITIES
// =============================================================================

/**
 * Crea un VLAN tag
 */
export function createVLANTag(
  vid: number,
  options: {
    pcp?: number;
    dei?: boolean;
  } = {}
): VLANTag {
  if (!isValidVLAN(vid)) {
    throw new Error(`Invalid VLAN ID: ${vid} (must be 0-4094)`);
  }
  
  return {
    vid,
    pcp: options.pcp ?? PCP_VALUES.BEST_EFFORT,
    dei: options.dei ?? false
  };
}

/**
 * Verifica si un VLAN ID es válido
 */
export function isValidVLAN(vid: number): boolean {
  return Number.isInteger(vid) && vid >= 0 && vid <= 4094;
}

/**
 * Verifica si una VLAN está en el rango normal (1-1005)
 */
export function isNormalRangeVLAN(vid: number): boolean {
  return vid >= VLAN_RESERVED.NORMAL_RANGE_MIN && vid <= VLAN_RESERVED.NORMAL_RANGE_MAX;
}

/**
 * Verifica si una VLAN está en el rango extendido (1006-4094)
 */
export function isExtendedRangeVLAN(vid: number): boolean {
  return vid >= VLAN_RESERVED.EXTENDED_RANGE_MIN && vid <= VLAN_RESERVED.EXTENDED_RANGE_MAX;
}

/**
 * Verifica si una VLAN es reservada (1002-1005)
 */
export function isReservedVLAN(vid: number): boolean {
  return vid >= VLAN_RESERVED.RESERVED_MIN && vid <= VLAN_RESERVED.RESERVED_MAX;
}

/**
 * Parsea una lista de VLANs desde string
 * Soporta: "1,2,3-10,20" -> [1,2,3,4,5,6,7,8,9,10,20]
 */
export function parseVLANList(str: string): number[] {
  const vlans: number[] = [];
  const parts = str.split(',').map(s => s.trim());
  
  for (const part of parts) {
    if (part.includes('-')) {
      const [start, end] = part.split('-').map(s => parseInt(s.trim(), 10));
      for (let i = start; i <= end; i++) {
        if (isValidVLAN(i)) {
          vlans.push(i);
        }
      }
    } else {
      const vlan = parseInt(part, 10);
      if (isValidVLAN(vlan)) {
        vlans.push(vlan);
      }
    }
  }
  
  return [...new Set(vlans)].sort((a, b) => a - b);
}

/**
 * Convierte una lista de VLANs a string
 */
export function vlanListToString(vlans: number[]): string {
  if (vlans.length === 0) return '';
  if (vlans.length === 1) return vlans[0].toString();
  
  const sorted = [...vlans].sort((a, b) => a - b);
  const ranges: string[] = [];
  let start = sorted[0];
  let end = sorted[0];
  
  for (let i = 1; i <= sorted.length; i++) {
    if (i < sorted.length && sorted[i] === end + 1) {
      end = sorted[i];
    } else {
      if (start === end) {
        ranges.push(start.toString());
      } else {
        ranges.push(`${start}-${end}`);
      }
      if (i < sorted.length) {
        start = end = sorted[i];
      }
    }
  }
  
  return ranges.join(',');
}

// =============================================================================
// SWITCHPORT CONFIG UTILITIES
// =============================================================================

/**
 * Crea configuración por defecto para puerto access
 */
export function createAccessConfig(accessVlan: number = 1): SwitchportConfig {
  return {
    mode: 'access',
    accessVlan,
    nativeVlan: 1,
    allowedVlans: [accessVlan],
    nativeVlanTagging: false
  };
}

/**
 * Crea configuración por defecto para puerto trunk
 */
export function createTrunkConfig(
  nativeVlan: number = 1,
  allowedVlans: number[] | 'all' = 'all'
): SwitchportConfig {
  const actualAllowedVlans = allowedVlans === 'all'
    ? Array.from({ length: 4094 }, (_, i) => i + 1)
    : allowedVlans;
  
  return {
    mode: 'trunk',
    accessVlan: 1,
    nativeVlan,
    allowedVlans: actualAllowedVlans,
    nativeVlanTagging: false
  };
}

/**
 * Convierte InterfaceRuntime a SwitchportConfig
 */
export function getSwitchportConfig(iface: InterfaceRuntime): SwitchportConfig {
  return {
    mode: iface.switchportMode,
    accessVlan: iface.vlan,
    nativeVlan: iface.nativeVlan ?? 1,
    allowedVlans: iface.allowedVlans ?? [],
    nativeVlanTagging: false
  };
}

// =============================================================================
// VLAN MEMBERSHIP CHECKING
// =============================================================================

/**
 * Verifica si un frame puede ser procesado en un puerto de entrada
 * @returns Resultado con información sobre cómo manejar el frame
 */
export function checkIngressVLAN(
  frameVlan: number | undefined,
  portConfig: SwitchportConfig
): VLANMembershipResult {
  const { mode, accessVlan, nativeVlan, allowedVlans } = portConfig;
  
  switch (mode) {
    case 'access':
      // Puerto access: solo acepta untagged frames
      // Los tagged frames se descartan (a menos que voice VLAN)
      if (frameVlan === undefined) {
        // Untagged frame - asignar a access VLAN
        return {
          allowed: true,
          reason: 'Untagged frame assigned to access VLAN',
          outputVlan: accessVlan,
          untagged: false
        };
      } else if (frameVlan === accessVlan) {
        // Tagged frame con access VLAN - algunos switches lo permiten
        return {
          allowed: true,
          reason: 'Tagged frame with access VLAN',
          outputVlan: accessVlan,
          untagged: false
        };
      } else {
        return {
          allowed: false,
          reason: `Access port: received tagged frame with VLAN ${frameVlan}, expected untagged or VLAN ${accessVlan}`
        };
      }
    
    case 'trunk':
      // Puerto trunk: acepta tagged frames de VLANs permitidas
      // y untagged frames que se asignan a native VLAN
      if (frameVlan === undefined) {
        // Untagged frame - asignar a native VLAN
        return {
          allowed: true,
          reason: 'Untagged frame assigned to native VLAN',
          outputVlan: nativeVlan,
          untagged: true
        };
      } else if (allowedVlans.includes(frameVlan)) {
        // Tagged frame con VLAN permitida
        return {
          allowed: true,
          reason: `Tagged frame with allowed VLAN ${frameVlan}`,
          outputVlan: frameVlan,
          untagged: false
        };
      } else {
        return {
          allowed: false,
          reason: `Trunk port: VLAN ${frameVlan} not in allowed list`
        };
      }
    
    case 'dynamic':
      // Dynamic: determina modo basado en DTP
      // Por defecto, trata como access
      return checkIngressVLAN(frameVlan, createAccessConfig(accessVlan));
    
    case 'none':
      // Sin switchport - modo router, acepta todo
      if (frameVlan === undefined) {
        return {
          allowed: true,
          reason: 'Routed port: untagged frame',
          outputVlan: 1,
          untagged: true
        };
      } else {
        return {
          allowed: true,
          reason: 'Routed port: tagged frame',
          outputVlan: frameVlan,
          untagged: false
        };
      }
    
    default:
      return {
        allowed: false,
        reason: `Unknown port mode: ${mode}`
      };
  }
}

/**
 * Verifica si un frame puede ser enviado por un puerto de salida
 * @returns Resultado con información sobre tagging
 */
export function checkEgressVLAN(
  frameVlan: number,
  portConfig: SwitchportConfig
): VLANMembershipResult {
  const { mode, accessVlan, nativeVlan, allowedVlans, nativeVlanTagging } = portConfig;
  
  switch (mode) {
    case 'access':
      // Puerto access: solo envía untagged frames de la access VLAN
      if (frameVlan === accessVlan) {
        return {
          allowed: true,
          reason: 'Access VLAN frame, sent untagged',
          outputVlan: frameVlan,
          untagged: true
        };
      } else {
        return {
          allowed: false,
          reason: `Access port: frame VLAN ${frameVlan} doesn't match access VLAN ${accessVlan}`
        };
      }
    
    case 'trunk':
      // Puerto trunk: envía tagged frames (excepto native VLAN)
      if (!allowedVlans.includes(frameVlan)) {
        return {
          allowed: false,
          reason: `Trunk port: VLAN ${frameVlan} not in allowed list`
        };
      }
      
      if (frameVlan === nativeVlan && !nativeVlanTagging) {
        // Native VLAN se envía sin tag
        return {
          allowed: true,
          reason: 'Native VLAN frame, sent untagged',
          outputVlan: frameVlan,
          untagged: true
        };
      } else {
        // Otras VLANs se envían con tag
        return {
          allowed: true,
          reason: `Tagged frame for VLAN ${frameVlan}`,
          outputVlan: frameVlan,
          untagged: false
        };
      }
    
    case 'dynamic':
      return checkEgressVLAN(frameVlan, createAccessConfig(accessVlan));
    
    case 'none':
      // Routed port
      return {
        allowed: true,
        reason: 'Routed port: forwarding',
        outputVlan: frameVlan,
        untagged: frameVlan === 1
      };
    
    default:
      return {
        allowed: false,
        reason: `Unknown port mode: ${mode}`
      };
  }
}

// =============================================================================
// VLAN DEFINITION UTILITIES
// =============================================================================

/**
 * Crea la VLAN por defecto
 */
export function createDefaultVLAN(): VLANDefinition {
  return {
    id: VLAN_RESERVED.DEFAULT,
    name: 'default',
    status: 'active',
    mtu: 1500,
    type: 'ethernet',
    isDefault: true
  };
}

/**
 * Crea una definición de VLAN
 */
export function createVLANDefinition(
  id: number,
  name?: string
): VLANDefinition {
  if (!isValidVLAN(id)) {
    throw new Error(`Invalid VLAN ID: ${id}`);
  }
  
  return {
    id,
    name: name ?? `VLAN${id.toString().padStart(4, '0')}`,
    status: 'active',
    mtu: 1500,
    type: 'ethernet'
  };
}

/**
 * Obtiene los puertos miembros de una VLAN
 */
export function getVLANMembers(
  vlanId: number,
  interfaces: Map<string, InterfaceRuntime>
): string[] {
  const members: string[] = [];
  
  for (const [portName, iface] of interfaces) {
    if (iface.switchportMode === 'access' && iface.vlan === vlanId) {
      members.push(portName);
    } else if (iface.switchportMode === 'trunk') {
      if (iface.allowedVlans?.includes(vlanId) || iface.nativeVlan === vlanId) {
        members.push(portName);
      }
    }
  }
  
  return members;
}

/**
 * Obtiene todos los puertos para hacer flood de una VLAN
 * (excluyendo el puerto de entrada)
 */
export function getFloodPorts(
  vlanId: number,
  interfaces: Map<string, InterfaceRuntime>,
  ingressPort: string
): string[] {
  const ports: string[] = [];
  
  for (const [portName, iface] of interfaces) {
    if (portName === ingressPort) continue;
    if (iface.adminStatus !== 'up') continue;
    if (iface.linkStatus !== 'up') continue;
    
    // Verificar si el puerto pertenece a la VLAN
    const portConfig = getSwitchportConfig(iface);
    const result = checkEgressVLAN(vlanId, portConfig);
    
    if (result.allowed) {
      ports.push(portName);
    }
  }
  
  return ports;
}

// =============================================================================
// QOS/PCP UTILITIES
// =============================================================================

/**
 * Obtiene el nombre de prioridad PCP
 */
export function getPCPName(pcp: number): string {
  return PCP_NAMES[pcp] ?? `Unknown (${pcp})`;
}

/**
 * Determina PCP basado en tipo de tráfico
 */
export function getRecommendedPCP(trafficType: 'voice' | 'video' | 'data' | 'control'): number {
  switch (trafficType) {
    case 'voice': return PCP_VALUES.VOICE;
    case 'video': return PCP_VALUES.VIDEO;
    case 'control': return PCP_VALUES.INTERNETWORK_CONTROL;
    case 'data':
    default:
      return PCP_VALUES.BEST_EFFORT;
  }
}
