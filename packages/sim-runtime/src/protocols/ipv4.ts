/**
 * Protocolo IPv4 (Internet Protocol version 4)
 * 
 * Implementa estructura de paquetes IPv4, utilidades de direcciones
 * y funciones de creación y parsing.
 * RFC 791 - Internet Protocol
 */

import type { PacketPayload } from '@cisco-auto/sim-engine';

// =============================================================================
// IPv4 PACKET STRUCTURE
// =============================================================================

/**
 * Estructura de un paquete IPv4 (sin opciones)
 */
export interface IPv4Packet {
  /** Version (4 for IPv4) */
  version: 4;
  
  /** Internet Header Length (IHL) - en 32-bit words */
  ihl: number;
  
  /** Type of Service (ToS) / DSCP */
  tos: number;
  
  /** Total length of packet */
  totalLength: number;
  
  /** Identification for fragmentation */
  identification: number;
  
  /** Flags (DF, MF) */
  flags: {
    reserved: boolean;
    dontFragment: boolean;
    moreFragments: boolean;
  };
  
  /** Fragment offset */
  fragmentOffset: number;
  
  /** Time to Live */
  ttl: number;
  
  /** Protocol number */
  protocol: IPProtocol;
  
  /** Header checksum */
  checksum: number;
  
  /** Source IP address */
  srcIP: string;
  
  /** Destination IP address */
  dstIP: string;
  
  /** Options (variable length) */
  options?: Uint8Array;
  
  /** Payload data */
  payload: Uint8Array;
}

/**
 * Protocolos IP comunes
 */
export enum IPProtocol {
  ICMP = 1,
  TCP = 6,
  UDP = 17,
  GRE = 47,
  ESP = 50,
  AH = 51,
  OSPF = 89,
  SCTP = 132
}

// =============================================================================
// IPv4 ADDRESS UTILITIES
// =============================================================================

/**
 * Convierte una IP string a un entero de 32 bits (unsigned)
 */
export function ipToNumber(ip: string): number {
  const parts = ip.split('.').map(Number);
  // Use >>> 0 to ensure unsigned 32-bit integer
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

/**
 * Convierte un entero de 32 bits a una IP string
 */
export function numberToIP(num: number): string {
  return [
    (num >>> 24) & 0xFF,
    (num >>> 16) & 0xFF,
    (num >>> 8) & 0xFF,
    num & 0xFF
  ].join('.');
}

/**
 * Obtiene la dirección de red a partir de IP y máscara
 */
export function getNetworkAddress(ip: string, mask: string): string {
  const ipNum = ipToNumber(ip);
  const maskNum = ipToNumber(mask);
  return numberToIP(ipNum & maskNum);
}

/**
 * Obtiene la dirección de broadcast a partir de IP y máscara
 */
export function getBroadcastAddress(ip: string, mask: string): string {
  const ipNum = ipToNumber(ip);
  const maskNum = ipToNumber(mask);
  const wildcard = ~maskNum >>> 0; // Unsigned
  return numberToIP((ipNum & maskNum) | wildcard);
}

/**
 * Convierte CIDR a máscara de subred
 */
export function cidrToMask(cidr: number): string {
  if (cidr < 0 || cidr > 32) {
    throw new Error(`Invalid CIDR: ${cidr}`);
  }
  
  if (cidr === 0) return '0.0.0.0';
  if (cidr === 32) return '255.255.255.255';
  
  const mask = (0xFFFFFFFF << (32 - cidr)) >>> 0;
  return numberToIP(mask);
}

/**
 * Convierte máscara a CIDR
 */
export function maskToCidr(mask: string): number {
  const maskNum = ipToNumber(mask);
  let cidr = 0;
  let n = maskNum;
  
  // Cuenta los bits en 1
  while (n) {
    cidr += n & 1;
    n >>>= 1;
  }
  
  return cidr;
}

/**
 * Verifica si una IP es válida
 */
export function isValidIP(ip: string): boolean {
  const pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!pattern.test(ip)) return false;
  
  const parts = ip.split('.').map(Number);
  return parts.every(p => p >= 0 && p <= 255);
}

/**
 * Verifica si una IP está en una red específica
 */
export function isIPInNetwork(ip: string, network: string, mask: string): boolean {
  const ipNum = ipToNumber(ip);
  const networkNum = ipToNumber(network);
  const maskNum = ipToNumber(mask);
  
  return ((ipNum & maskNum) >>> 0) === ((networkNum & maskNum) >>> 0);
}

/**
 * Verifica si una IP es de una red privada (RFC 1918)
 */
export function isPrivateIP(ip: string): boolean {
  const ipNum = ipToNumber(ip);
  
  // 10.0.0.0/8 (0x0A000000 = 167772160)
  if (((ipNum & 0xFF000000) >>> 0) === 0x0A000000) return true;
  
  // 172.16.0.0/12 (0xAC100000 = 2886729728)
  if (((ipNum & 0xFFF00000) >>> 0) === 0xAC100000) return true;
  
  // 192.168.0.0/16 (0xC0A80000 = 3232235520)
  if (((ipNum & 0xFFFF0000) >>> 0) === 0xC0A80000) return true;
  
  return false;
}

/**
 * Verifica si una IP es de loopback (127.0.0.0/8)
 */
export function isLoopbackIP(ip: string): boolean {
  const ipNum = ipToNumber(ip);
  return ((ipNum & 0xFF000000) >>> 0) === 0x7F000000;
}

/**
 * Verifica si una IP es de link-local (169.254.0.0/16)
 */
export function isLinkLocalIP(ip: string): boolean {
  const ipNum = ipToNumber(ip);
  return ((ipNum & 0xFFFF0000) >>> 0) === 0xA9FE0000;
}

/**
 * Verifica si una IP es de multidifusión (224.0.0.0/4)
 */
export function isMulticastIP(ip: string): boolean {
  const ipNum = ipToNumber(ip);
  return ((ipNum & 0xF0000000) >>> 0) === 0xE0000000;
}

/**
 * Verifica si una IP es de broadcast
 */
export function isBroadcastIP(ip: string, network: string, mask: string): boolean {
  return ip === getBroadcastAddress(network, mask);
}

/**
 * Obtiene el rango de hosts de una red
 */
export function getHostRange(network: string, mask: string): {
  first: string;
  last: string;
  total: number;
} {
  const networkNum = ipToNumber(network);
  const maskNum = ipToNumber(mask);
  const wildcard = (~maskNum) >>> 0;
  
  // Primer host = network + 1
  const first = numberToIP((networkNum + 1) >>> 0);
  
  // Último host = broadcast - 1
  const broadcast = (networkNum | wildcard) >>> 0;
  const last = numberToIP((broadcast - 1) >>> 0);
  
  // Total de hosts = 2^(32-cidr) - 2
  const cidr = maskToCidr(mask);
  const total = cidr >= 31 ? (cidr === 32 ? 1 : 2) : Math.pow(2, 32 - cidr) - 2;
  
  return { first, last, total };
}

// =============================================================================
// IPv4 PACKET FUNCTIONS
// =============================================================================

/**
 * Crea un paquete IPv4 básico
 */
export function createIPv4Packet(
  srcIP: string,
  dstIP: string,
  protocol: IPProtocol,
  payload: Uint8Array,
  options: {
    ttl?: number;
    tos?: number;
    identification?: number;
    dontFragment?: boolean;
  } = {}
): IPv4Packet {
  const headerLength = 5; // Sin opciones = 5 * 4 = 20 bytes
  const totalLength = headerLength * 4 + payload.length;
  
  const packet: IPv4Packet = {
    version: 4,
    ihl: headerLength,
    tos: options.tos ?? 0,
    totalLength,
    identification: options.identification ?? Math.floor(Math.random() * 65536),
    flags: {
      reserved: false,
      dontFragment: options.dontFragment ?? true,
      moreFragments: false
    },
    fragmentOffset: 0,
    ttl: options.ttl ?? 64,
    protocol,
    checksum: 0, // Se calcula después
    srcIP,
    dstIP,
    payload
  };
  
  // Calcular checksum
  packet.checksum = calculateChecksum(packet);
  
  return packet;
}

/**
 * Calcula el checksum del header IPv4
 */
export function calculateChecksum(packet: IPv4Packet): number {
  // Crear buffer temporal para el header
  const header = serializeIPv4Header(packet, true);
  
  let sum = 0;
  
  // Sumar palabras de 16 bits
  for (let i = 0; i < header.length; i += 2) {
    sum += (header[i] << 8) | header[i + 1];
  }
  
  // Sumar carry
  while (sum >> 16) {
    sum = (sum & 0xFFFF) + (sum >> 16);
  }
  
  // Complemento a uno
  return (~sum) & 0xFFFF;
}

/**
 * Verifica el checksum de un paquete IPv4
 * El checksum es válido si la suma de todas las palabras de 16 bits (incluyendo el checksum) es 0xFFFF
 */
export function verifyChecksum(packet: IPv4Packet): boolean {
  // Serializar con el checksum actual (no zeroed)
  const header = serializeIPv4Header(packet, false);
  
  let sum = 0;
  
  // Sumar palabras de 16 bits
  for (let i = 0; i < header.length; i += 2) {
    sum += (header[i] << 8) | header[i + 1];
  }
  
  // Sumar carry
  while (sum >> 16) {
    sum = (sum & 0xFFFF) + (sum >> 16);
  }
  
  // El resultado debe ser 0xFFFF (todos los bits en 1)
  return sum === 0xFFFF;
}

/**
 * Decrementa el TTL de un paquete
 * Retorna true si el TTL es válido, false si expiró
 */
export function decrementTTL(packet: IPv4Packet): boolean {
  packet.ttl--;
  
  if (packet.ttl <= 0) {
    return false; // TTL expired
  }
  
  // Recalcular checksum
  packet.checksum = calculateChecksum(packet);
  
  return true;
}

// =============================================================================
// SERIALIZATION
// =============================================================================

/**
 * Serializa un paquete IPv4 completo a bytes
 */
export function serializeIPv4(packet: IPv4Packet): Uint8Array {
  const header = serializeIPv4Header(packet);
  const combined = new Uint8Array(header.length + packet.payload.length);
  combined.set(header, 0);
  combined.set(packet.payload, header.length);
  return combined;
}

/**
 * Serializa solo el header IPv4
 */
export function serializeIPv4Header(packet: IPv4Packet, zeroChecksum: boolean = false): Uint8Array {
  const headerLength = packet.ihl * 4;
  const buffer = new Uint8Array(headerLength);
  const view = new DataView(buffer.buffer);
  
  // Byte 0: Version (4 bits) + IHL (4 bits)
  buffer[0] = (packet.version << 4) | packet.ihl;
  
  // Byte 1: ToS
  buffer[1] = packet.tos;
  
  // Bytes 2-3: Total Length
  view.setUint16(2, packet.totalLength, false);
  
  // Bytes 4-5: Identification
  view.setUint16(4, packet.identification, false);
  
  // Bytes 6-7: Flags + Fragment Offset
  let flagsAndOffset = packet.fragmentOffset & 0x1FFF;
  if (packet.flags.dontFragment) flagsAndOffset |= 0x4000;
  if (packet.flags.moreFragments) flagsAndOffset |= 0x2000;
  view.setUint16(6, flagsAndOffset, false);
  
  // Byte 8: TTL
  buffer[8] = packet.ttl;
  
  // Byte 9: Protocol
  buffer[9] = packet.protocol;
  
  // Bytes 10-11: Checksum
  view.setUint16(10, zeroChecksum ? 0 : packet.checksum, false);
  
  // Bytes 12-15: Source IP
  setIPInBuffer(buffer, 12, packet.srcIP);
  
  // Bytes 16-19: Destination IP
  setIPInBuffer(buffer, 16, packet.dstIP);
  
  // Options (si las hay) - por ahora no implementadas
  if (packet.options && packet.options.length > 0) {
    buffer.set(packet.options, 20);
  }
  
  return buffer;
}

/**
 * Deserializa bytes a un paquete IPv4
 */
export function deserializeIPv4(data: Uint8Array): IPv4Packet | null {
  if (data.length < 20) return null;
  
  const view = new DataView(data.buffer, data.byteOffset);
  
  // Byte 0: Version + IHL
  const versionIHL = data[0];
  const version = versionIHL >> 4;
  const ihl = versionIHL & 0x0F;
  
  if (version !== 4) return null;
  if (ihl < 5) return null;
  
  const headerLength = ihl * 4;
  if (data.length < headerLength) return null;
  
  // Bytes 6-7: Flags + Fragment Offset
  const flagsAndOffset = view.getUint16(6, false);
  const flags = {
    reserved: (flagsAndOffset & 0x8000) !== 0,
    dontFragment: (flagsAndOffset & 0x4000) !== 0,
    moreFragments: (flagsAndOffset & 0x2000) !== 0
  };
  const fragmentOffset = flagsAndOffset & 0x1FFF;
  
  const packet: IPv4Packet = {
    version: 4,
    ihl,
    tos: data[1],
    totalLength: view.getUint16(2, false),
    identification: view.getUint16(4, false),
    flags,
    fragmentOffset,
    ttl: data[8],
    protocol: data[9] as IPProtocol,
    checksum: view.getUint16(10, false),
    srcIP: getIPFromBuffer(data, 12),
    dstIP: getIPFromBuffer(data, 16),
    payload: data.slice(headerLength)
  };
  
  // Options si IHL > 5
  if (ihl > 5) {
    packet.options = data.slice(20, headerLength);
  }
  
  return packet;
}

/**
 * Convierte un IPv4Packet a PacketPayload para el motor de eventos
 */
export function ipv4PacketToPayload(packet: IPv4Packet): PacketPayload {
  return {
    srcIP: packet.srcIP,
    dstIP: packet.dstIP,
    protocol: packet.protocol,
    ttl: packet.ttl,
    payload: {
      data: packet.payload,
      length: packet.payload.length
    }
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function setIPInBuffer(buffer: Uint8Array, offset: number, ip: string): void {
  const parts = ip.split('.').map(Number);
  for (let i = 0; i < 4; i++) {
    buffer[offset + i] = parts[i];
  }
}

function getIPFromBuffer(buffer: Uint8Array, offset: number): string {
  return `${buffer[offset]}.${buffer[offset + 1]}.${buffer[offset + 2]}.${buffer[offset + 3]}`;
}
