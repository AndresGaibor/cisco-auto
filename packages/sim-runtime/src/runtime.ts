/**
 * @cisco-auto/sim-runtime
 * 
 * Estado vivo del runtime de simulación.
 * Representa el estado actual de cada dispositivo y la red.
 */

import type { DeviceType, DeviceFamily } from '@cisco-auto/lab-model';

// =============================================================================
// INTERFACE RUNTIME
// =============================================================================

/**
 * Estado de una interfaz en runtime
 */
export interface InterfaceRuntime {
  /** Nombre de la interfaz */
  name: string;
  
  /** Dirección MAC */
  mac: string;
  
  /** Dirección IP */
  ip?: string;
  
  /** Máscara de subred */
  subnetMask?: string;
  
  /** VLAN asignada */
  vlan: number;
  
  /** VLAN nativa (para trunk) */
  nativeVlan?: number;
  
  /** VLANs permitidas (para trunk) */
  allowedVlans?: number[];
  
  /** Modo de switchport */
  switchportMode: 'access' | 'trunk' | 'dynamic' | 'none';
  
  /** Estado administrativo */
  adminStatus: 'up' | 'down';
  
  /** Estado del link */
  linkStatus: 'up' | 'down';
  
  /** Velocidad negociada (Mbps) */
  speed?: number;
  
  /** Duplex */
  duplex?: 'full' | 'half' | 'auto';
  
  /** Contador de bytes recibidos */
  rxBytes: number;
  
  /** Contador de bytes transmitidos */
  txBytes: number;
  
  /** Contador de paquetes recibidos */
  rxPackets: number;
  
  /** Contador de paquetes transmitidos */
  txPackets: number;
  
  /** Contador de errores RX */
  rxErrors: number;
  
  /** Contador de errores TX */
  txErrors: number;
  
  /** Cola de salida (para simulación) */
  outputQueue: FrameQueueEntry[];
}

/**
 * Entrada en la cola de frames
 */
export interface FrameQueueEntry {
  /** Frame data */
  frame: Uint8Array;
  
  /** Tiempo de llegada */
  arrivedAt: number;
  
  /** Puerto destino */
  outPort?: string;
}

// =============================================================================
// TABLES
// =============================================================================

/**
 * Entrada de tabla MAC
 */
export interface MACEntry {
  /** Dirección MAC */
  mac: string;
  
  /** VLAN */
  vlan: number;
  
  /** Puerto donde se aprendió */
  port: string;
  
  /** Tiempo de aprendizaje */
  learnedAt: number;
  
  /** ¿Es estática? */
  static: boolean;
}

/**
 * Entrada de tabla ARP
 */
export interface ARPEntry {
  /** Dirección IP */
  ip: string;
  
  /** Dirección MAC */
  mac: string;
  
  /** Interfaz */
  interface: string;
  
  /** Tiempo de aprendizaje */
  learnedAt: number;
  
  /** ¿Es estática? */
  static: boolean;
  
  /** Estado */
  state: 'reachable' | 'stale' | 'incomplete' | 'permanent';
}

/**
 * Entrada de tabla de rutas
 */
export interface RouteEntry {
  /** Red destino */
  network: string;
  
  /** Máscara */
  mask: string;
  
  /** CIDR */
  cidr: number;
  
  /** Next hop IP */
  nextHop?: string;
  
  /** Interface de salida */
  interface: string;
  
  /** Distancia administrativa */
  administrativeDistance: number;
  
  /** Métrica */
  metric: number;
  
  /** Protocolo de origen */
  protocol: 'connected' | 'static' | 'ospf' | 'eigrp' | 'rip' | 'bgp';
  
  /** Tiempo de edad */
  age?: number;
}

// =============================================================================
// DEVICE RUNTIME
// =============================================================================

/**
 * Estado vivo de un dispositivo
 */
export interface DeviceRuntime {
  /** ID del dispositivo */
  id: string;
  
  /** Nombre */
  name: string;
  
  /** Tipo */
  type: DeviceType;
  
  /** Familia */
  family: DeviceFamily;
  
  /** ¿Está encendido? */
  powerOn: boolean;
  
  /** Interfaces */
  interfaces: Map<string, InterfaceRuntime>;
  
  /** Tabla MAC (para switches) */
  macTable: Map<string, MACEntry>;
  
  /** Tabla ARP */
  arpTable: Map<string, ARPEntry>;
  
  /** Tabla de rutas (para routers) */
  routingTable: RouteEntry[];
  
  /** VLANs configuradas */
  vlans: Map<number, { id: number; name: string; }>;
  
  /** Configuración de STP por VLAN */
  stpState?: Map<number, {
    rootBridge: boolean;
    rootPriority: number;
    rootMAC: string;
    bridgePriority: number;
    bridgeMAC: string;
    portRoles: Map<string, 'root' | 'designated' | 'alternate' | 'disabled'>;
  }>;
  
  /** Procesos activos */
  activeProcesses: Set<string>;
  
  /** Timers pendientes */
  pendingTimers: Map<string, { at: number; callback: string }>;
  
  /** Cola de comandos pendientes */
  commandQueue: string[];
  
  /** Log de eventos */
  eventLog: RuntimeEvent[];
}

/**
 * Evento de runtime
 */
export interface RuntimeEvent {
  /** Tiempo del evento */
  at: number;
  
  /** Tipo */
  type: string;
  
  /** Descripción */
  description: string;
  
  /** Payload */
  payload?: unknown;
}

// =============================================================================
// LINK RUNTIME
// =============================================================================

/**
 * Estado de un link en runtime
 */
export interface LinkRuntime {
  /** ID del link */
  id: string;
  
  /** Dispositivo A */
  deviceA: string;
  
  /** Puerto A */
  portA: string;
  
  /** Dispositivo B */
  deviceB: string;
  
  /** Puerto B */
  portB: string;
  
  /** Estado del link */
  status: 'up' | 'down';
  
  /** Latencia simulada (ms) */
  latency: number;
  
  /** Ancho de banda (bps) */
  bandwidth: number;
  
  /** Frames en tránsito */
  inTransit: TransitFrame[];
}

/**
 * Frame en tránsito
 */
export interface TransitFrame {
  /** Frame data */
  frame: Uint8Array;
  
  /** Tiempo de envío */
  sentAt: number;
  
  /** Tiempo de llegada */
  arrivesAt: number;
  
  /** Dirección */
  direction: 'A_to_B' | 'B_to_A';
}

// =============================================================================
// RUNTIME STATE
// =============================================================================

/**
 * Estado completo del runtime
 */
export interface RuntimeState {
  /** Tiempo actual de simulación */
  now: number;
  
  /** Semilla */
  seed: number;
  
  /** Dispositivos */
  devices: Map<string, DeviceRuntime>;
  
  /** Links */
  links: Map<string, LinkRuntime>;
  
  /** Dominios de broadcast por VLAN */
  broadcastDomains: Map<number, Set<string>>;
  
  /** Buffer de trazas */
  traceBuffer: TraceEntry[];
  
  /** Estadísticas globales */
  stats: {
    framesSent: number;
    framesReceived: number;
    packetsDropped: number;
    collisions: number;
  };
}

/**
 * Entrada de traza
 */
export interface TraceEntry {
  /** Tiempo */
  at: number;
  
  /** Tipo */
  type: string;
  
  /** Dispositivo origen */
  sourceDevice?: string;
  
  /** Dispositivo destino */
  targetDevice?: string;
  
  /** Descripción */
  description: string;
  
  /** Payload */
  payload?: unknown;
}

// =============================================================================
// RUNTIME FACTORY
// =============================================================================

import { getDeviceFamily, generateId } from '@cisco-auto/lab-model';

/**
 * Factory para crear estado de runtime
 */
export class RuntimeFactory {
  /**
   * Crea un estado de runtime vacío
   */
  static createEmptyState(seed: number = Date.now()): RuntimeState {
    return {
      now: 0,
      seed,
      devices: new Map(),
      links: new Map(),
      broadcastDomains: new Map([[1, new Set()]]),
      traceBuffer: [],
      stats: {
        framesSent: 0,
        framesReceived: 0,
        packetsDropped: 0,
        collisions: 0
      }
    };
  }
  
  /**
   * Crea una interfaz con valores por defecto
   */
  static createInterface(
    name: string,
    mac: string,
    options: Partial<InterfaceRuntime> = {}
  ): InterfaceRuntime {
    return {
      name,
      mac,
      vlan: options.vlan ?? 1,
      switchportMode: options.switchportMode ?? 'access',
      adminStatus: options.adminStatus ?? 'up',
      linkStatus: options.linkStatus ?? 'down',
      rxBytes: 0,
      txBytes: 0,
      rxPackets: 0,
      txPackets: 0,
      rxErrors: 0,
      txErrors: 0,
      outputQueue: [],
      ...options
    };
  }
  
  /**
   * Crea un dispositivo con estado inicial
   */
  static createDevice(
    id: string,
    name: string,
    type: DeviceType,
    options: Partial<DeviceRuntime> = {}
  ): DeviceRuntime {
    return {
      id,
      name,
      type,
      family: getDeviceFamily(type),
      powerOn: options.powerOn ?? true,
      interfaces: options.interfaces ?? new Map(),
      macTable: options.macTable ?? new Map(),
      arpTable: options.arpTable ?? new Map(),
      routingTable: options.routingTable ?? [],
      vlans: options.vlans ?? new Map([[1, { id: 1, name: 'default' }]]),
      activeProcesses: options.activeProcesses ?? new Set(),
      pendingTimers: options.pendingTimers ?? new Map(),
      commandQueue: options.commandQueue ?? [],
      eventLog: options.eventLog ?? []
    };
  }
  
  /**
   * Crea un link con estado inicial
   */
  static createLink(
    deviceA: string,
    portA: string,
    deviceB: string,
    portB: string,
    options: Partial<LinkRuntime> = {}
  ): LinkRuntime {
    return {
      id: options.id ?? `link-${deviceA}-${portA}-${deviceB}-${portB}`,
      deviceA,
      portA,
      deviceB,
      portB,
      status: options.status ?? 'up',
      latency: options.latency ?? 1,
      bandwidth: options.bandwidth ?? 100000000, // 100Mbps
      inTransit: options.inTransit ?? []
    };
  }
}
