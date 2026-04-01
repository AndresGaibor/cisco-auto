/**
 * DEVICE SPECIFICATION - MODELO CANÓNICO DE DISPOSITIVO
 *
 * Este es el modelo único y completo para representar un dispositivo de red.
 * Incluye todos los campos necesarios para:
 * - Configuración de red (IP, VLANs, routing)
 * - Configuración de seguridad (ACLs, NAT)
 * - Configuración de servicios (DHCP, NTP)
 * - Metadatos (posición, modelo, estado)
 */

import type {
  DeviceType,
  DeviceFamily,
  getDeviceFamily,
  CanvasPosition,
  InterfaceStatus,
  SwitchportMode,
  DuplexMode,
  Speed,
  CableType,
  generateId
} from './types';

// Import types from protocol.spec.ts - do not redefine here
import type {
  STPSpec,
  EtherChannelSpec,
  PortSecuritySpec,
  RIPSpec,
  BGPSpec,
  BGPNeighbor,
  ServicesSpec,
  NTPSpec,
  DHCPServerSpec
} from './protocol.spec';

// Import VLAN value objects
import type { VlanId, VlanName, VlanRange, VtpDomain, VtpMode, VtpModeType, VtpVersion, VtpVersionType, VtpPassword } from '../value-objects/index.js';

// Re-export for backwards compatibility (types imported from protocol.spec)
export type {
  STPSpec,
  EtherChannelSpec,
  PortSecuritySpec,
  RIPSpec,
  BGPSpec,
  BGPNeighbor,
  ServicesSpec,
  NTPSpec,
  DHCPServerSpec,
} from './protocol.spec';

// =============================================================================
// INTERFACE SPECIFICATION
// =============================================================================

export interface InterfaceSpec {
  /** Nombre de la interfaz (ej: GigabitEthernet0/0) */
  name: string;

  /** Descripción */
  description?: string;

  /** Dirección IP */
  ip?: string;

  /** Máscara de subred */
  subnetMask?: string;

  /** CIDR (alternativa a subnetMask) */
  cidr?: number;

  /** Dirección MAC */
  mac?: string;

  /** VLAN (para access ports) */
  vlan?: VlanId;

  /** VLAN nativa (para trunk) */
  nativeVlan?: VlanId;

  /** VLANs permitidas (para trunk) */
  allowedVlans?: VlanRange;

  /** Modo de switchport */
  switchportMode?: SwitchportMode;

  /** Estado administrativo */
  shutdown?: boolean;

  /** Estado del link */
  status?: InterfaceStatus;

  /** Velocidad */
  speed?: Speed;

  /** Duplex */
  duplex?: DuplexMode;

  /** Channel group (EtherChannel) */
  channelGroup?: number;

  /** Descripción del puerto conectado */
  connectedTo?: string;
}

// =============================================================================
// VLAN SPECIFICATION
// =============================================================================

export interface VLANSpec {
  /** ID de VLAN (1-4094) */
  id: VlanId;

  /** Nombre de la VLAN */
  name?: VlanName;

  /** Interfaces asignadas */
  interfaces?: string[];
}

// =============================================================================
// VTP SPECIFICATION
// =============================================================================

export interface VTPSpec {
  /** Dominio VTP */
  domain: VtpDomain;

  /** Modo VTP */
  mode: VtpMode;

  /** Versión */
  version?: VtpVersion;

  /** Password */
  password?: VtpPassword;

  /** Pruning habilitado */
  pruning?: boolean;
}

// =============================================================================
// ROUTING SPECIFICATIONS
// =============================================================================

export interface StaticRouteSpec {
  /** Red destino */
  network: string;
  
  /** Máscara de destino */
  mask?: string;
  
  /** Next hop */
  nextHop: string;
  
  /** Interface de salida */
  interface?: string;
  
  /** Distancia administrativa */
  distance?: number;
  
  /** Tag */
  tag?: number;
}

export interface OSPFAreaSpec {
  /** ID del área */
  areaId: string;
  
  /** Redes en el área */
  networks: string[];
  
  /** Tipo de área */
  type?: 'normal' | 'stub' | 'nssa';
  
  /** Stub settings */
  stubSettings?: {
    noSummary?: boolean;
  };
}

export interface OSPFSpec {
  /** Process ID */
  processId: number;
  
  /** Router ID */
  routerId?: string;
  
  /** Áreas */
  areas: OSPFAreaSpec[];
  
  /** Interfaces pasivas */
  passiveInterfaces?: string[];
  
  /** Redistribute */
  redistribute?: ('connected' | 'static' | 'eigrp')[];
}

export interface EIGRPSpec {
  /** AS number */
  asNumber: number;
  
  /** Router ID */
  routerId?: string;
  
  /** Redes */
  networks: string[];
  
  /** Interfaces pasivas */
  passiveInterfaces?: string[];
  
  /** No auto-summary */
  noAutoSummary?: boolean;
}

export interface RoutingSpec {
  /** Rutas estáticas */
  static?: StaticRouteSpec[];
  
  /** OSPF */
  ospf?: OSPFSpec;
  
  /** EIGRP */
  eigrp?: EIGRPSpec;
  
  /** RIP */
  rip?: RIPSpec;
  
  /** BGP */
  bgp?: BGPSpec;
  
  /** IPv6 routing habilitado */
  ipv6UnicastRouting?: boolean;
}

// =============================================================================
// SECURITY SPECIFICATIONS
// =============================================================================

export interface ACLRuleSpec {
  /** Número de línea */
  line?: number;
  
  /** Acción */
  action: 'permit' | 'deny';
  
  /** Protocolo */
  protocol: 'ip' | 'tcp' | 'udp' | 'icmp' | 'ospf' | 'eigrp' | number;
  
  /** Origen */
  source: string;
  
  /** Wildcard origen */
  sourceWildcard?: string;
  
  /** Puerto origen */
  sourcePort?: string | number;
  
  /** Destino */
  destination?: string;
  
  /** Wildcard destino */
  destinationWildcard?: string;
  
  /** Puerto destino */
  destinationPort?: string | number;
  
  /** Opciones */
  options?: string;
  
  /** Log */
  log?: boolean;
}

export interface ACLSpec {
  /** Nombre o número */
  name: string;
  
  /** Tipo */
  type: 'standard' | 'extended' | 'named';
  
  /** Dirección de aplicación */
  direction?: 'in' | 'out';
  
  /** Reglas */
  rules: ACLRuleSpec[];
  
  /** Interface donde se aplica */
  appliedOn?: string;
}

export interface NATPoolSpec {
  /** Nombre del pool */
  name: string;
  
  /** IP inicial */
  startIp: string;
  
  /** IP final */
  endIp: string;
  
  /** Máscara */
  netmask: string;
}

export interface NATSpec {
  /** Tipo de NAT */
  type: 'static' | 'dynamic' | 'pat';
  
  /** NAT estático */
  static?: {
    inside: string;
    outside: string;
  }[];
  
  /** NAT dinámico */
  dynamic?: {
    pool: string;
    acl: string;
  }[];
  
  /** PAT (overload) */
  pat?: {
    interface: string;
    acl: string;
  };
  
  /** Pools */
  pools?: NATPoolSpec[];
  
  /** Inside interfaces */
  insideInterfaces?: string[];
  
  /** Outside interfaces */
  outsideInterfaces?: string[];
}

export interface SecuritySpec {
  /** ACLs */
  acls?: ACLSpec[];
  
  /** NAT */
  nat?: NATSpec;
  
  /** Zone-based firewall */
  firewall?: {
    enabled: boolean;
    zones?: string[];
    policies?: string[];
  };
}

// =============================================================================
// SERVICES SPECIFICATIONS
// =============================================================================

// =============================================================================
// STP / L2 SPECIFICATIONS
// =============================================================================

export interface Layer2Spec {
  /** STP */
  stp?: STPSpec;
  
  /** EtherChannels */
  etherChannels?: EtherChannelSpec[];
  
  /** Port Security */
  portSecurity?: PortSecuritySpec[];
  
  /** CDP */
  cdp?: {
    enabled: boolean;
    interfaces?: string[];
  };
  
  /** LLDP */
  lldp?: {
    enabled: boolean;
    interfaces?: string[];
  };
}

// =============================================================================
// LINE / CONSOLE SPECIFICATIONS
// =============================================================================

export interface LineSpec {
  /** Tipo de línea */
  type: 'console' | 'vty' | 'aux';
  
  /** Rango (ej: 0 4 para vty) */
  range?: [number, number];
  
  /** Transport input */
  transportInput?: ('ssh' | 'telnet')[];
  
  /** Transport output */
  transportOutput?: ('ssh' | 'telnet')[];
  
  /** Login */
  login?: boolean;
  
  /** Password */
  password?: string;
  
  /** Timeout */
  execTimeout?: {
    minutes: number;
    seconds: number;
  };
  
  /** ACL de acceso */
  accessClass?: string;
  
  /** Privilege level */
  privilege?: number;
}

// =============================================================================
// DEVICE MODEL SPECIFICATION
// =============================================================================

export interface DeviceModelSpec {
  /** Vendor */
  vendor?: string;
  
  /** Serie */
  series?: string;
  
  /** Modelo específico */
  model?: string;
  
  /** Versión de IOS */
  iosVersion?: string;
  
  /** Número de slots */
  slots?: number;
  
  /** Módulos instalados */
  modules?: {
    slot: number;
    type: string;
    name?: string;
  }[];
}

// =============================================================================
// DEVICE CREDENTIALS
// =============================================================================

export interface DeviceCredentialsSpec {
  /** Username */
  username?: string;
  
  /** Password (enable) */
  enablePassword?: string;
  
  /** Secret (enable secret) */
  enableSecret?: string;
  
  /** Password de consola */
  consolePassword?: string;
  
  /** SSH key */
  sshKey?: string;
}

// =============================================================================
// MAIN DEVICE SPECIFICATION
// =============================================================================

export interface DeviceSpec {
  // === Identificación ===
  /** ID único del dispositivo */
  id: string;
  
  /** Nombre del dispositivo */
  name: string;
  
  /** Tipo de dispositivo */
  type: DeviceType;
  
  /** Hostname (nombre en IOS) */
  hostname?: string;

  /** Dominio DNS para SSH (usado en 'ip domain-name') */
  domain?: string;
  
  // === Modelo ===
  /** Información del modelo */
  model?: DeviceModelSpec;
  
  // === Configuración de red ===
  /** Interfaces de red */
  interfaces: InterfaceSpec[];
  
  /** VLANs */
  vlans?: VLANSpec[];
  
  /** VTP */
  vtp?: VTPSpec;
  
  // === Routing ===
  /** Configuración de routing */
  routing?: RoutingSpec;
  
  // === Seguridad ===
  /** Configuración de seguridad */
  security?: SecuritySpec;
  
  // === Servicios ===
  /** Servicios de red */
  services?: ServicesSpec;
  
  // === Layer 2 ===
  /** Configuración L2 */
  layer2?: Layer2Spec;
  
  // === Lines ===
  /** Líneas (console, vty, aux) */
  lines?: LineSpec[];
  
  // === Credenciales ===
  /** Credenciales de acceso */
  credentials?: DeviceCredentialsSpec;
  
  // === Management ===
  /** IP de management */
  managementIp?: string;
  
  /** Máscara de management */
  managementMask?: string;
  
  /** Gateway default */
  defaultGateway?: string;
  
  // === Posición en canvas ===
  /** Posición visual */
  position?: CanvasPosition;
  
  // === Metadatos ===
  /** Descripción */
  description?: string;
  
  /** Etiquetas */
  tags?: string[];
  
  /** Notas */
  notes?: string;
  
  // === Estado ===
  /** Estado de power */
  powerOn?: boolean;
  
  /** Running config completa */
  runningConfig?: string;
  
  /** Startup config */
  startupConfig?: string;
}

// =============================================================================
// DEVICE FACTORY
// =============================================================================

/**
 * Factory para crear dispositivos
 */
export class DeviceSpecFactory {
  /**
   * Crea un dispositivo con valores por defecto
   */
  static create(partial: Partial<DeviceSpec> & { name: string; type: DeviceType }): DeviceSpec {
    const id = partial.id || `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    return {
      id,
      hostname: partial.hostname || partial.name,
      interfaces: partial.interfaces || [],
      ...partial,
    };
  }
  
  /**
   * Crea un router con configuración básica
   */
  static createRouter(name: string, options: Partial<DeviceSpec> = {}): DeviceSpec {
    return this.create({
      name,
      type: 'router',
      model: {
        vendor: 'cisco',
        series: 'ISR',
        ...options.model
      },
      interfaces: options.interfaces || [
        { name: 'GigabitEthernet0/0', shutdown: false },
        { name: 'GigabitEthernet0/1', shutdown: false }
      ],
      ...options
    });
  }
  
  /**
   * Crea un switch con puertos por defecto (Fa0/1 - Fa0/24)
   */
  static createSwitch(name: string, options: Partial<DeviceSpec> = {}): DeviceSpec {
    // Generar 24 puertos FastEthernet (0/1 a 0/24) - CORREGIDO
    const interfaces = options.interfaces || Array.from({ length: 24 }, (_, i) => ({
      name: `FastEthernet0/${i + 1}`,  // Empieza en 1, no en 0
      shutdown: false
    }));
    
    return this.create({
      name,
      type: 'switch',
      model: {
        vendor: 'cisco',
        series: 'Catalyst 2960',
        model: '2960-24TT-L',
        ...options.model
      },
      interfaces,
      layer2: {
        stp: {
          mode: 'rapid-pvst'
        },
        ...options.layer2
      },
      ...options
    });
  }
  
  /**
   * Crea un PC con interfaz básica
   */
  static createPC(name: string, options: Partial<DeviceSpec> = {}): DeviceSpec {
    return this.create({
      name,
      type: 'pc',
      interfaces: options.interfaces || [
        { name: 'FastEthernet0', shutdown: false }
      ],
      ...options
    });
  }
  
  /**
   * Crea un server
   */
  static createServer(name: string, options: Partial<DeviceSpec> = {}): DeviceSpec {
    return this.create({
      name,
      type: 'server',
      interfaces: options.interfaces || [
        { name: 'GigabitEthernet0', shutdown: false }
      ],
      services: {
        http: { enabled: true },
        ...options.services
      },
      ...options
    });
  }
}
