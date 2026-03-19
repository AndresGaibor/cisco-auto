/**
 * Tipos de eventos de simulación predefinidos
 */

import type { SimEvent } from './engine';

// =============================================================================
// EVENT TYPES
// =============================================================================

/**
 * Tipos de eventos de red
 */
export enum NetworkEventType {
  // L2
  FRAME_TRANSMIT = 'frame_transmit',
  FRAME_RECEIVE = 'frame_receive',
  MAC_LEARN = 'mac_learn',
  
  // L3
  PACKET_SEND = 'packet_send',
  PACKET_RECEIVE = 'packet_receive',
  ARP_REQUEST = 'arp_request',
  ARP_REPLY = 'arp_reply',
  ICMP_ECHO_REQUEST = 'icmp_echo_request',
  ICMP_ECHO_REPLY = 'icmp_echo_reply',
  
  // Control
  INTERFACE_UP = 'interface_up',
  INTERFACE_DOWN = 'interface_down',
  LINK_UP = 'link_up',
  LINK_DOWN = 'link_down',
  
  // Timer
  TIMER = 'timer',
  TIMEOUT = 'timeout',
  
  // Device
  DEVICE_START = 'device_start',
  DEVICE_STOP = 'device_stop',
  CONFIG_CHANGE = 'config_change'
}

// =============================================================================
// EVENT PAYLOADS
// =============================================================================

/**
 * Payload de frame Ethernet
 */
export interface FramePayload {
  srcMAC: string;
  dstMAC: string;
  ethertype: number;
  data: Uint8Array;
  vlanTag?: number;
}

/**
 * Payload de paquete IP
 */
export interface PacketPayload {
  srcIP: string;
  dstIP: string;
  protocol: number;
  ttl: number;
  payload: unknown;
}

/**
 * Payload de ARP
 */
export interface ARPPayload {
  operation: 'request' | 'reply';
  senderMAC: string;
  senderIP: string;
  targetMAC: string;
  targetIP: string;
}

/**
 * Payload de ICMP Echo
 */
export interface ICMPEchoPayload {
  type: 'request' | 'reply';
  id: number;
  sequence: number;
  data: Uint8Array;
}

/**
 * Payload de timer
 */
export interface TimerPayload {
  timerId: string;
  deviceId?: string;
  callback?: string;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Crea un evento de transmisión de frame
 */
export function createFrameTransmitEvent(
  at: number,
  deviceId: string,
  port: string,
  frame: FramePayload,
  priority: number = 0
): Omit<SimEvent, 'id' | 'sequence'> {
  return {
    at,
    priority,
    type: NetworkEventType.FRAME_TRANSMIT,
    sourceDevice: deviceId,
    payload: { port, frame },
    targetDevice: deviceId
  };
}

/**
 * Crea un evento de recepción de frame
 */
export function createFrameReceiveEvent(
  at: number,
  deviceId: string,
  port: string,
  frame: FramePayload,
  priority: number = 0
): Omit<SimEvent, 'id' | 'sequence'> {
  return {
    at,
    priority,
    type: NetworkEventType.FRAME_RECEIVE,
    sourceDevice: deviceId,
    payload: { port, frame },
    targetDevice: deviceId
  };
}

/**
 * Crea un evento de timer
 */
export function createTimerEvent(
  at: number,
  timerId: string,
  deviceId?: string,
  callback?: string,
  priority: number = 1000
): Omit<SimEvent, 'id' | 'sequence'> {
  return {
    at,
    priority,
    type: NetworkEventType.TIMER,
    sourceDevice: deviceId,
    payload: { timerId, deviceId, callback } as TimerPayload,
    targetDevice: deviceId
  };
}
