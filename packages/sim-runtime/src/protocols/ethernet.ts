/**
 * Protocolo Ethernet (IEEE 802.3)
 * 
 * Representación de frames, parsing y utilidades de direcciones MAC.
 * 
 * @module protocols/ethernet
 */

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Ethertypes comunes
 */
export const ETHERTYPES = {
  /** IPv4 */
  IPv4: 0x0800,
  /** IPv6 */
  IPv6: 0x86DD,
  /** ARP */
  ARP: 0x0806,
  /** VLAN tagged (802.1Q) */
  VLAN: 0x8100,
  /** QinQ (double tagged) */
  QINQ: 0x88A8,
  /** LLDP */
  LLDP: 0x88CC,
  /** CDP (Cisco Discovery Protocol) */
  CDP: 0x2000,
  /** STP (Spanning Tree) */
  STP: 0x4242,
  /** PAUSE frame */
  PAUSE: 0x8808,
  /** MPLS Unicast */
  MPLS_U: 0x8847,
  /** MPLS Multicast */
  MPLS_M: 0x8848
} as const;

/**
 * Direcciones MAC especiales
 */
export const SPECIAL_MACS = {
  /** Broadcast */
  BROADCAST: 'ff:ff:ff:ff:ff:ff',
  /** Spanning Tree Bridge Group */
  STP_BRIDGE_GROUP: '01:80:c2:00:00:00',
  /** CDP/VTP/DTP/UDLD */
  CDP_VTP: '01:00:0c:cc:cc:cc',
  /** IPv4 Multicast base */
  IPV4_MULTICAST: '01:00:5e:00:00:00',
  /** IPv6 Multicast base */
  IPV6_MULTICAST: '33:33:00:00:00:00',
  /** LLDP */
  LLDP: '01:80:c2:00:00:0e',
  /** PAUSE */
  PAUSE: '01:80:c2:00:00:01'
} as const;

/**
 * Tamaño mínimo de frame Ethernet (sin preamble)
 */
export const MIN_FRAME_SIZE = 64;

/**
 * Tamaño máximo de frame Ethernet estándar
 */
export const MAX_FRAME_SIZE = 1518;

/**
 * Tamaño máximo de frame jumbo
 */
export const JUMBO_FRAME_SIZE = 9000;

/**
 * Tamaño del header Ethernet (sin VLAN tag)
 */
export const ETHERNET_HEADER_SIZE = 14;

/**
 * Tamaño del FCS (Frame Check Sequence)
 */
export const FCS_SIZE = 4;

// =============================================================================
// TYPES
// =============================================================================

/**
 * Frame Ethernet
 */
export interface EthernetFrame {
  /** Dirección MAC destino */
  dstMAC: string;
  
  /** Dirección MAC origen */
  srcMAC: string;
  
  /** VLAN tag (opcional, 802.1Q) */
  vlanTag?: VLANTag;
  
  /** Ethertype (2 bytes) */
  ethertype: number;
  
  /** Payload (46-1500 bytes típicamente) */
  payload: Uint8Array;
  
  /** Frame Check Sequence (CRC-32) */
  fcs?: number;
  
  /** Puerto de entrada (metadata) */
  ingressPort?: string;
  
  /** Tiempo de recepción (metadata) */
  receivedAt?: number;
}

/**
 * VLAN Tag (802.1Q)
 */
export interface VLANTag {
  /** Priority Code Point (PCP) - 3 bits */
  pcp: number;
  
  /** Drop Eligible Indicator (DEI) - 1 bit */
  dei: boolean;
  
  /** VLAN Identifier (VID) - 12 bits */
  vid: number;
}

/**
 * Estadísticas de frame
 */
export interface FrameStats {
  /** Bytes totales del frame */
  totalBytes: number;
  
  /** Bytes del header */
  headerBytes: number;
  
  /** Bytes del payload */
  payloadBytes: number;
  
  /** ¿Tiene VLAN tag? */
  tagged: boolean;
  
  /** ¿Es válido? */
  valid: boolean;
  
  /** Error de validación (si aplica) */
  error?: string;
}

// =============================================================================
// MAC ADDRESS UTILITIES
// =============================================================================

/**
 * Convierte una MAC en formato string a bytes
 * Soporta formatos: xx:xx:xx:xx:xx:xx, xx-xx-xx-xx-xx-xx, xxxx.xxxx.xxxx
 */
export function macToBytes(mac: string): Uint8Array {
  // Normalizar formato
  let normalized = mac.toLowerCase();
  
  // Formato Cisco: xxxx.xxxx.xxxx
  if (normalized.includes('.')) {
    normalized = normalized.replace(/\./g, '');
  }
  
  // Formato con guiones o dos puntos
  normalized = normalized.replace(/[-:]/g, '');
  
  if (normalized.length !== 12) {
    throw new Error(`Invalid MAC address format: ${mac}`);
  }
  
  const bytes = new Uint8Array(6);
  for (let i = 0; i < 6; i++) {
    bytes[i] = parseInt(normalized.substr(i * 2, 2), 16);
  }
  
  return bytes;
}

/**
 * Convierte bytes a MAC en formato string
 */
export function bytesToMac(bytes: Uint8Array, separator: ':' | '-' | '.' = ':'): string {
  if (bytes.length !== 6) {
    throw new Error('MAC address must be 6 bytes');
  }
  
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0'));
  
  if (separator === '.') {
    return `${hex[0]}${hex[1]}.${hex[2]}${hex[3]}.${hex[4]}${hex[5]}`;
  }
  
  return hex.join(separator);
}

/**
 * Normaliza una dirección MAC a formato minúsculas con dos puntos
 */
export function normalizeMAC(mac: string): string {
  return bytesToMac(macToBytes(mac));
}

/**
 * Valida formato de dirección MAC
 */
export function isValidMAC(mac: string): boolean {
  try {
    macToBytes(mac);
    return true;
  } catch {
    return false;
  }
}

/**
 * Verifica si una MAC es broadcast
 */
export function isBroadcastMAC(mac: string): boolean {
  return normalizeMAC(mac) === SPECIAL_MACS.BROADCAST;
}

/**
 * Verifica si una MAC es multicast
 * Las direcciones multicast tienen el bit menos significativo del primer octeto en 1
 */
export function isMulticastMAC(mac: string): boolean {
  const bytes = macToBytes(mac);
  return (bytes[0] & 0x01) !== 0 && !isBroadcastMAC(mac);
}

/**
 * Verifica si una MAC es unicast
 */
export function isUnicastMAC(mac: string): boolean {
  const bytes = macToBytes(mac);
  return (bytes[0] & 0x01) === 0;
}

/**
 * Verifica si una MAC es una dirección reservada de protocolo (01:80:c2:xx:xx:xx)
 * Estos frames no deben ser reenviados por switches
 */
export function isReservedMAC(mac: string): boolean {
  const bytes = macToBytes(mac);
  return bytes[0] === 0x01 && bytes[1] === 0x80 && bytes[2] === 0xc2;
}

/**
 * Verifica si una MAC debe ser procesada por el switch (no reenviada)
 * Las MACs reservadas (01:80:c2:00:00:0x) se procesan localmente
 */
export function isSwitchProcessorMAC(mac: string): boolean {
  const bytes = macToBytes(mac);
  // 01:80:c2:00:00:00 a 01:80:c2:00:00:0f son para protocolos de bridge
  return bytes[0] === 0x01 && 
         bytes[1] === 0x80 && 
         bytes[2] === 0xc2 && 
         bytes[3] === 0x00 && 
         bytes[4] === 0x00 &&
         bytes[5] <= 0x0f;
}

/**
 * Genera una dirección MAC aleatoria con un OUI específico
 * @param oui - OUI (primeros 3 bytes), default 00:00:00
 * @param random - Función aleatoria determinista que retorna número 0-1
 * @param preserveOUI - Si true, no modifica el OUI para hacerlo locally administered
 */
export function generateRandomMAC(
  oui: number[] = [0x00, 0x00, 0x00],
  random: () => number = Math.random,
  preserveOUI: boolean = false
): string {
  const bytes = new Uint8Array(6);
  bytes[0] = oui[0];
  bytes[1] = oui[1];
  bytes[2] = oui[2];
  bytes[3] = Math.floor(random() * 256);
  bytes[4] = Math.floor(random() * 256);
  bytes[5] = Math.floor(random() * 256);
  
  // Si no se preserva el OUI, asegurar que es locally administered
  if (!preserveOUI) {
    // Asegurar que es unicast (bit menos significativo del primer byte = 0)
    bytes[0] &= 0xfe;
    
    // Asegurar que no es globally unique (bit 1 del primer byte = 1 para locally administered)
    bytes[0] |= 0x02;
  }
  
  return bytesToMac(bytes);
}

// =============================================================================
// FRAME CREATION
// =============================================================================

/**
 * Crea un frame Ethernet
 */
export function createFrame(options: {
  dstMAC: string;
  srcMAC: string;
  ethertype?: number;
  payload: Uint8Array;
  vlanTag?: VLANTag;
}): EthernetFrame {
  const {
    dstMAC,
    srcMAC,
    ethertype = ETHERTYPES.IPv4,
    payload,
    vlanTag
  } = options;
  
  // Validar MACs
  if (!isValidMAC(dstMAC)) {
    throw new Error(`Invalid destination MAC: ${dstMAC}`);
  }
  if (!isValidMAC(srcMAC)) {
    throw new Error(`Invalid source MAC: ${srcMAC}`);
  }
  
  // Validar payload size
  const minPayload = MIN_FRAME_SIZE - ETHERNET_HEADER_SIZE - FCS_SIZE;
  if (payload.length < minPayload && !vlanTag) {
    // Padding sería necesario en frames pequeños
    // Por ahora solo advertimos
  }
  
  return {
    dstMAC: normalizeMAC(dstMAC),
    srcMAC: normalizeMAC(srcMAC),
    ethertype,
    payload,
    vlanTag
  };
}

/**
 * Crea un frame de broadcast
 */
export function createBroadcastFrame(options: {
  srcMAC: string;
  ethertype?: number;
  payload: Uint8Array;
  vlanTag?: VLANTag;
}): EthernetFrame {
  return createFrame({
    ...options,
    dstMAC: SPECIAL_MACS.BROADCAST
  });
}

// =============================================================================
// FRAME SERIALIZATION
// =============================================================================

/**
 * Serializa un frame Ethernet a bytes
 */
export function serializeFrame(frame: EthernetFrame): Uint8Array {
  const hasVLAN = frame.vlanTag !== undefined;
  const headerSize = ETHERNET_HEADER_SIZE + (hasVLAN ? 4 : 0);
  const totalSize = headerSize + frame.payload.length + FCS_SIZE;
  
  const bytes = new Uint8Array(totalSize);
  const view = new DataView(bytes.buffer);
  
  let offset = 0;
  
  // Destination MAC (6 bytes)
  const dstBytes = macToBytes(frame.dstMAC);
  bytes.set(dstBytes, offset);
  offset += 6;
  
  // Source MAC (6 bytes)
  const srcBytes = macToBytes(frame.srcMAC);
  bytes.set(srcBytes, offset);
  offset += 6;
  
  // VLAN Tag (optional, 4 bytes)
  if (frame.vlanTag) {
    // TPID (Tag Protocol Identifier) = 0x8100
    view.setUint16(offset, ETHERTYPES.VLAN, false);
    offset += 2;
    
    // TCI (Tag Control Information)
    const tci = ((frame.vlanTag.pcp & 0x07) << 13) |
                ((frame.vlanTag.dei ? 1 : 0) << 12) |
                (frame.vlanTag.vid & 0x0FFF);
    view.setUint16(offset, tci, false);
    offset += 2;
  }
  
  // Ethertype (2 bytes)
  view.setUint16(offset, frame.ethertype, false);
  offset += 2;
  
  // Payload
  bytes.set(frame.payload, offset);
  offset += frame.payload.length;
  
  // FCS (CRC-32) - si no está provisto, calcularlo
  const fcs = frame.fcs ?? calculateFCS(bytes.subarray(0, offset));
  view.setUint32(offset, fcs, false);
  
  return bytes;
}

/**
 * Parsea bytes a un frame Ethernet
 */
export function parseFrame(data: Uint8Array): EthernetFrame {
  if (data.length < MIN_FRAME_SIZE) {
    throw new Error(`Frame too small: ${data.length} bytes (minimum ${MIN_FRAME_SIZE})`);
  }
  
  const view = new DataView(data.buffer, data.byteOffset);
  let offset = 0;
  
  // Destination MAC (6 bytes)
  const dstMAC = bytesToMac(data.subarray(offset, offset + 6));
  offset += 6;
  
  // Source MAC (6 bytes)
  const srcMAC = bytesToMac(data.subarray(offset, offset + 6));
  offset += 6;
  
  // Check for VLAN tag (Ethertype = 0x8100)
  let ethertype = view.getUint16(offset, false);
  let vlanTag: VLANTag | undefined;
  
  if (ethertype === ETHERTYPES.VLAN) {
    offset += 2;
    
    // TCI (Tag Control Information)
    const tci = view.getUint16(offset, false);
    offset += 2;
    
    vlanTag = {
      pcp: (tci >> 13) & 0x07,
      dei: ((tci >> 12) & 0x01) === 1,
      vid: tci & 0x0FFF
    };
    
    // Real ethertype after VLAN tag
    ethertype = view.getUint16(offset, false);
  }
  
  offset += 2;
  
  // Payload (rest of frame minus FCS)
  const payloadLength = data.length - offset - FCS_SIZE;
  const payload = data.subarray(offset, offset + payloadLength);
  offset += payloadLength;
  
  // FCS
  const fcs = view.getUint32(offset, false);
  
  return {
    dstMAC,
    srcMAC,
    ethertype,
    payload,
    vlanTag,
    fcs
  };
}

/**
 * Calcula el CRC-32 (FCS) para un frame
 * Implementación simplificada usando tabla precomputada
 */
export function calculateFCS(data: Uint8Array): number {
  // Tabla CRC-32 IEEE 802.3 (polinomio 0x04C11DB7)
  // Usamos el polinomio reflejado estándar 0xEDB88320
  const CRC32_TABLE = new Uint32Array(256);
  
  for (let i = 0; i < 256; i++) {
    let crc = i;
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ ((crc & 1) ? 0xEDB88320 : 0);
    }
    CRC32_TABLE[i] = crc;
  }
  
  let crc = 0xFFFFFFFF;
  
  for (let i = 0; i < data.length; i++) {
    crc = CRC32_TABLE[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
  }
  
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

/**
 * Verifica el FCS de un frame
 */
export function verifyFCS(frame: EthernetFrame, data: Uint8Array): boolean {
  if (!frame.fcs) return true; // Sin FCS para verificar
  
  const headerSize = ETHERNET_HEADER_SIZE + (frame.vlanTag ? 4 : 0);
  const headerAndPayload = data.subarray(0, headerSize + frame.payload.length);
  const calculated = calculateFCS(headerAndPayload);
  
  return calculated === frame.fcs;
}

// =============================================================================
// FRAME STATS
// =============================================================================

/**
 * Calcula estadísticas de un frame
 */
export function getFrameStats(frame: EthernetFrame): FrameStats {
  const headerBytes = ETHERNET_HEADER_SIZE + (frame.vlanTag ? 4 : 0);
  const payloadBytes = frame.payload.length;
  const totalBytes = headerBytes + payloadBytes + FCS_SIZE;
  
  const errors: string[] = [];
  
  // Validaciones
  if (payloadBytes < 46 && !frame.vlanTag) {
    errors.push('Payload too small (runt frame)');
  }
  if (payloadBytes > 1500) {
    errors.push('Payload too large');
  }
  if (!isValidMAC(frame.srcMAC)) {
    errors.push('Invalid source MAC');
  }
  if (!isValidMAC(frame.dstMAC)) {
    errors.push('Invalid destination MAC');
  }
  
  return {
    totalBytes,
    headerBytes,
    payloadBytes,
    tagged: frame.vlanTag !== undefined,
    valid: errors.length === 0,
    error: errors.length > 0 ? errors.join('; ') : undefined
  };
}

/**
 * Obtiene el nombre del ethertype
 */
export function getEthertypeName(ethertype: number): string {
  const names: Record<number, string> = {
    [ETHERTYPES.IPv4]: 'IPv4',
    [ETHERTYPES.IPv6]: 'IPv6',
    [ETHERTYPES.ARP]: 'ARP',
    [ETHERTYPES.VLAN]: 'VLAN',
    [ETHERTYPES.QINQ]: 'QinQ',
    [ETHERTYPES.LLDP]: 'LLDP',
    [ETHERTYPES.CDP]: 'CDP',
    [ETHERTYPES.STP]: 'STP',
    [ETHERTYPES.PAUSE]: 'PAUSE'
  };
  
  return names[ethertype] ?? `0x${ethertype.toString(16).padStart(4, '0')}`;
}

/**
 * Describe un frame en formato legible
 */
export function describeFrame(frame: EthernetFrame): string {
  const vlanStr = frame.vlanTag ? ` [VLAN ${frame.vlanTag.vid}]` : '';
  const typeStr = getEthertypeName(frame.ethertype);
  const sizeStr = `${getFrameStats(frame).totalBytes} bytes`;
  
  return `${frame.srcMAC} -> ${frame.dstMAC}${vlanStr} ${typeStr} (${sizeStr})`;
}
