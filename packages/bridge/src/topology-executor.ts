import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { 
  type DeviceSnapshot, 
  type Snapshot, 
  type PTEvent 
} from './schemas.ts';

// ============================================
// Types
// ============================================

const BRIDGE_BASE_URL = "http://127.0.0.1:54321";

export interface VlanDemoDevice {
  name: string;
  type: 'router' | 'switch' | 'pc';
  x: number;
  y: number;
  ptType?: number;
  model?: string;
}

export interface VlanDemoVlan {
  id: number;
  name: string;
}

export interface VlanDemoLink {
  from: string;
  fromInterface: string;
  to: string;
  toInterface: string;
  type: string;
}

export interface VlanDemoTemplate {
  name: string;
  description: string;
  devices: VlanDemoDevice[];
  vlans: VlanDemoVlan[];
  links: VlanDemoLink[];
}

// ============================================
// Internal Helpers
// ============================================

async function sendCommand<T = unknown>(
  kind: 'eval' | 'snapshot',
  code?: string,
  payload?: unknown,
  withSnapshot = false
): Promise<T> {
  const res = await fetch(`${BRIDGE_BASE_URL}/queue`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind, code, payload, withSnapshot })
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(`Bridge error: ${JSON.stringify(error)}`);
  }

  const data = await res.json();
  const commandId = data.packet?.id;

  // Esperar el resultado en /events (simplificado para esta implementación)
  // En una implementación real, usaríamos polling o websockets
  return await waitForResult<T>(commandId);
}

async function waitForResult<T>(commandId: string, timeout = 15000): Promise<T> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const res = await fetch(`${BRIDGE_BASE_URL}/events?limit=10`);
    if (res.ok) {
      const events = (await res.json()) as PTEvent[];
      const resultEvent = events.find(e => e.type === 'result' && e.id === commandId);
      if (resultEvent && resultEvent.type === 'result') {
        if (resultEvent.ok) return resultEvent.value as T;
        throw new Error(`Command failed: ${JSON.stringify(resultEvent.value)}`);
      }
      const errorEvent = events.find(e => e.type === 'error' && e.id === commandId);
      if (errorEvent && errorEvent.type === 'error') {
        throw new Error(`Bridge execution error: ${errorEvent.message}`);
      }
    }
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error(`Timeout waiting for command ${commandId}`);
}

// ============================================
// Query Functions
// ============================================

export async function getTopologySnapshot(): Promise<Snapshot> {
  return await sendCommand<Snapshot>('snapshot');
}

// ============================================
// Device Management Functions
// ============================================

const CT = {
  straight: 8100, cross: 8101, fiber: 8103, serial: 8106,
  auto: 8107, console: 8108, wireless: 8109, coaxial: 8110
};

export async function addDevice(
  name: string,
  ptType: number,
  x: number,
  y: number,
  model?: string
): Promise<string> {
  const code = `return addDevice(${JSON.stringify(name)}, ${JSON.stringify(model || "")}, ${x}, ${y});`;
  return await sendCommand<string>('eval', code);
}

export async function connectDevices(
  dev1: string,
  port1: string,
  dev2: string,
  port2: string,
  cableType: keyof typeof CT = 'straight'
): Promise<boolean> {
  const typeId = CT[cableType] || CT.auto;
  const code = `return addLink(${JSON.stringify(dev1)}, ${JSON.stringify(port1)}, ${JSON.stringify(dev2)}, ${JSON.stringify(port2)}, ${typeId});`;
  return await sendCommand<boolean>('eval', code);
}

export async function configureDevice(
  deviceName: string,
  commands: string | string[]
): Promise<void> {
  const cmds = Array.isArray(commands) ? commands.join('\n') : commands;
  const code = `return configureIosDevice(${JSON.stringify(deviceName)}, ${JSON.stringify(cmds)});`;
  await sendCommand('eval', code);
}

// ============================================
// VLAN Demo Template Execution
// ============================================

const PT_TYPE_ID_MAP: Record<string, number> = {
  router: 0,
  switch: 1,
  pc: 8,
};

const PT_MODEL_MAP: Record<string, string> = {
  router: '1941',
  switch: '2960-24TT',
  pc: 'PC-PT',
};

export async function executeVlanDemo(templatePath?: string): Promise<void> {
  const defaultPath = join(process.cwd(), '.iflow/skills/cisco-networking-assistant/assets/templates/vlan-demo.json');
  const path = templatePath || defaultPath;

  if (!existsSync(path)) throw new Error(`Template not found: ${path}`);
  const template: VlanDemoTemplate = JSON.parse(readFileSync(path, 'utf-8'));

  console.log(`[TopologyExecutor] Executing VLAN demo: ${template.name}`);

  for (const device of template.devices) {
    const ptType = device.ptType ?? PT_TYPE_ID_MAP[device.type] ?? 0;
    const model = device.model ?? PT_MODEL_MAP[device.type] ?? '';
    await addDevice(device.name, ptType, device.x, device.y, model);
    console.log(`  ✓ ${device.name}`);
  }

  for (const link of template.links) {
    await connectDevices(link.from, link.fromInterface, link.to, link.toInterface, link.type as any);
    console.log(`  ✓ ${link.from} ↔ ${link.to}`);
  }

  // Configuración de IOS para los equipos
  for (const device of template.devices) {
    if (device.type === 'router' || device.type === 'switch') {
      // Aquí se generarían los comandos reales usando los generadores de core
      // Por brevedad en la demo, mandamos comandos básicos
      const demoCmds = [
        'enable',
        'conf t',
        `hostname ${device.name}`,
        'end'
      ];
      await configureDevice(device.name, demoCmds);
    }
  }

  console.log('[TopologyExecutor] ✓ VLAN demo complete');
}
