/**
 * Protocolo ICMP (Internet Control Message Protocol)
 * 
 * Implementa mensajes ICMP para diagnóstico de red,
 * incluyendo Echo Request/Reply (ping) y mensajes de error.
 * RFC 792 - Internet Control Message Protocol
 */

import { IPProtocol, type IPv4Packet, createIPv4Packet, serializeIPv4, deserializeIPv4, serializeIPv4Header } from './ipv4';

// =============================================================================
// ICMP TYPES
// =============================================================================

/**
 * Tipos de mensajes ICMP
 */
export enum ICMPType {
  /** Echo Reply (ping response) */
  ECHO_REPLY = 0,
  
  /** Destination Unreachable */
  DESTINATION_UNREACHABLE = 3,
  
  /** Source Quench (deprecated) */
  SOURCE_QUENCH = 4,
  
  /** Redirect */
  REDIRECT = 5,
  
  /** Echo Request (ping request) */
  ECHO_REQUEST = 8,
  
  /** Router Advertisement */
  ROUTER_ADVERTISEMENT = 9,
  
  /** Router Solicitation */
  ROUTER_SOLICITATION = 10,
  
  /** Time Exceeded */
  TIME_EXCEEDED = 11,
  
  /** Parameter Problem */
  PARAMETER_PROBLEM = 12,
  
  /** Timestamp Request */
  TIMESTAMP_REQUEST = 13,
  
  /** Timestamp Reply */
  TIMESTAMP_REPLY = 14
}

/**
 * Códigos para Destination Unreachable (Type 3)
 */
export enum DestinationUnreachableCode {
  /** Network unreachable */
  NETWORK_UNREACHABLE = 0,
  
  /** Host unreachable */
  HOST_UNREACHABLE = 1,
  
  /** Protocol unreachable */
  PROTOCOL_UNREACHABLE = 2,
  
  /** Port unreachable */
  PORT_UNREACHABLE = 3,
  
  /** Fragmentation needed and DF set */
  FRAGMENTATION_NEEDED = 4,
  
  /** Source route failed */
  SOURCE_ROUTE_FAILED = 5,
  
  /** Destination network unknown */
  NETWORK_UNKNOWN = 6,
  
  /** Destination host unknown */
  HOST_UNKNOWN = 7,
  
  /** Source host isolated */
  SOURCE_HOST_ISOLATED = 8,
  
  /** Network administratively prohibited */
  NETWORK_PROHIBITED = 9,
  
  /** Host administratively prohibited */
  HOST_PROHIBITED = 10,
  
  /** Network unreachable for ToS */
  NETWORK_UNREACHABLE_TOS = 11,
  
  /** Host unreachable for ToS */
  HOST_UNREACHABLE_TOS = 12,
  
  /** Communication administratively prohibited */
  COMMUNICATION_PROHIBITED = 13,
  
  /** Host precedence violation */
  HOST_PRECEDENCE_VIOLATION = 14,
  
  /** Precedence cutoff in effect */
  PRECEDENCE_CUTOFF = 15
}

/**
 * Códigos para Time Exceeded (Type 11)
 */
export enum TimeExceededCode {
  /** TTL expired in transit */
  TTL_EXCEEDED = 0,
  
  /** Fragment reassembly time exceeded */
  FRAGMENT_REASSEMBLY_EXCEEDED = 1
}

/**
 * Códigos para Redirect (Type 5)
 */
export enum RedirectCode {
  /** Redirect datagrams for the network */
  NETWORK = 0,
  
  /** Redirect datagrams for the host */
  HOST = 1,
  
  /** Redirect datagrams for the ToS and network */
  NETWORK_TOS = 2,
  
  /** Redirect datagrams for the ToS and host */
  HOST_TOS = 3
}

// =============================================================================
// ICMP PACKET STRUCTURES
// =============================================================================

/**
 * Estructura base de un mensaje ICMP
 */
export interface ICMPPacket {
  type: ICMPType;
  code: number;
  checksum: number;
  data?: Uint8Array;
}

/**
 * ICMP Echo Request/Reply
 */
export interface ICMPEcho extends ICMPPacket {
  type: ICMPType.ECHO_REQUEST | ICMPType.ECHO_REPLY;
  code: 0;
  identifier: number;
  sequenceNumber: number;
  data: Uint8Array;
}

/**
 * ICMP Destination Unreachable
 */
export interface ICMPDestinationUnreachable extends ICMPPacket {
  type: ICMPType.DESTINATION_UNREACHABLE;
  code: DestinationUnreachableCode;
  unused: number;
  originalIPHeader: Uint8Array;
  originalData: Uint8Array;
}

/**
 * ICMP Time Exceeded
 */
export interface ICMPTimeExceeded extends ICMPPacket {
  type: ICMPType.TIME_EXCEEDED;
  code: TimeExceededCode;
  unused: number;
  originalIPHeader: Uint8Array;
  originalData: Uint8Array;
}

// =============================================================================
// ICMP PACKET CREATION
// =============================================================================

/**
 * Crea un ICMP Echo Request (ping)
 */
export function createEchoRequest(
  identifier: number,
  sequenceNumber: number,
  data: Uint8Array = new Uint8Array(56) // Default 56 bytes de data
): ICMPEcho {
  const packet: ICMPEcho = {
    type: ICMPType.ECHO_REQUEST,
    code: 0,
    checksum: 0,
    identifier,
    sequenceNumber,
    data
  };
  
  packet.checksum = calculateICMPChecksum(packet);
  return packet;
}

/**
 * Crea un ICMP Echo Reply (respuesta a ping)
 */
export function createEchoReply(
  identifier: number,
  sequenceNumber: number,
  data: Uint8Array
): ICMPEcho {
  const packet: ICMPEcho = {
    type: ICMPType.ECHO_REPLY,
    code: 0,
    checksum: 0,
    identifier,
    sequenceNumber,
    data
  };
  
  packet.checksum = calculateICMPChecksum(packet);
  return packet;
}

/**
 * Crea un mensaje ICMP Destination Unreachable
 */
export function createDestinationUnreachable(
  code: DestinationUnreachableCode,
  originalPacket: IPv4Packet
): ICMPDestinationUnreachable {
  const originalHeader = serializeIPv4Header(originalPacket);
  // Incluir 8 bytes del payload original
  const originalData = originalPacket.payload.slice(0, 8);
  
  const packet: ICMPDestinationUnreachable = {
    type: ICMPType.DESTINATION_UNREACHABLE,
    code,
    checksum: 0,
    unused: 0,
    originalIPHeader: originalHeader,
    originalData
  };
  
  packet.checksum = calculateICMPChecksum(packet);
  return packet;
}

/**
 * Crea un mensaje ICMP Time Exceeded
 */
export function createTimeExceeded(
  code: TimeExceededCode,
  originalPacket: IPv4Packet
): ICMPTimeExceeded {
  const originalHeader = serializeIPv4Header(originalPacket);
  // Incluir 8 bytes del payload original
  const originalData = originalPacket.payload.slice(0, 8);
  
  const packet: ICMPTimeExceeded = {
    type: ICMPType.TIME_EXCEEDED,
    code,
    checksum: 0,
    unused: 0,
    originalIPHeader: originalHeader,
    originalData
  };
  
  packet.checksum = calculateICMPChecksum(packet);
  return packet;
}

// =============================================================================
// ICMP CHECKSUM
// =============================================================================

/**
 * Calcula el checksum de un mensaje ICMP
 */
export function calculateICMPChecksum(packet: ICMPPacket): number {
  const serialized = serializeICMP(packet, true);
  
  let sum = 0;
  
  for (let i = 0; i < serialized.length; i += 2) {
    sum += (serialized[i] << 8) | (serialized[i + 1] ?? 0);
  }
  
  // Sumar carry
  while (sum >> 16) {
    sum = (sum & 0xFFFF) + (sum >> 16);
  }
  
  return (~sum) & 0xFFFF;
}

/**
 * Verifica el checksum de un mensaje ICMP
 * El checksum es válido si la suma de todas las palabras de 16 bits (incluyendo el checksum) es 0xFFFF
 */
export function verifyICMPChecksum(packet: ICMPPacket): boolean {
  // Serializar con el checksum actual (no zeroed)
  const serialized = serializeICMP(packet, false);
  
  let sum = 0;
  
  for (let i = 0; i < serialized.length; i += 2) {
    sum += (serialized[i] << 8) | (serialized[i + 1] ?? 0);
  }
  
  // Sumar carry
  while (sum >> 16) {
    sum = (sum & 0xFFFF) + (sum >> 16);
  }
  
  // El resultado debe ser 0xFFFF (todos los bits en 1)
  return sum === 0xFFFF;
}

// =============================================================================
// SERIALIZATION
// =============================================================================

/**
 * Serializa un mensaje ICMP a bytes
 */
export function serializeICMP(packet: ICMPPacket, zeroChecksum: boolean = false): Uint8Array {
  let data: Uint8Array;
  
  if (isICMPEcho(packet)) {
    // Echo Request/Reply: Type(1) + Code(1) + Checksum(2) + ID(2) + Seq(2) + Data
    const packetData = packet.data ?? new Uint8Array(0);
    data = new Uint8Array(8 + packetData.length);
    data[0] = packet.type;
    data[1] = packet.code;
    // Checksum en bytes 2-3 (se setea después)
    data[2] = zeroChecksum ? 0 : (packet.checksum >> 8) & 0xFF;
    data[3] = zeroChecksum ? 0 : packet.checksum & 0xFF;
    // Identifier en bytes 4-5
    data[4] = (packet.identifier >> 8) & 0xFF;
    data[5] = packet.identifier & 0xFF;
    // Sequence en bytes 6-7
    data[6] = (packet.sequenceNumber >> 8) & 0xFF;
    data[7] = packet.sequenceNumber & 0xFF;
    // Data
    data.set(packetData, 8);
  } else if (isDestinationUnreachable(packet) || isTimeExceeded(packet)) {
    // Error messages: Type(1) + Code(1) + Checksum(2) + Unused(4) + Original Header + Original Data
    const totalLength = 8 + packet.originalIPHeader.length + packet.originalData.length;
    data = new Uint8Array(totalLength);
    data[0] = packet.type;
    data[1] = packet.code;
    data[2] = zeroChecksum ? 0 : (packet.checksum >> 8) & 0xFF;
    data[3] = zeroChecksum ? 0 : packet.checksum & 0xFF;
    // Unused (4 bytes, ya en 0)
    // Original IP Header
    data.set(packet.originalIPHeader, 8);
    // Original Data
    data.set(packet.originalData, 8 + packet.originalIPHeader.length);
  } else {
    // Generic ICMP
    const packetData = packet.data ?? new Uint8Array(0);
    data = new Uint8Array(4 + packetData.length);
    data[0] = packet.type;
    data[1] = packet.code;
    data[2] = zeroChecksum ? 0 : (packet.checksum >> 8) & 0xFF;
    data[3] = zeroChecksum ? 0 : packet.checksum & 0xFF;
    data.set(packetData, 4);
  }
  
  return data;
}

/**
 * Deserializa bytes a un mensaje ICMP
 */
export function deserializeICMP(data: Uint8Array): ICMPPacket | null {
  if (data.length < 8) return null;
  
  const type = data[0] as ICMPType;
  const code = data[1];
  const checksum = (data[2] << 8) | data[3];
  
  if (type === ICMPType.ECHO_REQUEST || type === ICMPType.ECHO_REPLY) {
    const identifier = (data[4] << 8) | data[5];
    const sequenceNumber = (data[6] << 8) | data[7];
    const echoData = data.slice(8);
    
    return {
      type,
      code,
      checksum,
      identifier,
      sequenceNumber,
      data: echoData
    } as ICMPEcho;
  }
  
  if (type === ICMPType.DESTINATION_UNREACHABLE || type === ICMPType.TIME_EXCEEDED) {
    // Unused bytes 4-7
    // Original IP header starts at byte 8
    const originalIPHeader = data.slice(8, 28); // Assume 20-byte header
    const originalData = data.slice(28, 36); // 8 bytes of original data
    
    return {
      type,
      code,
      checksum,
      unused: 0,
      originalIPHeader,
      originalData
    } as ICMPDestinationUnreachable | ICMPTimeExceeded;
  }
  
  // Generic ICMP packet
  return {
    type,
    code,
    checksum,
    data: data.slice(4)
  };
}

// =============================================================================
// TYPE GUARDS
// =============================================================================

export function isICMPEcho(packet: ICMPPacket): packet is ICMPEcho {
  return packet.type === ICMPType.ECHO_REQUEST || packet.type === ICMPType.ECHO_REPLY;
}

export function isDestinationUnreachable(packet: ICMPPacket): packet is ICMPDestinationUnreachable {
  return packet.type === ICMPType.DESTINATION_UNREACHABLE;
}

export function isTimeExceeded(packet: ICMPPacket): packet is ICMPTimeExceeded {
  return packet.type === ICMPType.TIME_EXCEEDED;
}

// =============================================================================
// ICMP RESPONSE GENERATION
// =============================================================================

/**
 * Crea una respuesta Echo Reply a partir de un Echo Request
 */
export function createEchoReplyFromRequest(
  request: ICMPEcho,
  srcIP: string,
  dstIP: string
): IPv4Packet {
  const reply = createEchoReply(request.identifier, request.sequenceNumber, request.data);
  const replyData = serializeICMP(reply);
  
  return createIPv4Packet(srcIP, dstIP, IPProtocol.ICMP, replyData);
}

/**
 * Crea un mensaje Time Exceeded para un paquete con TTL expirado
 */
export function createTimeExceededResponse(
  originalPacket: IPv4Packet,
  srcIP: string,
  dstIP: string
): IPv4Packet {
  const timeExceeded = createTimeExceeded(TimeExceededCode.TTL_EXCEEDED, originalPacket);
  const icmpData = serializeICMP(timeExceeded);
  
  return createIPv4Packet(srcIP, dstIP, IPProtocol.ICMP, icmpData);
}

/**
 * Crea un mensaje Destination Unreachable
 */
export function createDestinationUnreachableResponse(
  originalPacket: IPv4Packet,
  code: DestinationUnreachableCode,
  srcIP: string,
  dstIP: string
): IPv4Packet {
  const destUnreach = createDestinationUnreachable(code, originalPacket);
  const icmpData = serializeICMP(destUnreach);
  
  return createIPv4Packet(srcIP, dstIP, IPProtocol.ICMP, icmpData);
}
