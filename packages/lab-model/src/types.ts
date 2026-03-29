/**
 * TIPOS CANÓNICOS UNIFICADOS
 * 
 * Este archivo es la ÚNICA fuente de verdad para tipos de dispositivos,
 * cables, conexiones, etc. Todos los demás módulos deben importar desde aquí.
 * 
 * NO duplicar estos tipos en otros archivos.
 */

// =============================================================================
// DEVICE TYPES
// =============================================================================

/**
 * Tipos de dispositivos soportados
 * Incluye todos los tipos de Packet Tracer
 */
export type DeviceType =
  // Infrastructure
  | 'router'
  | 'switch'
  | 'multilayer-switch'
  | 'hub'
  | 'access-point'
  | 'wireless-router'
  | 'firewall'
  | 'cloud'
  | 'modem'
  // End devices
  | 'pc'
  | 'laptop'
  | 'server'
  | 'printer'
  | 'ip-phone'
  | 'tablet'
  | 'smartphone'
  | 'tv'
  // IoT
  | 'home-gateway'
  | 'sensor'
  | 'actuator'
  | 'mcu'
  // Other
  | 'repeater'
  | 'sniffer'
  | 'unknown';

/**
 * Familias de dispositivos para categorización
 */
export type DeviceFamily =
  | 'infrastructure'
  | 'end-device'
  | 'wireless'
  | 'security'
  | 'iot'
  | 'industrial'
  | 'other';

/**
 * Obtiene la familia de un tipo de dispositivo
 */
export function getDeviceFamily(type: DeviceType): DeviceFamily {
  switch (type) {
    case 'router':
    case 'switch':
    case 'multilayer-switch':
    case 'hub':
    case 'cloud':
    case 'modem':
    case 'repeater':
      return 'infrastructure';
    
    case 'access-point':
    case 'wireless-router':
      return 'wireless';
    
    case 'firewall':
      return 'security';
    
    case 'pc':
    case 'laptop':
    case 'server':
    case 'printer':
    case 'ip-phone':
    case 'tablet':
    case 'smartphone':
    case 'tv':
      return 'end-device';
    
    case 'home-gateway':
    case 'sensor':
    case 'actuator':
    case 'mcu':
      return 'iot';
    
    case 'sniffer':
    case 'unknown':
    default:
      return 'other';
  }
}

// =============================================================================
// CABLE TYPES
// =============================================================================

/**
 * Tipos de cable/conexión
 * Valores compatibles con Packet Tracer XML
 */
export enum CableType {
  /** Cobre straight-through */
  STRAIGHT_THROUGH = 'eStraightThrough',
  /** Cobre crossover */
  CROSSOVER = 'eCrossOver',
  /** Fibra óptica */
  FIBER = 'eFiber',
  /** Serial DCE */
  SERIAL_DCE = 'eSerialDCE',
  /** Serial DTE */
  SERIAL_DTE = 'eSerialDTE',
  /** Consola */
  CONSOLE = 'eConsole',
  /** Coaxial */
  COAXIAL = 'eCoaxial',
  /** Octal */
  OCTAL = 'eOctal',
  /** Phone */
  PHONE = 'ePhone',
  /** IoT */
  IOE = 'eIoe',
  /** USB */
  USB = 'eUsb',
  /** Wireless */
  WIRELESS = 'eWireless'
}

/**
 * Medio de transmisión
 */
export enum LinkMedium {
  /** Cobre */
  COPPER = 'eCopper',
  /** Fibra óptica */
  FIBER = 'eFiber',
  /** Serial */
  SERIAL = 'eSerial',
  /** Inalámbrico */
  WIRELESS = 'eWireless',
  /** Coaxial */
  COAXIAL = 'eCoaxial',
  /** Phone */
  PHONE = 'ePhone'
}

/**
 * Obtiene el medio a partir del tipo de cable
 */
export function getLinkMedium(cableType: CableType): LinkMedium {
  switch (cableType) {
    case CableType.STRAIGHT_THROUGH:
    case CableType.CROSSOVER:
      return LinkMedium.COPPER;
    
    case CableType.FIBER:
      return LinkMedium.FIBER;
    
    case CableType.SERIAL_DCE:
    case CableType.SERIAL_DTE:
      return LinkMedium.SERIAL;
    
    case CableType.COAXIAL:
      return LinkMedium.COAXIAL;
    
    case CableType.PHONE:
      return LinkMedium.PHONE;
    
    case CableType.WIRELESS:
      return LinkMedium.WIRELESS;
    
    default:
      return LinkMedium.COPPER;
  }
}

// =============================================================================
// PORT TYPES
// =============================================================================

/**
 * Tipos de puertos
 */
export enum PortType {
  /** Fast Ethernet (100Mbps) */
  FAST_ETHERNET = 'FastEthernet',
  /** Gigabit Ethernet (1Gbps) */
  GIGABIT_ETHERNET = 'GigabitEthernet',
  /** Ten Gigabit Ethernet (10Gbps) */
  TEN_GIGABIT_ETHERNET = 'TenGigabitEthernet',
  /** Serial */
  SERIAL = 'Serial',
  /** Fibra */
  FIBER = 'Fiber',
  /** Consola */
  CONSOLE = 'Console',
  /** Auxiliar */
  AUXILIARY = 'Aux',
  /** USB */
  USB = 'USB',
  /** Puerto genérico */
  ETHERNET = 'Ethernet',
  /** Wireless */
  WIRELESS = 'Wireless',
  /** DSL */
  DSL = 'DSL',
  /** Cable */
  CABLE = 'Cable'
}

/**
 * Parsea el nombre de un puerto para obtener su tipo y número
 */
export function parsePortName(portName: string): {
  type: PortType;
  module: number;
  number: number;
  fullName: string;
} {
  // Patrones comunes: FastEthernet0/1, Gi0/0/1, Serial0/0/0:0
  const patterns: Array<{
    regex: RegExp;
    type: PortType;
    extract: (match: RegExpMatchArray) => { module: number; number: number };
  }> = [
    {
      regex: /^(Fa|FastEthernet)(\d+)\/(\d+)$/i,
      type: PortType.FAST_ETHERNET,
      extract: (m) => ({ module: parseInt(m[2]!), number: parseInt(m[3]!) })
    },
    {
      regex: /^(Gi|GigabitEthernet)(\d+)\/(\d+)(\/(\d+))?$/i,
      type: PortType.GIGABIT_ETHERNET,
      extract: (m) => ({ module: parseInt(m[2]!), number: parseInt(m[4] || m[3]!) })
    },
    {
      regex: /^(Te|TenGigabitEthernet)(\d+)\/(\d+)$/i,
      type: PortType.TEN_GIGABIT_ETHERNET,
      extract: (m) => ({ module: parseInt(m[2]!), number: parseInt(m[3]!) })
    },
    {
      regex: /^(Se|Serial)(\d+)\/(\d+)(\/(\d+))?(:\d+)?$/i,
      type: PortType.SERIAL,
      extract: (m) => ({ module: parseInt(m[2]!), number: parseInt(m[4] || m[3]!) })
    },
    {
      regex: /^(Console|Con)(\d*)$/i,
      type: PortType.CONSOLE,
      extract: (m) => ({ module: 0, number: parseInt(m[2]!) || 0 })
    },
    {
      regex: /^(Aux)(\d*)$/i,
      type: PortType.AUXILIARY,
      extract: (m) => ({ module: 0, number: parseInt(m[2]!) || 0 })
    },
    {
      regex: /^(USB)(\d*)$/i,
      type: PortType.USB,
      extract: (m) => ({ module: 0, number: parseInt(m[2]!) || 0 })
    },
    {
      regex: /^(Eth|Ethernet)(\d+)\/(\d+)$/i,
      type: PortType.ETHERNET,
      extract: (m) => ({ module: parseInt(m[2]!), number: parseInt(m[3]!) })
    }
  ];
  
  for (const pattern of patterns) {
    const match = portName.match(pattern.regex);
    if (match) {
      const { module, number } = pattern.extract(match);
      return {
        type: pattern.type,
        module,
        number,
        fullName: portName
      };
    }
  }
  
  // Default a Ethernet genérico
  return {
    type: PortType.ETHERNET,
    module: 0,
    number: 0,
    fullName: portName
  };
}

// =============================================================================
// INTERFACE TYPES
// =============================================================================

/**
 * Estado de una interfaz
 */
export type InterfaceStatus = 'up' | 'down' | 'administratively-down';

/**
 * Modo de switchport
 */
export type SwitchportMode = 'access' | 'trunk' | 'dynamic' | 'none';

/**
 * Modo de negociación
 */
export type DuplexMode = 'auto' | 'full' | 'half';

/**
 * Velocidad
 */
export type Speed = 'auto' | '10' | '100' | '1000' | '10000';

// =============================================================================
// PROTOCOL TYPES
// =============================================================================

/**
 * Dificultad de un laboratorio
 */
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';

/**
 * Tipo de validación
 */
export type ValidationType = 
  | 'ping'
  | 'traceroute'
  | 'http'
  | 'https'
  | 'ftp'
  | 'dns'
  | 'dhcp'
  | 'telnet'
  | 'ssh'
  | 'custom';

// =============================================================================
// POSITION TYPES
// =============================================================================

/**
 * Posición en el canvas
 */
export interface CanvasPosition {
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotation?: number;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Genera un ID único
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Valida formato de IP
 */
export function isValidIP(ip: string): boolean {
  const pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!pattern.test(ip)) return false;
  
  const octets = ip.split('.').map(Number);
  return octets.every(octet => octet >= 0 && octet <= 255);
}

/**
 * Valida formato de MAC
 */
export function isValidMAC(mac: string): boolean {
  const pattern = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
  return pattern.test(mac);
}

/**
 * Convierte CIDR a máscara de subred
 */
export function cidrToMask(cidr: number): string {
  if (cidr < 0 || cidr > 32) {
    throw new Error('CIDR must be between 0 and 32');
  }
  
  const mask = [];
  for (let i = 0; i < 4; i++) {
    const bits = Math.min(8, Math.max(0, cidr - i * 8));
    mask.push(256 - Math.pow(2, 8 - bits));
  }
  
  return mask.join('.');
}

/**
 * Convierte máscara a CIDR
 */
export function maskToCidr(mask: string): number {
  const octets = mask.split('.').map(Number);
  let cidr = 0;
  
  for (const octet of octets) {
    let bits = octet;
    while (bits) {
      cidr += bits & 1;
      bits >>= 1;
    }
  }
  
  return cidr;
}

/**
 * Obtiene la dirección de red
 */
export function getNetworkAddress(ip: string, mask: string): string {
  const ipOctets = ip.split('.').map(Number);
  const maskOctets = mask.split('.').map(Number);
  
  return ipOctets
    .map((octet, i) => octet & (maskOctets[i] ?? 0))
    .join('.');
}

/**
 * Obtiene la dirección de broadcast
 */
export function getBroadcastAddress(ip: string, mask: string): string {
  const ipOctets = ip.split('.').map(Number);
  const maskOctets = mask.split('.').map(Number);
  
  return ipOctets
    .map((octet, i) => (octet & (maskOctets[i] ?? 0)) | (~(maskOctets[i] ?? 0) & 255))
    .join('.');
}
