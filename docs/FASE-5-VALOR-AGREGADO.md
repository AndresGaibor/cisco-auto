# Fase 5: Valor Agregado

> **Estado:** ✅ COMPLETADO  
> **Tests:** 193 tests pasando  
> **Dependencias:** Fases 0-4 completadas

## Resumen de Implementación

### ✅ Completado

| Componente | Archivos | Tests | Descripción |
|------------|----------|-------|-------------|
| Validación Avanzada | `src/core/validation/` | 11 | Detección de conflictos IP, loops, mejores prácticas |
| Templates CCNA | `src/templates/ccna/` | 21 | 5 plantillas pre-configuradas |
| Visualización Topología | `src/core/topology/` | 14 | ASCII art, Mermaid, análisis estadístico |
| API REST | `src/api/` | 19 | 19 endpoints para gestión de labs |

### ❌ No Implementado (opcional/futuro)

- **Motor de simulación** - Complejidad alta, valor bajo
- **Colaboración multiusuario** - Requiere WebSocket, auth complejo

---

## Funcionalidades

### 1. Simulación Básica

Sistema simplificado para simular tráfico de red y visualizar el flujo de PDUs.

### 2. Templates de Laboratorios

Biblioteca de laboratorios pre-configurados para casos comunes (CCNA, CCNP, etc.).

### 3. API REST

Interfaz programática para integración con otras herramientas.

### 4. Validación de Conectividad

Verificación real de que la topología funciona como se espera.

---

## Estructura de Directorios

```
src/
├── simulation/                      # ← NUEVO: Motor de simulación
│   ├── index.ts
│   ├── engine.ts                    # Motor principal
│   ├── pdu.ts                       # Modelos de PDU
│   ├── event.ts                     # Eventos de simulación
│   ├── protocols/                   # Simulación por protocolo
│   │   ├── arp.ts
│   │   ├── icmp.ts
│   │   ├── tcp.ts
│   │   ├── udp.ts
│   │   └── application.ts
│   └── visualizer.ts                # Visualización
│
├── templates/                       # ← NUEVO: Templates de labs
│   ├── index.ts
│   ├── registry.ts                  # Registro de templates
│   ├── ccna/                        # Labs CCNA
│   │   ├── vlan-basics.ts
│   │   ├── static-routing.ts
│   │   ├── ospf-single-area.ts
│   │   └── acl-basics.ts
│   ├── ccnp/                        # Labs CCNP
│   │   ├── ospf-multi-area.ts
│   │   ├── bgp-basics.ts
│   │   └── etherchannel.ts
│   └── custom/                      # Templates custom
│
├── api/                             # ← NUEVO: API REST
│   ├── index.ts
│   ├── server.ts                    # Express/Fastify server
│   ├── routes/
│   │   ├── lab.routes.ts
│   │   ├── device.routes.ts
│   │   ├── deploy.routes.ts
│   │   └── simulation.routes.ts
│   ├── middleware/
│   │   ├── auth.ts
│   │   └── validation.ts
│   └── dto/
│       └── index.ts
│
└── validation/                      # ← NUEVO: Validación de conectividad
    ├── index.ts
    ├── connectivity.validator.ts
    ├── protocol.validator.ts
    └── report.ts
```

---

## Tareas Detalladas

### Tarea 5.1: Motor de Simulación Básico

**Archivo:** `src/simulation/engine.ts`

```typescript
// src/simulation/engine.ts

import type { LabSpec } from '../core/canonical/lab.spec';
import type { DeviceSpec } from '../core/canonical/device.spec';
import type { PDU, PDUType } from './pdu';
import type { SimulationEvent } from './event';

export interface SimulationConfig {
  /** Modo de simulación */
  mode: 'realtime' | 'step-by-step';
  
  /** Velocidad de simulación (1x = tiempo real) */
  speed: number;
  
  /** Máximo de eventos a simular */
  maxEvents: number;
  
  /** Detener en error */
  stopOnError: boolean;
  
  /** Capturar todos los PDUs */
  captureAll: boolean;
}

export interface SimulationState {
  /** Tiempo actual de simulación (ms) */
  currentTime: number;
  
  /** Eventos pendientes */
  pendingEvents: SimulationEvent[];
  
  /** Eventos completados */
  completedEvents: SimulationEvent[];
  
  /** PDUs en tránsito */
  inFlightPDUs: PDU[];
  
  /** Estado de dispositivos */
  deviceStates: Map<string, DeviceSimState>;
  
  /** ¿Está corriendo? */
  running: boolean;
  
  /** ¿Está pausado? */
  paused: boolean;
}

export interface DeviceSimState {
  device: DeviceSpec;
  arpTable: Map<string, string>;  // IP -> MAC
  macTable: Map<string, string>;  // MAC -> Port (switches)
  routingTable: Map<string, { nextHop: string; interface: string }>;
  interfaces: Map<string, {
    status: 'up' | 'down';
    queue: PDU[];
  }>;
}

/**
 * Motor de simulación simplificado
 */
export class SimulationEngine {
  private state: SimulationState;
  private config: SimulationConfig;
  private lab: LabSpec;
  
  constructor(lab: LabSpec, config: Partial<SimulationConfig> = {}) {
    this.lab = lab;
    this.config = {
      mode: 'step-by-step',
      speed: 1,
      maxEvents: 10000,
      stopOnError: false,
      captureAll: true,
      ...config
    };
    
    this.state = this.initializeState();
  }
  
  /**
   * Inicializa el estado de la simulación
   */
  private initializeState(): SimulationState {
    const deviceStates = new Map<string, DeviceSimState>();
    
    for (const device of this.lab.devices) {
      deviceStates.set(device.name, {
        device,
        arpTable: new Map(),
        macTable: new Map(),
        routingTable: this.buildRoutingTable(device),
        interfaces: this.buildInterfaceStates(device)
      });
    }
    
    return {
      currentTime: 0,
      pendingEvents: [],
      completedEvents: [],
      inFlightPDUs: [],
      deviceStates,
      running: false,
      paused: false
    };
  }
  
  /**
   * Construye tabla de routing inicial
   */
  private buildRoutingTable(device: DeviceSpec): Map<string, { nextHop: string; interface: string }> {
    const table = new Map();
    
    // Rutas conectadas
    for (const iface of device.interfaces) {
      if (iface.ip && iface.subnetMask) {
        const network = this.getNetworkAddress(iface.ip, iface.subnetMask);
        table.set(network, {
          nextHop: 'connected',
          interface: iface.name
        });
      }
    }
    
    // Rutas estáticas
    if (device.routing?.static) {
      for (const route of device.routing.static) {
        table.set(route.network, {
          nextHop: route.nextHop,
          interface: route.interface || ''
        });
      }
    }
    
    return table;
  }
  
  /**
   * Construye estados de interfaces
   */
  private buildInterfaceStates(device: DeviceSpec): Map<string, { status: 'up' | 'down'; queue: PDU[] }> {
    const interfaces = new Map();
    
    for (const iface of device.interfaces) {
      interfaces.set(iface.name, {
        status: iface.shutdown ? 'down' : 'up',
        queue: []
      });
    }
    
    return interfaces;
  }
  
  /**
   * Inicia la simulación
   */
  async start(): Promise<void> {
    this.state.running = true;
    this.state.paused = false;
    
    while (this.state.running && !this.state.paused) {
      if (this.state.pendingEvents.length === 0) {
        break;  // No hay más eventos
      }
      
      if (this.config.mode === 'step-by-step') {
        break;  // Esperar step()
      }
      
      await this.step();
      
      // Control de velocidad
      await this.delay(1000 / this.config.speed);
    }
  }
  
  /**
   * Pausa la simulación
   */
  pause(): void {
    this.state.paused = true;
  }
  
  /**
   * Reanuda la simulación
   */
  resume(): void {
    this.state.paused = false;
    if (this.state.running) {
      this.start();
    }
  }
  
  /**
   * Detiene la simulación
   */
  stop(): void {
    this.state.running = false;
    this.state.paused = false;
  }
  
  /**
   * Ejecuta un paso de simulación
   */
  async step(): Promise<SimulationEvent[]> {
    const processedEvents: SimulationEvent[] = [];
    
    // Procesar PDUs en tránsito
    for (const pdu of [...this.state.inFlightPDUs]) {
      const event = await this.processPDU(pdu);
      if (event) {
        processedEvents.push(event);
        this.state.completedEvents.push(event);
      }
    }
    
    // Avanzar tiempo
    this.state.currentTime += 1;
    
    return processedEvents;
  }
  
  /**
   * Crea y envía un PDU
   */
  createPDU(
    sourceDevice: string,
    destinationDevice: string,
    type: PDUType,
    data: any
  ): PDU {
    const source = this.lab.devices.find(d => d.name === sourceDevice);
    const dest = this.lab.devices.find(d => d.name === destinationDevice);
    
    if (!source || !dest) {
      throw new Error('Device not found');
    }
    
    const pdu: PDU = {
      id: crypto.randomUUID(),
      type,
      source: {
        device: sourceDevice,
        ip: source.interfaces[0]?.ip || '',
        mac: this.generateMAC(),
        port: 0
      },
      destination: {
        device: destinationDevice,
        ip: dest.interfaces[0]?.ip || '',
        mac: '',  // Se resolverá via ARP
        port: 0
      },
      data,
      createdAt: this.state.currentTime,
      ttl: 64
    };
    
    this.state.inFlightPDUs.push(pdu);
    
    return pdu;
  }
  
  /**
   * Procesa un PDU en tránsito
   */
  private async processPDU(pdu: PDU): Promise<SimulationEvent | null> {
    const sourceState = this.state.deviceStates.get(pdu.source.device);
    const destState = this.state.deviceStates.get(pdu.destination.device);
    
    if (!sourceState || !destState) {
      return null;
    }
    
    // Simular procesamiento según tipo de dispositivo
    switch (sourceState.device.type) {
      case 'router':
        return this.processRouterPDU(sourceState, pdu);
      case 'switch':
      case 'multilayer-switch':
        return this.processSwitchPDU(sourceState, pdu);
      case 'pc':
      case 'server':
        return this.processEndDevicePDU(sourceState, pdu);
      default:
        return null;
    }
  }
  
  private async processRouterPDU(state: DeviceSimState, pdu: PDU): Promise<SimulationEvent | null> {
    // Routing lookup
    const route = state.routingTable.get(pdu.destination.ip);
    
    if (!route) {
      // No route to host
      return {
        type: 'routing-error',
        pdu,
        message: 'No route to destination',
        timestamp: this.state.currentTime
      };
    }
    
    // Forward PDU
    return {
      type: 'forward',
      pdu,
      sourceDevice: state.device.name,
      nextHop: route.nextHop,
      interface: route.interface,
      timestamp: this.state.currentTime
    };
  }
  
  private async processSwitchPDU(state: DeviceSimState, pdu: PDU): Promise<SimulationEvent | null> {
    // MAC learning
    state.macTable.set(pdu.source.mac, pdu.source.port?.toString() || '0');
    
    // MAC lookup
    const destPort = state.macTable.get(pdu.destination.mac);
    
    if (destPort) {
      // Known unicast - forward to specific port
      return {
        type: 'forward',
        pdu,
        sourceDevice: state.device.name,
        nextHop: destPort,
        interface: destPort,
        timestamp: this.state.currentTime
      };
    } else {
      // Unknown unicast - flood
      return {
        type: 'flood',
        pdu,
        sourceDevice: state.device.name,
        timestamp: this.state.currentTime
      };
    }
  }
  
  private async processEndDevicePDU(state: DeviceSimState, pdu: PDU): Promise<SimulationEvent | null> {
    // End device recibe el PDU
    return {
      type: 'receive',
      pdu,
      sourceDevice: state.device.name,
      timestamp: this.state.currentTime
    };
  }
  
  /**
   * Obtiene todos los eventos capturados
   */
  getCapturedEvents(): SimulationEvent[] {
    return [...this.state.completedEvents];
  }
  
  /**
   * Obtiene el estado actual
   */
  getState(): SimulationState {
    return { ...this.state };
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  private getNetworkAddress(ip: string, mask: string): string {
    // Simplified - calcular network address
    const ipParts = ip.split('.').map(Number);
    const maskParts = mask.split('.').map(Number);
    const network = ipParts.map((part, i) => part & maskParts[i]);
    return network.join('.');
  }
  
  private generateMAC(): string {
    return '00:00:00:' + 
      Math.random().toString(16).slice(2, 4) + ':' +
      Math.random().toString(16).slice(2, 4) + ':' +
      Math.random().toString(16).slice(2, 4);
  }
}
```

---

### Tarea 5.2: Modelos de PDU y Eventos

**Archivo:** `src/simulation/pdu.ts`

```typescript
// src/simulation/pdu.ts

export type PDUType = 
  | 'arp-request'
  | 'arp-reply'
  | 'icmp-echo'
  | 'icmp-reply'
  | 'tcp-syn'
  | 'tcp-syn-ack'
  | 'tcp-ack'
  | 'tcp-data'
  | 'udp'
  | 'http'
  | 'dns'
  | 'dhcp';

export interface PDUEndpoint {
  device: string;
  ip: string;
  mac: string;
  port?: number;
}

export interface PDU {
  /** ID único del PDU */
  id: string;
  
  /** Tipo de PDU */
  type: PDUType;
  
  /** Origen */
  source: PDUEndpoint;
  
  /** Destino */
  destination: PDUEndpoint;
  
  /** Datos adicionales */
  data: Record<string, any>;
  
  /** Tiempo de creación */
  createdAt: number;
  
  /** TTL */
  ttl: number;
}

/**
 * Factory para crear PDUs comunes
 */
export class PDUFactory {
  static createPing(sourceDevice: string, destIP: string): PDU {
    return {
      id: crypto.randomUUID(),
      type: 'icmp-echo',
      source: {
        device: sourceDevice,
        ip: '',
        mac: ''
      },
      destination: {
        device: '',
        ip: destIP,
        mac: ''
      },
      data: {
        sequence: Math.floor(Math.random() * 65535),
        size: 64
      },
      createdAt: 0,
      ttl: 64
    };
  }
  
  static createARPRequest(sourceDevice: string, targetIP: string): PDU {
    return {
      id: crypto.randomUUID(),
      type: 'arp-request',
      source: {
        device: sourceDevice,
        ip: '',
        mac: ''
      },
      destination: {
        device: '',
        ip: targetIP,
        mac: 'ff:ff:ff:ff:ff:ff'
      },
      data: {
        targetIP
      },
      createdAt: 0,
      ttl: 1
    };
  }
  
  static createTCPHandshake(
    sourceDevice: string,
    destDevice: string,
    destPort: number
  ): PDU[] {
    const pdus: PDU[] = [];
    
    // SYN
    pdus.push({
      id: crypto.randomUUID(),
      type: 'tcp-syn',
      source: { device: sourceDevice, ip: '', mac: '', port: Math.floor(Math.random() * 65535) },
      destination: { device: destDevice, ip: '', mac: '', port: destPort },
      data: { seq: Math.floor(Math.random() * 4294967295) },
      createdAt: 0,
      ttl: 64
    });
    
    return pdus;
  }
}
```

**Archivo:** `src/simulation/event.ts`

```typescript
// src/simulation/event.ts

import type { PDU } from './pdu';

export type EventType = 
  | 'send'
  | 'receive'
  | 'forward'
  | 'flood'
  | 'drop'
  | 'routing-error'
  | 'arp-resolve'
  | 'tcp-handshake'
  | 'timeout';

export interface SimulationEvent {
  /** Tipo de evento */
  type: EventType;
  
  /** PDU asociado */
  pdu: PDU;
  
  /** Dispositivo origen del evento */
  sourceDevice: string;
  
  /** Siguiente salto (para forward) */
  nextHop?: string;
  
  /** Interface (para forward) */
  interface?: string;
  
  /** Mensaje descriptivo */
  message?: string;
  
  /** Timestamp de simulación */
  timestamp: number;
  
  /** Detalles adicionales */
  details?: Record<string, any>;
}

/**
 * Visualizador de eventos (formato texto)
 */
export class EventVisualizer {
  static formatEvent(event: SimulationEvent): string {
    const parts: string[] = [];
    
    parts.push(`[${event.timestamp}ms]`);
    parts.push(event.type.toUpperCase());
    parts.push(`[${event.pdu.type}]`);
    parts.push(event.sourceDevice);
    
    if (event.nextHop) {
      parts.push(`-> ${event.nextHop}`);
    }
    
    if (event.message) {
      parts.push(`: ${event.message}`);
    }
    
    return parts.join(' ');
  }
  
  static formatEventList(events: SimulationEvent[]): string {
    return events
      .map(e => this.formatEvent(e))
      .join('\n');
  }
  
  static toTimeline(events: SimulationEvent[]): string {
    const lines: string[] = [];
    lines.push('TIMELINE');
    lines.push('='.repeat(60));
    
    let lastDevice = '';
    
    for (const event of events) {
      if (event.sourceDevice !== lastDevice) {
        lines.push(`\n[${event.sourceDevice}]`);
        lastDevice = event.sourceDevice;
      }
      
      lines.push(`  ${this.formatEvent(event)}`);
    }
    
    return lines.join('\n');
  }
}
```

---

### Tarea 5.3: Sistema de Templates

**Archivo:** `src/templates/registry.ts`

```typescript
// src/templates/registry.ts

import type { LabSpec } from '../core/canonical/lab.spec';

export interface LabTemplate {
  /** ID del template */
  id: string;
  
  /** Nombre */
  name: string;
  
  /** Descripción */
  description: string;
  
  /** Categoría */
  category: 'ccna' | 'ccnp' | 'ccie' | 'custom';
  
  /** Dificultad */
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  
  /** Tags */
  tags: string[];
  
  /** Tiempo estimado */
  estimatedTime: string;
  
  /** Función generadora */
  generate: (params?: TemplateParams) => LabSpec;
  
  /** Parámetros configurables */
  parameters?: TemplateParameter[];
  
  /** Preview (imagen) */
  preview?: string;
}

export interface TemplateParameter {
  name: string;
  type: 'string' | 'number' | 'ip' | 'vlan' | 'select';
  default: any;
  description: string;
  options?: { value: any; label: string }[];
}

/**
 * Registro de templates
 */
export class TemplateRegistry {
  private templates: Map<string, LabTemplate> = new Map();
  
  /**
   * Registra un template
   */
  register(template: LabTemplate): void {
    this.templates.set(template.id, template);
  }
  
  /**
   * Obtiene un template por ID
   */
  get(id: string): LabTemplate | undefined {
    return this.templates.get(id);
  }
  
  /**
   * Lista todos los templates
   */
  list(): LabTemplate[] {
    return Array.from(this.templates.values());
  }
  
  /**
   * Busca templates por criterios
   */
  search(query: {
    category?: string;
    difficulty?: string;
    tags?: string[];
  }): LabTemplate[] {
    return this.list().filter(t => {
      if (query.category && t.category !== query.category) return false;
      if (query.difficulty && t.difficulty !== query.difficulty) return false;
      if (query.tags && !query.tags.some(tag => t.tags.includes(tag))) return false;
      return true;
    });
  }
  
  /**
   * Genera un lab desde un template
   */
  generate(templateId: string, params?: TemplateParams): LabSpec {
    const template = this.get(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }
    
    return template.generate(params);
  }
}

// Instancia global
export const templateRegistry = new TemplateRegistry();
```

---

### Tarea 5.4: Template CCNA VLAN Basics

**Archivo:** `src/templates/ccna/vlan-basics.ts`

```typescript
// src/templates/ccna/vlan-basics.ts

import type { LabTemplate, TemplateParameter } from '../registry';
import type { LabSpec } from '../../core/canonical/lab.spec';
import { LabSpecFactory } from '../../core/canonical/lab.spec';
import { DeviceSpecFactory } from '../../core/canonical/device.spec';

const parameters: TemplateParameter[] = [
  {
    name: 'vlanCount',
    type: 'number',
    default: 3,
    description: 'Number of VLANs to create'
  },
  {
    name: 'pcPerVlan',
    type: 'number',
    default: 2,
    description: 'PCs per VLAN'
  },
  {
    name: 'baseNetwork',
    type: 'string',
    default: '192.168.0.0',
    description: 'Base network for VLANs'
  }
];

const generate = (params?: Record<string, any>): LabSpec => {
  const vlanCount = params?.vlanCount || 3;
  const pcPerVlan = params?.pcPerVlan || 2;
  const baseNetwork = params?.baseNetwork || '192.168.0.0';
  
  const devices = [];
  const connections = [];
  
  // Create switch
  const switchDevice = DeviceSpecFactory.create({
    name: 'Switch1',
    type: 'switch',
    model: { vendor: 'cisco', series: 'Catalyst 2960', model: '2960-24TT-L' },
    hostname: 'SW1',
    vlans: Array.from({ length: vlanCount }, (_, i) => ({
      id: 10 + i * 10,
      name: `VLAN${10 + i * 10}`
    })),
    interfaces: []
  });
  devices.push(switchDevice);
  
  // Create PCs for each VLAN
  for (let v = 0; v < vlanCount; v++) {
    const vlanId = 10 + v * 10;
    const networkBase = `${baseNetwork.split('.').slice(0, 2).join('.')}.${v * 10}`;
    
    for (let p = 0; p < pcPerVlan; p++) {
      const pcName = `PC${v * pcPerVlan + p + 1}`;
      const pc = DeviceSpecFactory.create({
        name: pcName,
        type: 'pc',
        interfaces: [{
          name: 'FastEthernet0',
          ip: `${networkBase}.${p + 1}`,
          subnetMask: '255.255.255.0',
          vlan: vlanId
        }]
      });
      devices.push(pc);
      
      // Connection to switch
      const switchPort = v * pcPerVlan + p + 1;
      connections.push({
        id: crypto.randomUUID(),
        from: { deviceId: pc.id, deviceName: pcName, port: 'FastEthernet0' },
        to: { deviceId: switchDevice.id, deviceName: 'Switch1', port: `FastEthernet0/${switchPort}` },
        cableType: 'straight-through',
        medium: 'copper'
      });
    }
  }
  
  return LabSpecFactory.create({
    metadata: {
      name: 'VLAN Basics Lab',
      description: `Lab with ${vlanCount} VLANs and ${pcPerVlan} PCs per VLAN`,
      version: '1.0',
      difficulty: 'beginner'
    },
    devices,
    connections
  });
};

export const vlanBasicsTemplate: LabTemplate = {
  id: 'ccna-vlan-basics',
  name: 'VLAN Basics',
  description: 'Basic VLAN configuration lab with multiple VLANs and inter-VLAN routing',
  category: 'ccna',
  difficulty: 'beginner',
  tags: ['vlan', 'switching', 'layer2', 'ccna'],
  estimatedTime: '30 min',
  parameters,
  generate
};
```

---

### Tarea 5.5: API REST

**Archivo:** `src/api/server.ts`

```typescript
// src/api/server.ts

import Fastify from 'fastify';
import { labRoutes } from './routes/lab.routes';
import { deviceRoutes } from './routes/device.routes';
import { deployRoutes } from './routes/deploy.routes';
import { simulationRoutes } from './routes/simulation.routes';

export async function createServer(options: { port: number; host: string }) {
  const fastify = Fastify({
    logger: true
  });
  
  // Health check
  fastify.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });
  
  // API info
  fastify.get('/api', async () => {
    return {
      name: 'cisco-auto API',
      version: '1.0.0',
      endpoints: [
        'GET  /api/labs - List labs',
        'POST /api/labs - Create lab',
        'GET  /api/labs/:id - Get lab',
        'PUT  /api/labs/:id - Update lab',
        'DELETE /api/labs/:id - Delete lab',
        'POST /api/labs/:id/deploy - Deploy lab',
        'POST /api/labs/:id/simulate - Simulate lab',
        'GET  /api/templates - List templates',
        'POST /api/templates/:id/generate - Generate from template'
      ]
    };
  });
  
  // Routes
  fastify.register(labRoutes, { prefix: '/api/labs' });
  fastify.register(deviceRoutes, { prefix: '/api/devices' });
  fastify.register(deployRoutes, { prefix: '/api/deploy' });
  fastify.register(simulationRoutes, { prefix: '/api/simulation' });
  
  // Start server
  await fastify.listen(options);
  
  return fastify;
}

// CLI entry point
if (require.main === module) {
  createServer({
    port: parseInt(process.env.PORT || '3000'),
    host: process.env.HOST || '0.0.0.0'
  }).then(() => {
    console.log('Server started');
  }).catch(err => {
    console.error(err);
    process.exit(1);
  });
}
```

**Archivo:** `src/api/routes/lab.routes.ts`

```typescript
// src/api/routes/lab.routes.ts

import { FastifyInstance } from 'fastify';
import { YamlAdapter } from '../../core/adapters/yaml.adapter';
import { templateRegistry } from '../../templates/registry';

export async function labRoutes(fastify: FastifyInstance) {
  // List labs (from directory)
  fastify.get('/', async (request, reply) => {
    // TODO: List labs from storage
    return { labs: [] };
  });
  
  // Create lab from YAML
  fastify.post('/', async (request, reply) => {
    const { yaml } = request.body as any;
    
    try {
      const lab = YamlAdapter.toCanonical(yaml);
      return { success: true, lab };
    } catch (error: any) {
      reply.code(400);
      return { success: false, error: error.message };
    }
  });
  
  // Get lab by ID
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as any;
    // TODO: Get from storage
    return { lab: null };
  });
  
  // Generate IOS config
  fastify.get('/:id/config', async (request, reply) => {
    const { id } = request.params as any;
    const { device } = request.query as any;
    
    // TODO: Get lab and generate config
    return { config: '' };
  });
  
  // Generate from template
  fastify.post('/from-template/:templateId', async (request, reply) => {
    const { templateId } = request.params as any;
    const { params } = request.body as any;
    
    try {
      const lab = templateRegistry.generate(templateId, params);
      return { success: true, lab };
    } catch (error: any) {
      reply.code(404);
      return { success: false, error: error.message };
    }
  });
  
  // List templates
  fastify.get('/templates', async () => {
    const templates = templateRegistry.list();
    return { templates };
  });
}
```

---

### Tarea 5.6: Validación de Conectividad

**Archivo:** `src/validation/connectivity.validator.ts`

```typescript
// src/validation/connectivity.validator.ts

import type { LabSpec } from '../core/canonical/lab.spec';
import type { DeviceSpec } from '../core/canonical/device.spec';
import { SimulationEngine } from '../simulation/engine';
import { PDUFactory } from '../simulation/pdu';

export interface ConnectivityTest {
  name: string;
  source: string;
  destination: string;
  type: 'ping' | 'tcp' | 'udp';
  expected: boolean;
}

export interface ConnectivityResult {
  test: ConnectivityTest;
  passed: boolean;
  actualResult: string;
  message: string;
  details?: any;
}

/**
 * Validador de conectividad usando simulación
 */
export class ConnectivityValidator {
  /**
   * Ejecuta tests de conectividad
   */
  static async validate(
    lab: LabSpec,
    tests: ConnectivityTest[]
  ): Promise<ConnectivityResult[]> {
    const engine = new SimulationEngine(lab, { mode: 'step-by-step' });
    const results: ConnectivityResult[] = [];
    
    for (const test of tests) {
      const result = await this.runTest(engine, test);
      results.push(result);
    }
    
    return results;
  }
  
  /**
   * Ejecuta un test individual
   */
  private static async runTest(
    engine: SimulationEngine,
    test: ConnectivityTest
  ): Promise<ConnectivityResult> {
    try {
      // Crear PDU según tipo
      let pdu;
      switch (test.type) {
        case 'ping':
          pdu = PDUFactory.createPing(test.source, test.destination);
          break;
        default:
          throw new Error(`Unsupported test type: ${test.type}`);
      }
      
      // Inyectar PDU en simulación
      engine.createPDU(test.source, test.destination, pdu.type, pdu.data);
      
      // Ejecutar simulación
      await engine.step();
      
      // Obtener eventos
      const events = engine.getCapturedEvents();
      
      // Analizar resultado
      const received = events.some(e => 
        e.type === 'receive' && 
        e.sourceDevice === test.destination
      );
      
      return {
        test,
        passed: received === test.expected,
        actualResult: received ? 'Success' : 'Failed',
        message: received 
          ? `${test.source} can reach ${test.destination}`
          : `${test.source} cannot reach ${test.destination}`,
        details: { events: events.length }
      };
      
    } catch (error: any) {
      return {
        test,
        passed: false,
        actualResult: 'Error',
        message: error.message
      };
    }
  }
  
  /**
   * Genera tests automáticos basados en topología
   */
  static generateTests(lab: LabSpec): ConnectivityTest[] {
    const tests: ConnectivityTest[] = [];
    
    // Para cada par de dispositivos en la misma red
    const devicesByNetwork = new Map<string, DeviceSpec[]>();
    
    for (const device of lab.devices) {
      for (const iface of device.interfaces) {
        if (iface.ip && iface.subnetMask) {
          const network = this.getNetworkAddress(iface.ip, iface.subnetMask);
          if (!devicesByNetwork.has(network)) {
            devicesByNetwork.set(network, []);
          }
          devicesByNetwork.get(network)!.push(device);
        }
      }
    }
    
    // Generar tests para dispositivos en la misma red
    for (const [network, devices] of devicesByNetwork) {
      for (let i = 0; i < devices.length; i++) {
        for (let j = i + 1; j < devices.length; j++) {
          tests.push({
            name: `Ping ${devices[i].name} -> ${devices[j].name}`,
            source: devices[i].name,
            destination: devices[j].name,
            type: 'ping',
            expected: true
          });
        }
      }
    }
    
    return tests;
  }
  
  private static getNetworkAddress(ip: string, mask: string): string {
    const ipParts = ip.split('.').map(Number);
    const maskParts = mask.split('.').map(Number);
    const network = ipParts.map((part, i) => part & maskParts[i]);
    return network.join('.');
  }
}
```

---

## Checklist de Completitud

### Simulación
- [ ] Motor de simulación básico
- [ ] Modelos de PDU
- [ ] Modelos de eventos
- [ ] Simulación de ARP
- [ ] Simulación de ICMP (ping)
- [ ] Visualizador de eventos

### Templates
- [ ] Sistema de registro
- [ ] Template CCNA VLAN Basics
- [ ] Template CCNA Static Routing
- [ ] Template CCNA OSPF
- [ ] Template CCNP BGP
- [ ] Generación con parámetros

### API REST
- [ ] Server Fastify
- [ ] Routes de labs
- [ ] Routes de deploy
- [ ] Routes de simulación
- [ ] Routes de templates

### Validación
- [ ] Validador de conectividad
- [ ] Generación automática de tests
- [ ] Reporte de resultados

### Tests
- [ ] Tests de simulación
- [ ] Tests de templates
- [ ] Tests de API
- [ ] Tests de validación

---

## Resumen del Plan Completo

| Fase | Duración | Prioridad | Estado |
|------|----------|-----------|--------|
| **0. Fundamentos** | 2-3 semanas | Crítica | Pendiente |
| **1. Catálogo** | 2-3 semanas | Alta | Pendiente |
| **2. Protocolos** | 3-4 semanas | Alta | Pendiente |
| **3. Deployment** | 2-3 semanas | Alta | Pendiente |
| **4. PKA/PKT** | 3-4 semanas | Alta | Pendiente |
| **5. Valor Agregado** | 2-3 semanas | Media | Pendiente |

**Total estimado:** 14-20 semanas (3.5-5 meses)

---

## Próximos Pasos

1. **Revisar y aprobar el plan** en equipo
2. **Crear issues en GitHub** para cada tarea
3. **Asignar milestone** a cada fase
4. **Empezar con Fase 0** - Unificación de modelos
5. **Establecer CI/CD** para validación continua
