/**
 * Protocolo ARP (Address Resolution Protocol)
 * 
 * Implementa ARP request/reply, cache management y gratuitous ARP.
 * RFC 826 - An Ethernet Address Resolution Protocol
 */

import type { ARPPayload, NetworkEventType } from '@cisco-auto/sim-engine';

// =============================================================================
// ARP PACKET STRUCTURE
// =============================================================================

/**
 * Estructura de un paquete ARP
 * Total: 28 bytes para Ethernet + IPv4
 */
export interface ARPPacket {
  /** Hardware type: 1 = Ethernet */
  htype: number;
  
  /** Protocol type: 0x0800 = IPv4 */
  ptype: number;
  
  /** Hardware address length: 6 for MAC */
  hlen: number;
  
  /** Protocol address length: 4 for IPv4 */
  plen: number;
  
  /** Operation: 1 = request, 2 = reply */
  operation: 1 | 2;
  
  /** Sender hardware address (MAC) */
  senderHWA: string;
  
  /** Sender protocol address (IP) */
  senderPA: string;
  
  /** Target hardware address (MAC) */
  targetHWA: string;
  
  /** Target protocol address (IP) */
  targetPA: string;
}

/**
 * Entrada de caché ARP
 */
export interface ARPCacheEntry {
  ip: string;
  mac: string;
  interface: string;
  learnedAt: number;
  expiresAt: number;
  state: ARPCacheState;
  attempts: number;
  pending: (() => void)[];
}

/**
 * Estado de una entrada ARP
 */
export type ARPCacheState = 
  | 'incomplete'  // Sin respuesta aún
  | 'reachable'   // Válida y fresca
  | 'stale'       // Expirada pero usable
  | 'delay'       // Esperando confirmación
  | 'probe'       // Enviando probes
  | 'permanent';  // Entrada estática

// =============================================================================
// ARP CONSTANTS
// =============================================================================

/** Tiempo por defecto que una entrada ARP es válida (segundos) */
export const ARP_DEFAULT_TIMEOUT = 300; // 5 minutos

/** Tiempo antes de considerar una entrada stale */
export const ARP_REACHABLE_TIME = 30000; // 30 segundos en ms

/** Número máximo de intentos de ARP request */
export const ARP_MAX_REQUESTS = 3;

/** Intervalo entre ARP requests */
export const ARP_REQUEST_INTERVAL = 1000; // 1 segundo

// =============================================================================
// ARP CACHE CLASS
// =============================================================================

/**
 * Cache ARP con gestión de timeouts y entries
 */
export class ARPCache {
  private entries: Map<string, ARPCacheEntry> = new Map();
  private defaultTimeout: number;
  private currentTime: number = 0;
  
  constructor(defaultTimeout: number = ARP_DEFAULT_TIMEOUT) {
    this.defaultTimeout = defaultTimeout;
  }
  
  /**
   * Actualiza el tiempo actual (para simulación)
   */
  setTime(now: number): void {
    this.currentTime = now;
  }
  
  /**
   * Obtiene una entrada del cache
   */
  get(ip: string): ARPCacheEntry | undefined {
    return this.entries.get(ip);
  }
  
  /**
   * Obtiene la MAC para una IP
   */
  getMAC(ip: string): string | undefined {
    const entry = this.entries.get(ip);
    if (entry && entry.state !== 'incomplete') {
      return entry.mac;
    }
    return undefined;
  }
  
  /**
   * Añade o actualiza una entrada
   */
  set(
    ip: string, 
    mac: string, 
    iface: string, 
    options: { 
      static?: boolean;
      timeout?: number;
    } = {}
  ): ARPCacheEntry {
    const timeout = options.timeout ?? this.defaultTimeout;
    const now = this.currentTime;
    
    const existing = this.entries.get(ip);
    
    // Si ya hay una entrada y hay callbacks pendientes, ejecutarlos
    if (existing?.pending && existing.pending.length > 0) {
      for (const callback of existing.pending) {
        callback();
      }
    }
    
    const entry: ARPCacheEntry = {
      ip,
      mac,
      interface: iface,
      learnedAt: now,
      expiresAt: options.static ? Infinity : now + timeout * 1000,
      state: options.static ? 'permanent' : 'reachable',
      attempts: 0,
      pending: []
    };
    
    this.entries.set(ip, entry);
    return entry;
  }
  
  /**
   * Añade una entrada estática (permanente)
   */
  setStatic(ip: string, mac: string, iface: string): ARPCacheEntry {
    return this.set(ip, mac, iface, { static: true });
  }
  
  /**
   * Marca una entrada como incomplete (esperando respuesta)
   */
  markIncomplete(ip: string, iface: string, callback?: () => void): ARPCacheEntry {
    const existing = this.entries.get(ip);
    
    const entry: ARPCacheEntry = {
      ip,
      mac: '00:00:00:00:00:00',
      interface: iface,
      learnedAt: this.currentTime,
      expiresAt: this.currentTime + ARP_DEFAULT_TIMEOUT * 1000,
      state: 'incomplete',
      attempts: existing ? existing.attempts + 1 : 1,
      pending: existing?.pending ?? []
    };
    
    if (callback) {
      entry.pending.push(callback);
    }
    
    this.entries.set(ip, entry);
    return entry;
  }
  
  /**
   * Elimina una entrada
   */
  delete(ip: string): boolean {
    return this.entries.delete(ip);
  }
  
  /**
   * Limpia todas las entradas
   */
  clear(): void {
    this.entries.clear();
  }
  
  /**
   * Obtiene todas las entradas
   */
  getAll(): ARPCacheEntry[] {
    return Array.from(this.entries.values());
  }
  
  /**
   * Verifica si hay una entrada válida para una IP
   */
  hasValidEntry(ip: string): boolean {
    const entry = this.entries.get(ip);
    if (!entry) return false;
    
    // Entradas permanentes siempre válidas
    if (entry.state === 'permanent') return true;
    
    // Verificar expiración
    if (this.currentTime > entry.expiresAt) {
      entry.state = 'stale';
      return false;
    }
    
    return entry.state === 'reachable';
  }
  
  /**
   * Actualiza estados basándose en el tiempo actual
   */
  updateStates(): void {
    for (const entry of this.entries.values()) {
      if (entry.state === 'permanent') continue;
      
      if (this.currentTime > entry.expiresAt) {
        entry.state = 'stale';
      }
    }
  }
  
  /**
   * Serializa el estado del cache
   */
  serialize(): Array<{
    ip: string;
    mac: string;
    interface: string;
    state: ARPCacheState;
    learnedAt: number;
    expiresAt: number;
  }> {
    return this.getAll().map(e => ({
      ip: e.ip,
      mac: e.mac,
      interface: e.interface,
      state: e.state,
      learnedAt: e.learnedAt,
      expiresAt: e.expiresAt
    }));
  }
}

// =============================================================================
// ARP PACKET FUNCTIONS
// =============================================================================

/**
 * Crea un paquete ARP request
 */
export function createARPRequest(
  senderMAC: string,
  senderIP: string,
  targetIP: string
): ARPPacket {
  return {
    htype: 1,         // Ethernet
    ptype: 0x0800,    // IPv4
    hlen: 6,          // MAC length
    plen: 4,          // IPv4 length
    operation: 1,     // Request
    senderHWA: senderMAC,
    senderPA: senderIP,
    targetHWA: '00:00:00:00:00:00',
    targetPA: targetIP
  };
}

/**
 * Crea un paquete ARP reply
 */
export function createARPReply(
  senderMAC: string,
  senderIP: string,
  targetMAC: string,
  targetIP: string
): ARPPacket {
  return {
    htype: 1,         // Ethernet
    ptype: 0x0800,    // IPv4
    hlen: 6,          // MAC length
    plen: 4,          // IPv4 length
    operation: 2,     // Reply
    senderHWA: senderMAC,
    senderPA: senderIP,
    targetHWA: targetMAC,
    targetPA: targetIP
  };
}

/**
 * Crea un paquete ARP gratuitous (anuncio)
 * Un gratuitous ARP es un ARP request donde senderIP == targetIP
 */
export function createGratuitousARP(
  mac: string,
  ip: string
): ARPPacket {
  return {
    htype: 1,
    ptype: 0x0800,
    hlen: 6,
    plen: 4,
    operation: 1,     // Request (puede ser también 2/reply en algunas implementaciones)
    senderHWA: mac,
    senderPA: ip,
    targetHWA: '00:00:00:00:00:00',
    targetPA: ip      // Mismo que sender para gratuitous
  };
}

/**
 * Convierte un ARPPacket a ARPPayload para el motor de eventos
 */
export function arpPacketToPayload(packet: ARPPacket): ARPPayload {
  return {
    operation: packet.operation === 1 ? 'request' : 'reply',
    senderMAC: packet.senderHWA,
    senderIP: packet.senderPA,
    targetMAC: packet.targetHWA,
    targetIP: packet.targetPA
  };
}

/**
 * Convierte un ARPPayload a ARPPacket
 */
export function payloadToPacket(payload: ARPPayload): ARPPacket {
  return {
    htype: 1,
    ptype: 0x0800,
    hlen: 6,
    plen: 4,
    operation: payload.operation === 'request' ? 1 : 2,
    senderHWA: payload.senderMAC,
    senderPA: payload.senderIP,
    targetHWA: payload.targetMAC,
    targetPA: payload.targetIP
  };
}

// =============================================================================
// ARP UTILITIES
// =============================================================================

/**
 * Serializa un paquete ARP a bytes
 * Formato: HTYPE(2) + PTYPE(2) + HLEN(1) + PLEN(1) + OPER(2) + SHA(6) + SPA(4) + THA(6) + TPA(4)
 */
export function serializeARP(packet: ARPPacket): Uint8Array {
  const buffer = new Uint8Array(28);
  const view = new DataView(buffer.buffer);
  
  // HTYPE (2 bytes)
  view.setUint16(0, packet.htype, false);
  
  // PTYPE (2 bytes)
  view.setUint16(2, packet.ptype, false);
  
  // HLEN (1 byte)
  buffer[4] = packet.hlen;
  
  // PLEN (1 byte)
  buffer[5] = packet.plen;
  
  // OPER (2 bytes)
  view.setUint16(6, packet.operation, false);
  
  // Sender Hardware Address (6 bytes)
  macToBytes(packet.senderHWA, buffer, 8);
  
  // Sender Protocol Address (4 bytes)
  ipToBytes(packet.senderPA, buffer, 14);
  
  // Target Hardware Address (6 bytes)
  macToBytes(packet.targetHWA, buffer, 18);
  
  // Target Protocol Address (4 bytes)
  ipToBytes(packet.targetPA, buffer, 24);
  
  return buffer;
}

/**
 * Deserializa bytes a un paquete ARP
 */
export function deserializeARP(data: Uint8Array): ARPPacket | null {
  if (data.length < 28) return null;
  
  const view = new DataView(data.buffer, data.byteOffset);
  
  return {
    htype: view.getUint16(0, false),
    ptype: view.getUint16(2, false),
    hlen: data[4],
    plen: data[5],
    operation: view.getUint16(6, false) as 1 | 2,
    senderHWA: bytesToMAC(data, 8),
    senderPA: bytesToIP(data, 14),
    targetHWA: bytesToMAC(data, 18),
    targetPA: bytesToIP(data, 24)
  };
}

/**
 * Convierte una MAC string a bytes
 */
function macToBytes(mac: string, buffer: Uint8Array, offset: number): void {
  const parts = mac.split(/[:\-]/);
  for (let i = 0; i < 6; i++) {
    buffer[offset + i] = parseInt(parts[i] || '00', 16);
  }
}

/**
 * Convierte una IP string a bytes
 */
function ipToBytes(ip: string, buffer: Uint8Array, offset: number): void {
  const parts = ip.split('.');
  for (let i = 0; i < 4; i++) {
    buffer[offset + i] = parseInt(parts[i] || '0', 10);
  }
}

/**
 * Convierte bytes a MAC string
 */
function bytesToMAC(buffer: Uint8Array, offset: number): string {
  return Array.from({ length: 6 }, (_, i) => 
    buffer[offset + i].toString(16).padStart(2, '0')
  ).join(':');
}

/**
 * Convierte bytes a IP string
 */
function bytesToIP(buffer: Uint8Array, offset: number): string {
  return Array.from({ length: 4 }, (_, i) => 
    buffer[offset + i].toString()
  ).join('.');
}

/**
 * Verifica si un paquete ARP es gratuitous
 */
export function isGratuitousARP(packet: ARPPacket): boolean {
  return packet.senderPA === packet.targetPA;
}
