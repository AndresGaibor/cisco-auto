/**
 * Handlers de eventos para dispositivos
 */

import type { SimEvent, SimEngine } from '@cisco-auto/sim-engine';
import type { RuntimeState, DeviceRuntime, InterfaceRuntime } from './runtime';
import { NetworkEventType } from '@cisco-auto/sim-engine';

/**
 * Contexto del handler
 */
export interface HandlerContext {
  event: SimEvent;
  engine: SimEngine;
  runtime: RuntimeState;
  device: DeviceRuntime;
}

/**
 * Procesa un frame recibido en un switch
 */
export function handleFrameReceiveSwitch(ctx: HandlerContext): void {
  const { event, runtime, device } = ctx;
  const payload = event.payload as { port: string; frame: { srcMAC: string; dstMAC: string; vlanTag?: number } };
  
  const { port, frame } = payload;
  const iface = device.interfaces.get(port);
  
  if (!iface || iface.adminStatus === 'down') {
    // Interface down, drop frame
    runtime.stats.packetsDropped++;
    return;
  }
  
  // Actualizar contadores
  iface.rxPackets++;
  iface.rxBytes += 64; // Simplified
  
  // Aprender MAC origen
  learnMAC(device, frame.srcMAC, port, frame.vlanTag ?? 1, runtime.now);
  
  // Registrar en traza
  runtime.traceBuffer.push({
    at: runtime.now,
    type: 'frame_rx',
    sourceDevice: device.id,
    description: `Frame received on ${port}: ${frame.srcMAC} -> ${frame.dstMAC}`,
    payload
  });
  
  // Decidir forwarding
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
  const { event, engine, runtime, device } = ctx;
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
    // Unicast conocido
    scheduleFrameTransmit(ctx, entry.port, frame);
  } else {
    // Unicast desconocido, flood
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
  const { device, runtime, engine } = ctx;
  
  for (const [portName, iface] of device.interfaces) {
    if (portName === inPort) continue;
    if (iface.adminStatus === 'down') continue;
    
    // Verificar VLAN
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
  
  // Actualizar contadores
  iface.txPackets++;
  iface.txBytes += 64; // Simplified
  
  // Programar evento de transmisión
  engine.schedule({
    at: runtime.now + 1, // 1 time unit delay
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

/**
 * Handler para ARP request
 */
export function handleARPRequest(ctx: HandlerContext): void {
  const { event, runtime, device } = ctx;
  const arp = event.payload as { senderMAC: string; senderIP: string; targetIP: string };
  
  // Verificar si tenemos la IP objetivo
  for (const [name, iface] of device.interfaces) {
    if (iface.ip === arp.targetIP) {
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
      device.arpTable.set(arp.senderIP, {
        ip: arp.senderIP,
        mac: arp.senderMAC,
        interface: name,
        learnedAt: runtime.now,
        static: false,
        state: 'reachable'
      });
      
      break;
    }
  }
}

/**
 * Handler para ARP reply
 */
export function handleARPReply(ctx: HandlerContext): void {
  const { event, runtime, device } = ctx;
  const arp = event.payload as { senderMAC: string; senderIP: string };
  
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
    description: `ARP reply: ${arp.senderIP} is at ${arp.senderMAC}`
  });
}

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
