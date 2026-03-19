/**
 * Handlers de eventos para dispositivos
 * 
 * Incluye handlers para L2 (switching) y L3 (routing)
 */

import type { SimEvent, SimEngine } from '@cisco-auto/sim-engine';
import type { RuntimeState, DeviceRuntime, InterfaceRuntime } from './runtime';
import { NetworkEventType, type FramePayload, type PacketPayload, type ARPPayload, type ICMPEchoPayload } from '@cisco-auto/sim-engine';

// Import L3 protocols
import { 
  ARPCache, 
  createARPRequest, 
  createARPReply, 
  createGratuitousARP,
  arpPacketToPayload,
  type ARPPacket
} from './protocols/arp';

import {
  IPv4Packet,
  createIPv4Packet,
  deserializeIPv4,
  serializeIPv4,
  decrementTTL,
  isValidIP,
  isBroadcastIP,
  getNetworkAddress,
  IPProtocol,
  ipToNumber
} from './protocols/ipv4';

import {
  ICMPType,
  ICMPEcho,
  createEchoReplyFromRequest,
  createTimeExceededResponse,
  createDestinationUnreachableResponse,
  DestinationUnreachableCode,
  TimeExceededCode,
  deserializeICMP,
  serializeICMP,
  isICMPEcho
} from './protocols/icmp';

import {
  RoutingTable,
  generateConnectedRoutes,
  type RouteLookupResult
} from './protocols/routing';

// =============================================================================
// HANDLER CONTEXT
// =============================================================================

/**
 * Contexto del handler
 */
export interface HandlerContext {
  event: SimEvent;
  engine: SimEngine;
  runtime: RuntimeState;
  device: DeviceRuntime;
}

// =============================================================================
// L2 HANDLERS (SWITCHING)
// =============================================================================

/**
 * Procesa un frame recibido en un switch
 */
export function handleFrameReceiveSwitch(ctx: HandlerContext): void {
  const { event, runtime, device } = ctx;
  const payload = event.payload as { port: string; frame: { srcMAC: string; dstMAC: string; vlanTag?: number } };
  
  const { port, frame } = payload;
  const iface = device.interfaces.get(port);
  
  if (!iface || iface.adminStatus === 'down') {
    runtime.stats.packetsDropped++;
    return;
  }
  
  iface.rxPackets++;
  iface.rxBytes += 64;
  
  // Aprender MAC origen
  learnMAC(device, frame.srcMAC, port, frame.vlanTag ?? 1, runtime.now);
  
  runtime.traceBuffer.push({
    at: runtime.now,
    type: 'frame_rx',
    sourceDevice: device.id,
    description: `Frame received on ${port}: ${frame.srcMAC} -> ${frame.dstMAC}`,
    payload
  });
  
  forwardFrame(ctx, frame, port);
}

/**
 * Aprende una dirección MAC
 */
function learnMAC(
  device: DeviceRuntime,
  mac: string,
  port: string,
  vlan: number,
  now: number
): void {
  const key = `${vlan}:${mac}`;
  device.macTable.set(key, {
    mac,
    vlan,
    port,
    learnedAt: now,
    static: false
  });
}

/**
 * Reenvía un frame
 */
function forwardFrame(
  ctx: HandlerContext,
  frame: { srcMAC: string; dstMAC: string; vlanTag?: number; data?: Uint8Array },
  inPort: string
): void {
  const { runtime, device } = ctx;
  const vlan = frame.vlanTag ?? 1;
  
  // Broadcast MAC
  if (frame.dstMAC === 'ff:ff:ff:ff:ff:ff') {
    floodFrame(ctx, frame, inPort, vlan);
    return;
  }
  
  // Buscar en tabla MAC
  const key = `${vlan}:${frame.dstMAC}`;
  const entry = device.macTable.get(key);
  
  if (entry && entry.port !== inPort) {
    scheduleFrameTransmit(ctx, entry.port, frame);
  } else {
    floodFrame(ctx, frame, inPort, vlan);
  }
}

/**
 * Inunda un frame por todos los puertos de la VLAN
 */
function floodFrame(
  ctx: HandlerContext,
  frame: { srcMAC: string; dstMAC: string; vlanTag?: number; data?: Uint8Array },
  inPort: string,
  vlan: number
): void {
  const { device } = ctx;
  
  for (const [portName, iface] of device.interfaces) {
    if (portName === inPort) continue;
    if (iface.adminStatus === 'down') continue;
    
    if (iface.switchportMode === 'access' && iface.vlan !== vlan) continue;
    if (iface.switchportMode === 'trunk' && !iface.allowedVlans?.includes(vlan)) continue;
    
    scheduleFrameTransmit(ctx, portName, frame);
  }
}

/**
 * Programa la transmisión de un frame
 */
function scheduleFrameTransmit(
  ctx: HandlerContext,
  port: string,
  frame: { srcMAC: string; dstMAC: string; vlanTag?: number; data?: Uint8Array }
): void {
  const { device, runtime, engine } = ctx;
  const iface = device.interfaces.get(port);
  
  if (!iface) return;
  
  iface.txPackets++;
  iface.txBytes += 64;
  
  engine.schedule({
    at: runtime.now + 1,
    priority: 10,
    type: NetworkEventType.FRAME_TRANSMIT,
    sourceDevice: device.id,
    targetDevice: device.id,
    payload: { port, frame }
  });
  
  runtime.stats.framesSent++;
}

/**
 * Handler para frame transmit
 */
export function handleFrameTransmit(ctx: HandlerContext): void {
  const { event, runtime, device } = ctx;
  const payload = event.payload as { port: string; frame: unknown };
  
  runtime.traceBuffer.push({
    at: runtime.now,
    type: 'frame_tx',
    sourceDevice: device.id,
    description: `Frame transmitted on ${payload.port}`,
    payload
  });
}

// =============================================================================
// L3 HANDLERS (ROUTING)
// =============================================================================

/**
 * Procesa un paquete IP recibido en un router
 */
export function handleIPPacketReceive(ctx: HandlerContext): void {
  const { event, runtime, device } = ctx;
  const payload = event.payload as { 
    port: string; 
    packet: IPv4Packet;
    srcMAC: string;
  };
  
  const { port, packet, srcMAC } = payload;
  const iface = device.interfaces.get(port);
  
  if (!iface || iface.adminStatus === 'down') {
    runtime.stats.packetsDropped++;
    return;
  }
  
  // Actualizar ARP cache con info del sender
  if (iface.ip) {
    updateARPTable(device, packet.srcIP, srcMAC, port, runtime.now);
  }
  
  runtime.traceBuffer.push({
    at: runtime.now,
    type: 'ip_rx',
    sourceDevice: device.id,
    description: `IP packet received: ${packet.srcIP} -> ${packet.dstIP}`,
    payload: { port, srcIP: packet.srcIP, dstIP: packet.dstIP }
  });
  
  // Verificar si el paquete es para nosotros
  if (isPacketForUs(device, packet)) {
    handleLocalPacket(ctx, packet, port);
  } else {
    // Forwarding
    forwardIPPacket(ctx, packet, port);
  }
}

/**
 * Verifica si un paquete IP es para el dispositivo local
 */
function isPacketForUs(device: DeviceRuntime, packet: IPv4Packet): boolean {
  // Verificar si la IP destino está en alguna de nuestras interfaces
  for (const [, iface] of device.interfaces) {
    if (iface.ip === packet.dstIP) {
      return true;
    }
    
    // Verificar broadcast de la subred
    if (iface.ip && iface.subnetMask && isBroadcastIP(packet.dstIP, iface.ip, iface.subnetMask)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Procesa un paquete destinado al dispositivo local
 */
function handleLocalPacket(ctx: HandlerContext, packet: IPv4Packet, inPort: string): void {
  const { runtime, device, engine } = ctx;
  
  // Verificar protocolo
  if (packet.protocol === IPProtocol.ICMP) {
    handleLocalICMP(ctx, packet, inPort);
  } else {
    // Otros protocolos - por ahora solo log
    runtime.traceBuffer.push({
      at: runtime.now,
      type: 'ip_local',
      sourceDevice: device.id,
      description: `Local IP packet: protocol ${packet.protocol}`,
      payload: { srcIP: packet.srcIP, dstIP: packet.dstIP, protocol: packet.protocol }
    });
  }
}

/**
 * Maneja ICMP local
 */
function handleLocalICMP(ctx: HandlerContext, packet: IPv4Packet, inPort: string): void {
  const { runtime, device, engine } = ctx;
  
  const icmpPacket = deserializeICMP(packet.payload);
  if (!icmpPacket) {
    runtime.stats.packetsDropped++;
    return;
  }
  
  // Echo Request (ping)
  if (isICMPEcho(icmpPacket) && icmpPacket.type === ICMPType.ECHO_REQUEST) {
    const inIface = device.interfaces.get(inPort);
    if (!inIface || !inIface.ip) return;
    
    // Crear Echo Reply
    const replyPacket = createEchoReplyFromRequest(icmpPacket, inIface.ip, packet.srcIP);
    const replyData = serializeIPv4(replyPacket);
    
    // Encapsular en frame y enviar
    const srcMAC = inIface.mac;
    const dstMAC = device.arpTable.get(packet.srcIP)?.mac ?? 'ff:ff:ff:ff:ff:ff';
    
    const frame = {
      srcMAC,
      dstMAC,
      data: replyData
    };
    
    scheduleFrameTransmit(ctx, inPort, frame);
    
    runtime.traceBuffer.push({
      at: runtime.now,
      type: 'icmp_reply',
      sourceDevice: device.id,
      description: `ICMP Echo Reply sent: ${inIface.ip} -> ${packet.srcIP}`,
      payload: { id: icmpPacket.identifier, seq: icmpPacket.sequenceNumber }
    });
  }
}

/**
 * Reenvía un paquete IP
 */
function forwardIPPacket(ctx: HandlerContext, packet: IPv4Packet, inPort: string): void {
  const { runtime, device, engine } = ctx;
  
  // Decrementar TTL
  if (!decrementTTL(packet)) {
    // TTL expirado - enviar Time Exceeded
    sendTimeExceeded(ctx, packet, inPort);
    return;
  }
  
  // Buscar ruta
  const routeResult = lookupRoute(device, packet.dstIP);
  
  if (!routeResult.route) {
    // No route to destination - enviar Destination Unreachable
    sendDestinationUnreachable(ctx, packet, inPort, DestinationUnreachableCode.NETWORK_UNREACHABLE);
    return;
  }
  
  const outIface = device.interfaces.get(routeResult.interface!);
  if (!outIface || outIface.adminStatus === 'down') {
    sendDestinationUnreachable(ctx, packet, inPort, DestinationUnreachableCode.HOST_UNREACHABLE);
    return;
  }
  
  // Determinar next hop
  const nextHop = routeResult.nextHop ?? packet.dstIP;
  
  // Verificar ARP para next hop
  const arpEntry = device.arpTable.get(nextHop);
  
  if (!arpEntry || arpEntry.state === 'incomplete') {
    // Necesitamos hacer ARP request
    queuePacketWaitingARP(ctx, packet, nextHop, routeResult.interface!);
    sendARPRequestForIP(ctx, nextHop, routeResult.interface!, outIface);
    return;
  }
  
  // Encapsular y enviar
  const frame = {
    srcMAC: outIface.mac,
    dstMAC: arpEntry.mac,
    data: serializeIPv4(packet)
  };
  
  scheduleFrameTransmit(ctx, routeResult.interface!, frame);
  
  runtime.traceBuffer.push({
    at: runtime.now,
    type: 'ip_forward',
    sourceDevice: device.id,
    description: `IP forwarded: ${packet.srcIP} -> ${packet.dstIP} via ${nextHop}`,
    payload: { inPort, outPort: routeResult.interface, nextHop }
  });
}

/**
 * Lookup de ruta
 */
function lookupRoute(device: DeviceRuntime, dstIP: string): RouteLookupResult {
  // Crear tabla de rutas temporal desde routingTable
  const routingTable = new RoutingTable();
  
  for (const route of device.routingTable) {
    routingTable.addRoute(route);
  }
  
  return routingTable.lookup(dstIP);
}

/**
 * Envía mensaje Time Exceeded
 */
function sendTimeExceeded(
  ctx: HandlerContext,
  originalPacket: IPv4Packet,
  inPort: string
): void {
  const { runtime, device, engine } = ctx;
  const inIface = device.interfaces.get(inPort);
  
  if (!inIface || !inIface.ip) return;
  
  const timeExceededPacket = createTimeExceededResponse(
    originalPacket,
    inIface.ip,
    originalPacket.srcIP
  );
  
  const data = serializeIPv4(timeExceededPacket);
  const frame = {
    srcMAC: inIface.mac,
    dstMAC: device.arpTable.get(originalPacket.srcIP)?.mac ?? 'ff:ff:ff:ff:ff:ff',
    data
  };
  
  scheduleFrameTransmit(ctx, inPort, frame);
  
  runtime.traceBuffer.push({
    at: runtime.now,
    type: 'icmp_time_exceeded',
    sourceDevice: device.id,
    description: `ICMP Time Exceeded sent to ${originalPacket.srcIP}`,
    payload: { originalDst: originalPacket.dstIP }
  });
  
  runtime.stats.packetsDropped++;
}

/**
 * Envía mensaje Destination Unreachable
 */
function sendDestinationUnreachable(
  ctx: HandlerContext,
  originalPacket: IPv4Packet,
  inPort: string,
  code: DestinationUnreachableCode
): void {
  const { runtime, device } = ctx;
  const inIface = device.interfaces.get(inPort);
  
  if (!inIface || !inIface.ip) return;
  
  const destUnreachPacket = createDestinationUnreachableResponse(
    originalPacket,
    code,
    inIface.ip,
    originalPacket.srcIP
  );
  
  const data = serializeIPv4(destUnreachPacket);
  const frame = {
    srcMAC: inIface.mac,
    dstMAC: device.arpTable.get(originalPacket.srcIP)?.mac ?? 'ff:ff:ff:ff:ff:ff',
    data
  };
  
  scheduleFrameTransmit(ctx, inPort, frame);
  
  runtime.traceBuffer.push({
    at: runtime.now,
    type: 'icmp_dest_unreach',
    sourceDevice: device.id,
    description: `ICMP Destination Unreachable sent to ${originalPacket.srcIP}`,
    payload: { originalDst: originalPacket.dstIP, code }
  });
  
  runtime.stats.packetsDropped++;
}

// =============================================================================
// ARP HANDLERS
// =============================================================================

/**
 * Cola de paquetes esperando ARP
 */
const packetsWaitingARP = new Map<string, Array<{ packet: IPv4Packet; outPort: string }>>();

/**
 * Actualiza la tabla ARP
 */
function updateARPTable(
  device: DeviceRuntime,
  ip: string,
  mac: string,
  iface: string,
  now: number
): void {
  device.arpTable.set(ip, {
    ip,
    mac,
    interface: iface,
    learnedAt: now,
    static: false,
    state: 'reachable'
  });
}

/**
 * Handler para ARP request
 */
export function handleARPRequest(ctx: HandlerContext): void {
  const { event, runtime, device } = ctx;
  const arp = event.payload as ARPPayload;
  
  runtime.traceBuffer.push({
    at: runtime.now,
    type: 'arp_request',
    sourceDevice: device.id,
    description: `ARP Request: Who has ${arp.targetIP}? Tell ${arp.senderIP}`,
    payload: arp
  });
  
  // Verificar si tenemos la IP objetivo
  for (const [name, iface] of device.interfaces) {
    if (iface.ip === arp.targetIP && iface.adminStatus === 'up') {
      // Responder con ARP reply
      ctx.engine.schedule({
        at: runtime.now + 1,
        priority: 5,
        type: NetworkEventType.ARP_REPLY,
        sourceDevice: device.id,
        targetDevice: device.id,
        payload: {
          operation: 'reply',
          senderMAC: iface.mac,
          senderIP: arp.targetIP,
          targetMAC: arp.senderMAC,
          targetIP: arp.senderIP
        }
      });
      
      // Actualizar ARP cache con info del sender
      updateARPTable(device, arp.senderIP, arp.senderMAC, name, runtime.now);
      
      break;
    }
  }
}

/**
 * Handler para ARP reply
 */
export function handleARPReply(ctx: HandlerContext): void {
  const { event, runtime, device } = ctx;
  const arp = event.payload as ARPPayload;
  
  // Actualizar ARP cache
  device.arpTable.set(arp.senderIP, {
    ip: arp.senderIP,
    mac: arp.senderMAC,
    interface: 'unknown',
    learnedAt: runtime.now,
    static: false,
    state: 'reachable'
  });
  
  runtime.traceBuffer.push({
    at: runtime.now,
    type: 'arp_reply',
    sourceDevice: device.id,
    description: `ARP Reply: ${arp.senderIP} is at ${arp.senderMAC}`
  });
  
  // Procesar paquetes encolados esperando esta ARP
  const waiting = packetsWaitingARP.get(arp.senderIP);
  if (waiting) {
    packetsWaitingARP.delete(arp.senderIP);
    
    for (const { packet, outPort } of waiting) {
      const outIface = device.interfaces.get(outPort);
      if (!outIface) continue;
      
      const frame = {
        srcMAC: outIface.mac,
        dstMAC: arp.senderMAC,
        data: serializeIPv4(packet)
      };
      
      scheduleFrameTransmit(ctx, outPort, frame);
    }
  }
}

/**
 * Encola un paquete esperando resolución ARP
 */
function queuePacketWaitingARP(
  ctx: HandlerContext,
  packet: IPv4Packet,
  targetIP: string,
  outPort: string
): void {
  let queue = packetsWaitingARP.get(targetIP);
  if (!queue) {
    queue = [];
    packetsWaitingARP.set(targetIP, queue);
  }
  queue.push({ packet, outPort });
}

/**
 * Envía ARP request para una IP
 */
function sendARPRequestForIP(
  ctx: HandlerContext,
  targetIP: string,
  outPort: string,
  outIface: InterfaceRuntime
): void {
  const { runtime, device, engine } = ctx;
  
  if (!outIface.ip) return;
  
  const arpRequest = createARPRequest(outIface.mac, outIface.ip, targetIP);
  
  const frame = {
    srcMAC: outIface.mac,
    dstMAC: 'ff:ff:ff:ff:ff:ff',
    data: new Uint8Array(0), // ARP va en payload, no en data
    ethertype: 0x0806
  };
  
  // Enviar como evento ARP
  engine.schedule({
    at: runtime.now + 1,
    priority: 5,
    type: NetworkEventType.ARP_REQUEST,
    sourceDevice: device.id,
    targetDevice: device.id,
    payload: arpPacketToPayload(arpRequest)
  });
  
  // Marcar en ARP table como incomplete
  device.arpTable.set(targetIP, {
    ip: targetIP,
    mac: '00:00:00:00:00:00',
    interface: outPort,
    learnedAt: runtime.now,
    static: false,
    state: 'incomplete'
  });
  
  runtime.traceBuffer.push({
    at: runtime.now,
    type: 'arp_request_sent',
    sourceDevice: device.id,
    description: `ARP Request sent: Who has ${targetIP}?`,
    payload: { targetIP, outPort }
  });
}

// =============================================================================
// ICMP HANDLERS
// =============================================================================

/**
 * Handler para ICMP Echo Request
 */
export function handleICMPEchoRequest(ctx: HandlerContext): void {
  const { event, runtime, device } = ctx;
  const payload = event.payload as ICMPEchoPayload & { srcIP: string; dstIP: string; port: string };
  
  runtime.traceBuffer.push({
    at: runtime.now,
    type: 'icmp_echo_req',
    sourceDevice: device.id,
    description: `ICMP Echo Request: ${payload.srcIP} -> ${payload.dstIP}`,
    payload
  });
}

/**
 * Handler para ICMP Echo Reply
 */
export function handleICMPEchoReply(ctx: HandlerContext): void {
  const { event, runtime, device } = ctx;
  const payload = event.payload as ICMPEchoPayload & { srcIP: string; dstIP: string };
  
  runtime.traceBuffer.push({
    at: runtime.now,
    type: 'icmp_echo_reply',
    sourceDevice: device.id,
    description: `ICMP Echo Reply: ${payload.srcIP} -> ${payload.dstIP}`,
    payload
  });
}

// =============================================================================
// ROUTER INITIALIZATION
// =============================================================================

/**
 * Inicializa la tabla de rutas de un router con rutas conectadas
 */
export function initializeRouterRoutes(device: DeviceRuntime): void {
  const interfaces = Array.from(device.interfaces.values()).map(iface => ({
    name: iface.name,
    ip: iface.ip,
    subnetMask: iface.subnetMask,
    linkStatus: iface.linkStatus
  }));
  
  const connectedRoutes = generateConnectedRoutes(interfaces);
  
  for (const route of connectedRoutes) {
    device.routingTable.push(route);
  }
}

// =============================================================================
// HANDLER REGISTRATION
// =============================================================================

/**
 * Registra todos los handlers para un dispositivo tipo switch
 */
export function registerSwitchHandlers(engine: SimEngine, runtime: RuntimeState): void {
  engine.registerHandler(NetworkEventType.FRAME_RECEIVE, (event, engine) => {
    const device = runtime.devices.get(event.sourceDevice!);
    if (device) {
      handleFrameReceiveSwitch({ event, engine, runtime, device });
    }
  });
  
  engine.registerHandler(NetworkEventType.FRAME_TRANSMIT, (event, engine) => {
    const device = runtime.devices.get(event.sourceDevice!);
    if (device) {
      handleFrameTransmit({ event, engine, runtime, device });
    }
  });
  
  engine.registerHandler(NetworkEventType.ARP_REQUEST, (event, engine) => {
    const device = runtime.devices.get(event.sourceDevice!);
    if (device) {
      handleARPRequest({ event, engine, runtime, device });
    }
  });
  
  engine.registerHandler(NetworkEventType.ARP_REPLY, (event, engine) => {
    const device = runtime.devices.get(event.sourceDevice!);
    if (device) {
      handleARPReply({ event, engine, runtime, device });
    }
  });
}

/**
 * Registra todos los handlers para un dispositivo tipo router
 */
export function registerRouterHandlers(engine: SimEngine, runtime: RuntimeState): void {
  // L2 handlers
  registerSwitchHandlers(engine, runtime);
  
  // L3 handlers
  engine.registerHandler(NetworkEventType.PACKET_RECEIVE, (event, engine) => {
    const device = runtime.devices.get(event.sourceDevice!);
    if (device) {
      handleIPPacketReceive({ event, engine, runtime, device });
    }
  });
  
  engine.registerHandler(NetworkEventType.ICMP_ECHO_REQUEST, (event, engine) => {
    const device = runtime.devices.get(event.sourceDevice!);
    if (device) {
      handleICMPEchoRequest({ event, engine, runtime, device });
    }
  });
  
  engine.registerHandler(NetworkEventType.ICMP_ECHO_REPLY, (event, engine) => {
    const device = runtime.devices.get(event.sourceDevice!);
    if (device) {
      handleICMPEchoReply({ event, engine, runtime, device });
    }
  });
}

/**
 * Registra handlers apropiados según el tipo de dispositivo
 */
export function registerDeviceHandlers(
  engine: SimEngine, 
  runtime: RuntimeState,
  deviceType: string
): void {
  switch (deviceType) {
    case 'router':
    case 'multilayer-switch':
      registerRouterHandlers(engine, runtime);
      break;
    
    case 'switch':
    default:
      registerSwitchHandlers(engine, runtime);
      break;
  }
}
