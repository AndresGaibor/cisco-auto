# Fase 0: Fundamentos - Unificación de Modelos

> **Estado:** ✅ COMPLETADO  
> **Tests:** 75 tests (canonical + catalog)  
> **Dependencias:** Ninguna

## Objetivo

Unificar los tres sistemas de tipos existentes en un **modelo canónico único** y corregir los bugs críticos que impiden el funcionamiento correcto del sistema.

---

## Problemas a Resolver

### 1. Tres Sistemas de Tipos Independientes

```
┌─────────────────────┐
│ Zod Schemas         │  → core/types/
│ - LabSchema         │
│ - DeviceSchema      │
│ - ConnectionSchema  │
└─────────────────────┘
         │
         │ ❌ No hay adaptador
         ▼
┌─────────────────────┐
│ Domain Entities     │  → core/domain/entities/
│ - Lab               │
│ - Device            │
│ - Connection        │
└─────────────────────┘
         │
         │ ❌ No hay adaptador
         ▼
┌─────────────────────┐
│ PKA Models          │  → core/models/
│ - Network           │
│ - Router/Switch/PC  │
└─────────────────────┘
```

### 2. Tipos Duplicados

| Tipo | Ubicación 1 | Ubicación 2 | Diferencia |
|------|-------------|-------------|------------|
| `CableType` | `models/CableTypes.ts` | `domain/value-objects/cable-type.vo.ts` | Naming: `CableType` vs `CableTypeEnum` |
| `LinkMedium` | `models/CableTypes.ts` | `domain/entities/connection.entity.ts` | Casing: `eCopper` vs `COPPER` |
| `DeviceType` | `types/device.ts` | `domain/entities/device.entity.ts` | Duplicado exacto |

### 3. Formato de Conexión Incompatible

**Schema actual** (`types/lab.ts`):
```yaml
connections:
  - from: "Router1"
    fromInterface: "GigabitEthernet0/0"
    to: "Switch1"
    toInterface: "FastEthernet0/1"
    type: "straight-through"
```

**Domain Entity espera** (`domain/entities/connection.entity.ts`):
```yaml
connections:
  - fromDeviceName: "Router1"
    fromPort: "GigabitEthernet0/0"
    toDeviceName: "Switch1"
    toPort: "FastEthernet0/1"
    cableType: "eStraightThrough"
    medium: "eCopper"
```

### 4. Serialización con Pérdida de Datos

`YamlLabRepository.serializeDevice()` NO persiste:
- `vlans`
- `vtp`
- `routing`
- `acls`
- `nat`
- `credentials`
- `ssh`
- `telnet`
- `lines` (console/vty)

### 5. Bugs Críticos

| Bug | Archivo | Descripción |
|-----|---------|-------------|
| `PortType.ETHERNET` no existe | `port.vo.ts` | `parsePortName()` usa enum value no definido |
| Validación con `hub` | `domain-validation.service.ts` | Compara con `hub` que no está en `DeviceType` |
| Switch ports index | `yaml-lab.repository.ts:233` | Genera `Fa0/0` a `Fa0/23` en lugar de `Fa0/1` a `Fa0/24` |
| `type: 'configuration'` | `domain-validation.service.ts` | Warning type no declarado |

---

## Solución: Modelo Canónico

### Estructura de Directorios Nueva

```
src/core/
├── canonical/                        # ← NUEVO
│   ├── index.ts                      # Exports
│   ├── types.ts                      # Tipos compartidos (sin duplicados)
│   ├── lab.spec.ts                   # LabSpec
│   ├── device.spec.ts                # DeviceSpec
│   ├── connection.spec.ts            # ConnectionSpec
│   ├── interface.spec.ts             # InterfaceSpec
│   ├── vlan.spec.ts                  # VLANSpec
│   ├── routing.spec.ts               # RoutingSpec
│   ├── security.spec.ts              # SecuritySpec
│   └── service.spec.ts               # ServiceSpec
│
├── adapters/                         # ← NUEVO
│   ├── index.ts
│   ├── yaml.adapter.ts               # YAML ↔ Canonical
│   ├── pka.adapter.ts                # PKA ↔ Canonical
│   └── domain.adapter.ts             # Domain ↔ Canonical (temporal)
```

---

## Tareas Detalladas

### Tarea 0.1: Crear Tipos Compartidos

**Archivo:** `src/core/canonical/types.ts`

**Descripción:** Definir tipos compartidos únicos (eliminar duplicación).

**Entregables:**

```typescript
// src/core/canonical/types.ts

/**
 * Tipos de dispositivos soportados por Packet Tracer
 * Fuente: https://tutorials.ptnetacad.net/help/default/devicesAndModules.htm
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
  // Industrial
  | 'plc'
  | 'industrial-router'
  | 'industrial-switch'
  // Generic
  | 'unknown';

/**
 * Tipos de cable soportados por Packet Tracer
 * Fuente: https://tutorials.ptnetacad.net/help/default/connectionsLinks.htm
 */
export type CableType =
  | 'straight-through'   // Copper straight-through
  | 'crossover'          // Copper crossover
  | 'fiber-single-mode'  // Single-mode fiber
  | 'fiber-multi-mode'   // Multi-mode fiber
  | 'serial-dce'         // Serial DCE
  | 'serial-dte'         // Serial DTE
  | 'console'            // Console cable
  | 'coaxial'            // Coaxial cable
  | 'phone'              // Phone cable
  | 'usb';               // USB cable

/**
 * Medio de transmisión
 */
export type LinkMedium =
  | 'copper'
  | 'fiber'
  | 'serial'
  | 'wireless'
  | 'coaxial';

/**
 * Tipos de puerto
 */
export type PortType =
  | 'fast-ethernet'
  | 'gigabit-ethernet'
  | 'ten-gigabit-ethernet'
  | 'serial'
  | 'fiber'
  | 'console'
  | 'aux'
  | 'usb';

/**
 * Mapeo de CableType a LinkMedium
 */
export const cableToMedium: Record<CableType, LinkMedium> = {
  'straight-through': 'copper',
  'crossover': 'copper',
  'fiber-single-mode': 'fiber',
  'fiber-multi-mode': 'fiber',
  'serial-dce': 'serial',
  'serial-dte': 'serial',
  'console': 'copper',
  'coaxial': 'coaxial',
  'phone': 'copper',
  'usb': 'copper'
};

/**
 * Conversión PKA enum → Canonical
 */
export const pkaCableToCanonical: Record<string, CableType> = {
  'eStraightThrough': 'straight-through',
  'eCrossOver': 'crossover',
  'eFiber': 'fiber-multi-mode',
  'eSerialDCE': 'serial-dce',
  'eSerialDTE': 'serial-dte',
  'eConsole': 'console',
  'eCoaxial': 'coaxial'
};
```

**Tests:**
```typescript
// src/core/canonical/__tests__/types.test.ts
describe('Canonical Types', () => {
  it('should map all PKA cable types to canonical', () => {
    const pkaTypes = ['eStraightThrough', 'eCrossOver', 'eFiber', 
                       'eSerialDCE', 'eSerialDTE', 'eConsole', 'eCoaxial'];
    pkaTypes.forEach(pka => {
      expect(pkaCableToCanonical[pka]).toBeDefined();
    });
  });

  it('should determine medium from cable type', () => {
    expect(cableToMedium['straight-through']).toBe('copper');
    expect(cableToMedium['fiber-single-mode']).toBe('fiber');
    expect(cableToMedium['serial-dce']).toBe('serial');
  });
});
```

---

### Tarea 0.2: Crear Modelo Canónico de Lab

**Archivo:** `src/core/canonical/lab.spec.ts`

**Descripción:** Definir la especificación canónica de un laboratorio.

**Entregables:**

```typescript
// src/core/canonical/lab.spec.ts

import type { DeviceSpec } from './device.spec';
import type { ConnectionSpec } from './connection.spec';
import type { ServiceSpec } from './service.spec';
import type { ProtocolSpec } from './protocol.spec';
import type { AssessmentSpec } from './assessment.spec';

export interface LabMetadata {
  name: string;
  description?: string;
  version: string;
  author?: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime?: string;  // e.g., "30 min"
  tags?: string[];
}

export interface LabResources {
  pkaFile?: string;
  pktFile?: string;
  solutionFile?: string;
  images?: string[];
}

export interface LabInstruction {
  content: string;
  format: 'markdown' | 'html' | 'plain';
}

export interface LabSpec {
  /** Identificador único del laboratorio */
  id: string;
  
  /** Metadatos del laboratorio */
  metadata: LabMetadata;
  
  /** Dispositivos en la topología */
  devices: DeviceSpec[];
  
  /** Conexiones entre dispositivos */
  connections: ConnectionSpec[];
  
  /** Servicios configurados (DHCP, DNS, etc.) */
  services?: ServiceSpec[];
  
  /** Protocolos de routing configurados */
  protocols?: ProtocolSpec[];
  
  /** Configuración de evaluación (para actividades) */
  assessment?: AssessmentSpec;
  
  /** Instrucciones para el usuario */
  instructions?: LabInstruction;
  
  /** Recursos adicionales */
  resources?: LabResources;
  
  /** Versión del schema usado */
  schemaVersion: string;
}

/**
 * Factory para crear LabSpec
 */
export class LabSpecFactory {
  static create(partial: Partial<LabSpec>): LabSpec {
    return {
      id: partial.id || crypto.randomUUID(),
      metadata: partial.metadata || {
        name: 'Untitled Lab',
        version: '1.0',
        difficulty: 'beginner'
      },
      devices: partial.devices || [],
      connections: partial.connections || [],
      services: partial.services,
      protocols: partial.protocols,
      assessment: partial.assessment,
      instructions: partial.instructions,
      resources: partial.resources,
      schemaVersion: '2.0.0'
    };
  }
}
```

---

### Tarea 0.3: Crear Modelo Canónico de Device

**Archivo:** `src/core/canonical/device.spec.ts`

**Descripción:** Definir la especificación canónica de un dispositivo.

**Entregables:**

```typescript
// src/core/canonical/device.spec.ts

import type { DeviceType } from './types';
import type { InterfaceSpec } from './interface.spec';
import type { VLANSpec } from './vlan.spec';
import type { RoutingSpec } from './routing.spec';
import type { SecuritySpec } from './security.spec';

export interface DeviceModel {
  vendor: 'cisco' | 'generic';
  series: string;        // e.g., "ISR 4000"
  model: string;         // e.g., "ISR4321"
  iosVersion?: string;   // e.g., "15.6(3)M"
}

export interface DeviceCredentials {
  username?: string;
  password?: string;
  enableSecret?: string;
  sshKey?: string;
}

export interface DeviceManagement {
  ip: string;
  subnetMask: string;
  gateway?: string;
  vlan?: number;
}

export interface DeviceSpec {
  /** Identificador único del dispositivo */
  id: string;
  
  /** Nombre del dispositivo (usado en topología) */
  name: string;
  
  /** Tipo de dispositivo */
  type: DeviceType;
  
  /** Modelo específico (opcional) */
  model?: DeviceModel;
  
  /** Hostname para CLI */
  hostname?: string;
  
  /** Interfaces de red */
  interfaces: InterfaceSpec[];
  
  /** Puertos físicos disponibles */
  ports: string[];  // e.g., ["FastEthernet0/1", "FastEthernet0/2", ...]
  
  /** Configuración de management */
  management?: DeviceManagement;
  
  /** Credenciales de acceso */
  credentials?: DeviceCredentials;
  
  /** Configuración SSH */
  ssh?: {
    enabled: boolean;
    version: 1 | 2;
    port?: number;
  };
  
  /** Configuración Telnet */
  telnet?: {
    enabled: boolean;
    port?: number;
  };
  
  /** Configuración de líneas (console/vty) */
  lines?: {
    console?: {
      password?: string;
      login?: boolean;
    };
    vty?: {
      lines: string;        // e.g., "0 4"
      password?: string;
      login?: boolean;
      transport?: ('ssh' | 'telnet')[];
    };
  };
  
  /** Configuración de VLANs */
  vlans?: VLANSpec[];
  
  /** Configuración VTP */
  vtp?: {
    mode: 'server' | 'client' | 'transparent';
    domain?: string;
    password?: string;
    version?: 1 | 2 | 3;
  };
  
  /** Configuración de routing */
  routing?: RoutingSpec;
  
  /** Configuración de seguridad */
  security?: SecuritySpec;
  
  /** Configuración específica por tipo de dispositivo */
  config?: Record<string, unknown>;
}

export class DeviceSpecFactory {
  static create(partial: Partial<DeviceSpec>): DeviceSpec {
    return {
      id: partial.id || crypto.randomUUID(),
      name: partial.name || 'Device',
      type: partial.type || 'unknown',
      interfaces: partial.interfaces || [],
      ports: partial.ports || [],
      model: partial.model,
      hostname: partial.hostname,
      management: partial.management,
      credentials: partial.credentials,
      ssh: partial.ssh,
      telnet: partial.telnet,
      lines: partial.lines,
      vlans: partial.vlans,
      vtp: partial.vtp,
      routing: partial.routing,
      security: partial.security,
      config: partial.config
    };
  }
}
```

---

### Tarea 0.4: Crear Modelo Canónico de Connection

**Archivo:** `src/core/canonical/connection.spec.ts`

**Descripción:** Definir la especificación canónica de una conexión.

**Entregables:**

```typescript
// src/core/canonical/connection.spec.ts

import type { CableType, LinkMedium } from './types';
import { cableToMedium } from './types';

export interface ConnectionEndpoint {
  /** ID del dispositivo */
  deviceId: string;
  
  /** Nombre del dispositivo (redundancia para legibilidad) */
  deviceName: string;
  
  /** Nombre del puerto/interface */
  port: string;  // e.g., "FastEthernet0/1"
}

export interface ConnectionSpec {
  /** Identificador único de la conexión */
  id: string;
  
  /** Endpoint de origen */
  from: ConnectionEndpoint;
  
  /** Endpoint de destino */
  to: ConnectionEndpoint;
  
  /** Tipo de cable */
  cableType: CableType;
  
  /** Medio de transmisión (derivado del cableType) */
  medium: LinkMedium;
  
  /** Estado de la conexión */
  status?: 'active' | 'inactive' | 'error';
  
  /** Notas adicionales */
  notes?: string;
}

export class ConnectionSpecFactory {
  static create(
    from: ConnectionEndpoint,
    to: ConnectionEndpoint,
    cableType: CableType,
    partial?: Partial<ConnectionSpec>
  ): ConnectionSpec {
    return {
      id: partial?.id || crypto.randomUUID(),
      from,
      to,
      cableType,
      medium: cableToMedium[cableType],
      status: partial?.status,
      notes: partial?.notes
    };
  }
}
```

---

### Tarea 0.5: Crear Adaptador YAML

**Archivo:** `src/core/adapters/yaml.adapter.ts`

**Descripción:** Adaptador bidireccional entre YAML y modelo canónico.

**Entregables:**

```typescript
// src/core/adapters/yaml.adapter.ts

import type { LabSpec, LabMetadata, LabResources, LabInstruction } from '../canonical/lab.spec';
import type { DeviceSpec, DeviceModel, DeviceCredentials, DeviceManagement } from '../canonical/device.spec';
import type { ConnectionSpec, ConnectionEndpoint } from '../canonical/connection.spec';
import type { CableType, DeviceType } from '../canonical/types';
import type { InterfaceSpec } from '../canonical/interface.spec';
import type { VLANSpec } from '../canonical/vlan.spec';
import type { RoutingSpec } from '../canonical/routing.spec';
import type { SecuritySpec } from '../canonical/security.spec';
import * as yaml from 'js-yaml';
import * as fs from 'fs';

/**
 * Formato YAML interno (compatible con versiones anteriores)
 */
interface YamlLab {
  metadata: {
    name: string;
    description?: string;
    version?: string;
    author?: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    estimatedTime?: string;
  };
  topology: {
    devices: YamlDevice[];
    connections?: YamlConnection[];
  };
  objectives?: Array<{
    description: string;
    type?: string;
  }>;
  validation?: {
    rules?: Array<{
      type: string;
      source: string;
      destination: string;
      expected: string;
    }>;
    tests?: Array<{
      name: string;
      type: string;
      source: string;
      destination: string;
      expected: boolean;
    }>;
  };
  instructions?: string;
  resources?: {
    pkaFile?: string;
    pktFile?: string;
    solution?: string;
  };
}

interface YamlDevice {
  name: string;
  type: DeviceType;
  model?: string;
  hostname?: string;
  iosVersion?: string;
  management?: {
    ip: string;
    subnetMask: string;
    gateway?: string;
    vlan?: number;
  };
  credentials?: DeviceCredentials;
  ssh?: {
    enabled: boolean;
    version?: 1 | 2;
    port?: number;
  };
  telnet?: {
    enabled: boolean;
    port?: number;
  };
  interfaces?: YamlInterface[];
  ports?: string[];
  vlans?: VLANSpec[];
  vtp?: {
    mode: 'server' | 'client' | 'transparent';
    domain?: string;
    password?: string;
    version?: 1 | 2 | 3;
  };
  routing?: RoutingSpec;
  acls?: SecuritySpec['acls'];
  nat?: SecuritySpec['nat'];
  lines?: {
    console?: { password?: string; login?: boolean };
    vty?: { 
      lines: string; 
      password?: string; 
      login?: boolean; 
      transport?: ('ssh' | 'telnet')[] 
    };
  };
}

interface YamlInterface {
  name: string;
  ip?: string;
  subnetMask?: string;
  description?: string;
  vlan?: number;
  trunk?: boolean;
  encapsulation?: 'dot1q' | 'isl';
  shutdown?: boolean;
}

interface YamlConnection {
  from: string;
  fromInterface: string;
  to: string;
  toInterface: string;
  type: CableType;
}

/**
 * Adaptador YAML ↔ Canonical
 */
export class YamlAdapter {
  // ==================== YAML → Canonical ====================
  
  static toCanonical(yamlContent: string): LabSpec {
    const yamlLab = yaml.load(yamlContent) as YamlLab;
    return this.yamlToCanonical(yamlLab);
  }
  
  static loadFile(filepath: string): LabSpec {
    const content = fs.readFileSync(filepath, 'utf-8');
    return this.toCanonical(content);
  }
  
  private static yamlToCanonical(yamlLab: YamlLab): LabSpec {
    return {
      id: crypto.randomUUID(),
      metadata: this.parseMetadata(yamlLab.metadata),
      devices: yamlLab.topology.devices.map(d => this.parseDevice(d)),
      connections: (yamlLab.topology.connections || []).map(c => this.parseConnection(c)),
      instructions: yamlLab.instructions ? {
        content: yamlLab.instructions,
        format: 'markdown'
      } : undefined,
      resources: yamlLab.resources ? this.parseResources(yamlLab.resources) : undefined,
      schemaVersion: '2.0.0'
    };
  }
  
  private static parseMetadata(meta: YamlLab['metadata']): LabMetadata {
    return {
      name: meta.name,
      description: meta.description,
      version: meta.version || '1.0',
      author: meta.author,
      difficulty: meta.difficulty,
      estimatedTime: meta.estimatedTime
    };
  }
  
  private static parseDevice(yamlDevice: YamlDevice): DeviceSpec {
    return {
      id: crypto.randomUUID(),
      name: yamlDevice.name,
      type: yamlDevice.type,
      model: yamlDevice.model ? {
        vendor: 'cisco',
        series: yamlDevice.model,
        model: yamlDevice.model
      } : undefined,
      hostname: yamlDevice.hostname,
      interfaces: (yamlDevice.interfaces || []).map(i => this.parseInterface(i)),
      ports: yamlDevice.ports || this.getDefaultPorts(yamlDevice.type),
      management: yamlDevice.management,
      credentials: yamlDevice.credentials,
      ssh: yamlDevice.ssh,
      telnet: yamlDevice.telnet,
      lines: yamlDevice.lines,
      vlans: yamlDevice.vlans,
      vtp: yamlDevice.vtp,
      routing: yamlDevice.routing,
      security: yamlDevice.acls || yamlDevice.nat ? {
        acls: yamlDevice.acls,
        nat: yamlDevice.nat
      } : undefined
    };
  }
  
  private static parseInterface(yamlInt: YamlInterface): InterfaceSpec {
    return {
      name: yamlInt.name,
      ip: yamlInt.ip,
      subnetMask: yamlInt.subnetMask,
      description: yamlInt.description,
      vlan: yamlInt.vlan,
      trunk: yamlInt.trunk,
      encapsulation: yamlInt.encapsulation,
      shutdown: yamlInt.shutdown ?? false
    };
  }
  
  private static parseConnection(yamlConn: YamlConnection): ConnectionSpec {
    return {
      id: crypto.randomUUID(),
      from: {
        deviceId: '',  // Will be resolved later
        deviceName: yamlConn.from,
        port: yamlConn.fromInterface
      },
      to: {
        deviceId: '',  // Will be resolved later
        deviceName: yamlConn.to,
        port: yamlConn.toInterface
      },
      cableType: yamlConn.type,
      medium: this.cableToMedium(yamlConn.type)
    };
  }
  
  private static cableToMedium(cableType: CableType): LinkMedium {
    const mapping: Record<string, LinkMedium> = {
      'straight-through': 'copper',
      'crossover': 'copper',
      'fiber-single-mode': 'fiber',
      'fiber-multi-mode': 'fiber',
      'serial-dce': 'serial',
      'serial-dte': 'serial',
      'console': 'copper',
      'coaxial': 'coaxial',
      'phone': 'copper',
      'usb': 'copper'
    };
    return mapping[cableType] || 'copper';
  }
  
  private static parseResources(res: NonNullable<YamlLab['resources']>): LabResources {
    return {
      pkaFile: res.pkaFile,
      pktFile: res.pktFile,
      solutionFile: res.solution
    };
  }
  
  // ==================== Canonical → YAML ====================
  
  static fromCanonical(lab: LabSpec): string {
    const yamlLab = this.canonicalToYaml(lab);
    return yaml.dump(yamlLab, {
      indent: 2,
      lineWidth: -1,
      noRefs: true,
      sortKeys: false
    });
  }
  
  static saveFile(lab: LabSpec, filepath: string): void {
    const content = this.fromCanonical(lab);
    fs.writeFileSync(filepath, content, 'utf-8');
  }
  
  private static canonicalToYaml(lab: LabSpec): YamlLab {
    return {
      metadata: {
        name: lab.metadata.name,
        description: lab.metadata.description,
        version: lab.metadata.version,
        author: lab.metadata.author,
        difficulty: lab.metadata.difficulty,
        estimatedTime: lab.metadata.estimatedTime
      },
      topology: {
        devices: lab.devices.map(d => this.deviceToYaml(d)),
        connections: lab.connections.map(c => this.connectionToYaml(c))
      },
      instructions: lab.instructions?.content,
      resources: lab.resources ? {
        pkaFile: lab.resources.pkaFile,
        pktFile: lab.resources.pktFile,
        solution: lab.resources.solutionFile
      } : undefined
    };
  }
  
  private static deviceToYaml(device: DeviceSpec): YamlDevice {
    return {
      name: device.name,
      type: device.type,
      model: device.model?.model,
      hostname: device.hostname,
      management: device.management,
      credentials: device.credentials,
      ssh: device.ssh,
      telnet: device.telnet,
      lines: device.lines,
      interfaces: device.interfaces.map(i => ({
        name: i.name,
        ip: i.ip,
        subnetMask: i.subnetMask,
        description: i.description,
        vlan: i.vlan,
        trunk: i.trunk,
        encapsulation: i.encapsulation,
        shutdown: i.shutdown
      })),
      ports: device.ports,
      vlans: device.vlans,
      vtp: device.vtp,
      routing: device.routing,
      acls: device.security?.acls,
      nat: device.security?.nat
    };
  }
  
  private static connectionToYaml(conn: ConnectionSpec): YamlConnection {
    return {
      from: conn.from.deviceName,
      fromInterface: conn.from.port,
      to: conn.to.deviceName,
      toInterface: conn.to.port,
      type: conn.cableType
    };
  }
  
  // ==================== Helpers ====================
  
  private static getDefaultPorts(type: DeviceType): string[] {
    switch (type) {
      case 'switch':
      case 'multilayer-switch':
        // FIX: Start from Fa0/1, not Fa0/0
        return Array.from({ length: 24 }, (_, i) => `FastEthernet0/${i + 1}`);
      case 'router':
        return ['GigabitEthernet0/0', 'GigabitEthernet0/1', 'GigabitEthernet0/2'];
      case 'pc':
      case 'laptop':
        return ['FastEthernet0'];
      case 'server':
        return ['FastEthernet0', 'GigabitEthernet0'];
      default:
        return ['FastEthernet0'];
    }
  }
}
```

**Tests:**
```typescript
// src/core/adapters/__tests__/yaml.adapter.test.ts
import { YamlAdapter } from '../yaml.adapter';

describe('YamlAdapter', () => {
  const sampleYaml = `
metadata:
  name: Test Lab
  difficulty: beginner
topology:
  devices:
    - name: Router1
      type: router
      interfaces:
        - name: GigabitEthernet0/0
          ip: 192.168.1.1
          subnetMask: 255.255.255.0
    - name: Switch1
      type: switch
      vlans:
        - id: 10
          name: VLAN10
  connections:
    - from: Router1
      fromInterface: GigabitEthernet0/0
      to: Switch1
      toInterface: FastEthernet0/1
      type: straight-through
`;

  describe('toCanonical', () => {
    it('should parse YAML to canonical LabSpec', () => {
      const lab = YamlAdapter.toCanonical(sampleYaml);
      
      expect(lab.metadata.name).toBe('Test Lab');
      expect(lab.devices).toHaveLength(2);
      expect(lab.connections).toHaveLength(1);
    });

    it('should preserve VLANs', () => {
      const lab = YamlAdapter.toCanonical(sampleYaml);
      const switchDevice = lab.devices.find(d => d.name === 'Switch1');
      
      expect(switchDevice?.vlans).toBeDefined();
      expect(switchDevice?.vlans).toHaveLength(1);
      expect(switchDevice?.vlans?.[0].id).toBe(10);
    });

    it('should generate correct switch ports (Fa0/1 to Fa0/24)', () => {
      const lab = YamlAdapter.toCanonical(sampleYaml);
      const switchDevice = lab.devices.find(d => d.name === 'Switch1');
      
      expect(switchDevice?.ports[0]).toBe('FastEthernet0/1');
      expect(switchDevice?.ports[23]).toBe('FastEthernet0/24');
    });
  });

  describe('fromCanonical', () => {
    it('should convert canonical LabSpec to YAML', () => {
      const lab = YamlAdapter.toCanonical(sampleYaml);
      const yamlOutput = YamlAdapter.fromCanonical(lab);
      const reparsed = YamlAdapter.toCanonical(yamlOutput);
      
      expect(reparsed.metadata.name).toBe(lab.metadata.name);
      expect(reparsed.devices).toHaveLength(lab.devices.length);
    });

    it('should preserve all fields in round-trip', () => {
      const original = YamlAdapter.toCanonical(sampleYaml);
      const roundTrip = YamlAdapter.toCanonical(YamlAdapter.fromCanonical(original));
      
      // Check devices
      expect(roundTrip.devices).toHaveLength(original.devices.length);
      
      // Check VLANs preserved
      const originalSwitch = original.devices.find(d => d.name === 'Switch1');
      const roundTripSwitch = roundTrip.devices.find(d => d.name === 'Switch1');
      expect(roundTripSwitch?.vlans).toEqual(originalSwitch?.vlans);
      
      // Check connections
      expect(roundTrip.connections).toHaveLength(original.connections.length);
    });
  });
});
```

---

### Tarea 0.6: Fix Bug - PortType.ETHERNET

**Archivo:** `src/core/domain/value-objects/port.vo.ts`

**Problema:** `parsePortName()` usa `PortType.ETHERNET` que no existe en el enum.

**Solución:**

```typescript
// ANTES (roto)
export enum PortType {
  FAST_ETHERNET = 'FAST_ETHERNET',
  GIGABIT_ETHERNET = 'GIGABIT_ETHERNET',
  // ... no ETHERNET
}

// En parsePortName():
default:
  return { type: PortType.ETHERNET, ... };  // ❌ No existe

// DESPUÉS (corregido)
export enum PortType {
  FAST_ETHERNET = 'FAST_ETHERNET',
  GIGABIT_ETHERNET = 'GIGABIT_ETHERNET',
  TEN_GIGABIT_ETHERNET = 'TEN_GIGABIT_ETHERNET',
  SERIAL = 'SERIAL',
  FIBER = 'FIBER',
  CONSOLE = 'CONSOLE',
  AUX = 'AUX',
  USB = 'USB',
  UNKNOWN = 'UNKNOWN'  // ← Añadir
}

// En parsePortName():
default:
  return { type: PortType.UNKNOWN, number: portName };
```

---

### Tarea 0.7: Fix Bug - Switch Port Indexing

**Archivo:** `src/core/infrastructure/adapters/persistence/yaml-lab.repository.ts`

**Problema:** Genera puertos `Fa0/0` a `Fa0/23` en lugar de `Fa0/1` a `Fa0/24`.

**Solución:**

```typescript
// ANTES (líneas 233-243)
private getDefaultPorts(type: string): string[] {
  if (type === 'switch' || type === 'multilayer-switch') {
    return Array.from({ length: 24 }, (_, i) => `FastEthernet0/${i}`);
    //                                                    ↑ genera 0-23
  }
  // ...
}

// DESPUÉS
private getDefaultPorts(type: string): string[] {
  if (type === 'switch' || type === 'multilayer-switch') {
    return Array.from({ length: 24 }, (_, i) => `FastEthernet0/${i + 1}`);
    //                                                    ↑ genera 1-24
  }
  // ...
}
```

---

### Tarea 0.8: Fix Bug - Validación con 'hub'

**Archivo:** `src/core/domain/services/domain-validation.service.ts`

**Problema:** Compara con `hub` que no está en `DeviceType` del dominio.

**Solución:**

```typescript
// Opción A: Añadir 'hub' a DeviceType en domain/entities/device.entity.ts
export type DeviceType = 
  | 'router'
  | 'switch'
  // ...
  | 'hub'  // ← Añadir
  | 'unknown';

// Opción B: Usar 'unknown' para hubs en la validación
// En domain-validation.service.ts:
if (device.getType() === 'hub' || device.getType() === 'unknown') {
  // Los hubs no tienen configuración de VLAN/routing
  return { valid: true };
}
```

---

### Tarea 0.9: Migrar Comandos CLI al Modelo Canónico

**Objetivo:** Actualizar cada comando CLI para usar el modelo canónico.

**Comandos a migrar:**

| Comando | Archivo | Estado |
|---------|---------|--------|
| `parse` | `cli/commands/parse.ts` | Usa Zod schemas |
| `validate` | `cli/commands/validate.ts` | Usa Zod schemas |
| `config` | `cli/commands/config.ts` | Usa DeviceSchema |
| `devices` | `cli/commands/devices.ts` | Usa YAMLParser |
| `deploy` | `cli/commands/deploy.ts` | Usa YAMLParser |
| Interactive | `cli/interactive/` | Usa Domain entities |

**Enfoque:**

1. Crear `YamlAdapter` (Tarea 0.5)
2. Actualizar cada comando:
   ```typescript
   // ANTES
   import { YAMLParser } from '../core/parser/yaml-parser';
   const lab = YAMLParser.loadFile(filepath);
   
   // DESPUÉS
   import { YamlAdapter } from '../core/adapters/yaml.adapter';
   const lab = YamlAdapter.loadFile(filepath);
   ```

---

### Tarea 0.10: Tests de Round-Trip

**Archivo:** `tests/integration/round-trip.test.ts`

**Objetivo:** Garantizar que el round-trip no pierde información.

**Tests:**

```typescript
// tests/integration/round-trip.test.ts

import { YamlAdapter } from '../src/core/adapters/yaml.adapter';
import * as fs from 'fs';
import * as path from 'path';

describe('Round-trip Tests', () => {
  const fixturesDir = path.join(__dirname, 'fixtures');
  
  describe('YAML Round-trip', () => {
    const yamlFiles = fs.readdirSync(fixturesDir)
      .filter(f => f.endsWith('.yaml'));
    
    yamlFiles.forEach(file => {
      it(`should preserve data in ${file}`, () => {
        const filepath = path.join(fixturesDir, file);
        const original = fs.readFileSync(filepath, 'utf-8');
        
        const lab = YamlAdapter.toCanonical(original);
        const regenerated = YamlAdapter.fromCanonical(lab);
        const reparsed = YamlAdapter.toCanonical(regenerated);
        
        // Compare canonical forms, not YAML strings
        expect(reparsed.metadata).toEqual(lab.metadata);
        expect(reparsed.devices).toHaveLength(lab.devices.length);
        expect(reparsed.connections).toHaveLength(lab.connections.length);
        
        // Check each device
        lab.devices.forEach((device, i) => {
          expect(reparsed.devices[i].name).toBe(device.name);
          expect(reparsed.devices[i].type).toBe(device.type);
          expect(reparsed.devices[i].vlans).toEqual(device.vlans);
          expect(reparsed.devices[i].routing).toEqual(device.routing);
          expect(reparsed.devices[i].security).toEqual(device.security);
        });
      });
    });
  });
  
  describe('PKA Round-trip', () => {
    // TODO: Implementar cuando PkaAdapter esté listo
    it.todo('should preserve PKA data in round-trip');
  });
});
```

---

## Checklist de Completitud

### Modelos Canónicos
- [ ] `types.ts` con todos los tipos compartidos
- [ ] `lab.spec.ts` con LabSpec completo
- [ ] `device.spec.ts` con DeviceSpec completo
- [ ] `connection.spec.ts` con ConnectionSpec unificado
- [ ] `interface.spec.ts` con InterfaceSpec
- [ ] `vlan.spec.ts` con VLANSpec
- [ ] `routing.spec.ts` con RoutingSpec
- [ ] `security.spec.ts` con SecuritySpec

### Adaptadores
- [ ] `yaml.adapter.ts` bidireccional
- [ ] `pka.adapter.ts` bidireccional
- [ ] `domain.adapter.ts` para migración temporal

### Bugs Corregidos
- [ ] `PortType.ETHERNET` no existe
- [ ] Switch ports index (Fa0/0 → Fa0/1)
- [ ] Validación con 'hub'
- [ ] Warning type 'configuration' no declarado

### Comandos Migrados
- [ ] `parse` usa modelo canónico
- [ ] `validate` usa modelo canónico
- [ ] `config` usa modelo canónico
- [ ] `devices` usa modelo canónico
- [ ] `deploy` usa modelo canónico
- [ ] Interactive mode usa modelo canónico

### Tests
- [ ] Unit tests para tipos canónicos
- [ ] Unit tests para adaptadores
- [ ] Integration tests de round-trip
- [ ] Todos los tests pasando

---

## Dependencias

| Tarea | Depende de |
|-------|------------|
| 0.1 (types) | - |
| 0.2 (lab.spec) | 0.1 |
| 0.3 (device.spec) | 0.1 |
| 0.4 (connection.spec) | 0.1 |
| 0.5 (yaml.adapter) | 0.1, 0.2, 0.3, 0.4 |
| 0.6 (PortType bug) | - |
| 0.7 (Port index bug) | - |
| 0.8 (hub bug) | - |
| 0.9 (CLI migration) | 0.5 |
| 0.10 (round-trip tests) | 0.5 |

---

## Riesgos

| Riesgo | Mitigación |
|--------|------------|
| Cambios rompen labs existentes | Migración automática con detección de versión |
| Performance de conversión | Lazy loading de adaptadores |
| Complejidad de PKA adapter | Empezar con subset, iterar |

---

## Siguiente Fase

Una vez completada la Fase 0, proceder a [FASE-1-CATALOGO.md](./FASE-1-CATALOGO.md) para expandir el catálogo de dispositivos.
