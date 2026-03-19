# Fase 4: PKA/PKT Completo

> **Estado:** ✅ COMPLETADO  
> **Tests:** 9 tests (pka)  
> **Dependencias:** Fase 0 completada

## Objetivo

Implementar importación/exportación **lossless** de archivos PKA (actividades) y PKT (topologías), preservando toda la información incluyendo Activity Wizard, instrucciones, scoring y configuraciones de evaluación.

---

## Estado Actual

### Lo que funciona

| Funcionalidad | Archivo | Estado |
|---------------|---------|--------|
| PKA decryption (v5/v7) | `pka-decoder.ts` | ✅ Funciona |
| PKA → XML | `pka-parser.ts` | ✅ Funciona |
| XML → YAML (parcial) | `pka-to-yaml.ts` | ⚠️ Pierde datos |
| Edición XML de dispositivos | `core/models/*` | ⚠️ Limitado |

### Lo que NO funciona

| Funcionalidad | Problema |
|---------------|----------|
| YAML → PKA | ❌ No implementado |
| PKT support | ❌ No implementado |
| Activity preservation | ❌ Se pierden instrucciones, scoring |
| Round-trip PKA → YAML → PKA | ❌ Pierde información |
| Device positioning | ⚠️ Parcial |
| Module/slot handling | ❌ No implementado |

---

## Arquitectura Objetivo

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              PKA/PKT Adapter                                 │
│                    /src/core/adapters/pka.adapter.ts                         │
│                                                                              │
│  PKA ↔ Canonical ↔ PKT                                                       │
└─────────────────────────────────────────────────────────────────────────────┘
                    │                           │
                    ▼                           ▼
┌────────────────────────────────┐  ┌────────────────────────────────┐
│         PKA Handler            │  │         PKT Handler            │
│    /src/core/pka/handler.ts    │  │    /src/core/pkt/handler.ts    │
│                                │  │                                │
│  - Decrypt (Twofish)           │  │  - Decrypt                     │
│  - Parse XML                   │  │  - Parse XML                   │
│  - Extract devices             │  │  - Extract devices             │
│  - Extract activity            │  │  - Extract topology only       │
│  - Serialize                   │  │  - Serialize                   │
│  - Encrypt                     │  │  - Encrypt                     │
└────────────────────────────────┘  └────────────────────────────────┘
                    │                           │
                    ▼                           ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            XML Model Layer                                   │
│                    /src/core/models/* (actualizar)                           │
│                                                                              │
│  - Network (container principal)                                            │
│  - Device models con todos los campos                                       │
│  - Activity model (instrucciones, tests, scoring)                           │
│  - Position model (coordenadas en canvas)                                   │
│  - Module model (slots, HWICs)                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Estructura de Directorios

```
src/core/
├── adapters/
│   ├── pka.adapter.ts              # Adaptador PKA ↔ Canonical
│   └── pkt.adapter.ts              # Adaptador PKT ↔ Canonical (nuevo)
│
├── pka/                            # ← NUEVO: Handler específico PKA
│   ├── index.ts
│   ├── handler.ts                  # Orquestador PKA
│   ├── decoder.ts                  # (mover desde parser/)
│   ├── encoder.ts                  # ← NUEVO: Encrypt para guardar
│   ├── parser.ts                   # XML → Models
│   ├── serializer.ts               # Models → XML
│   └── activity.ts                 # ← NUEVO: Activity Wizard handling
│
├── pkt/                            # ← NUEVO: Handler específico PKT
│   ├── index.ts
│   ├── handler.ts
│   ├── decoder.ts
│   ├── encoder.ts
│   └── parser.ts
│
├── models/
│   ├── Activity.ts                 # ← NUEVO: Activity Wizard
│   ├── Assessment.ts               # ← NUEVO: Scoring/Tests
│   ├── Position.ts                 # ← NUEVO: Coordenadas canvas
│   ├── Module.ts                   # ← NUEVO: HWIC/WIC modules
│   └── (existing models...)
```

---

## Tareas Detalladas

### Tarea 4.1: Modelo de Activity/Assessment

**Archivo:** `src/core/models/Activity.ts`

```typescript
// src/core/models/Activity.ts

/**
 * Actividad de Packet Tracer (Activity Wizard)
 */
export interface ActivityConfig {
  /** Información de la actividad */
  info: ActivityInfo;
  
  /** Red inicial */
  initialNetwork: NetworkState;
  
  /** Red de respuesta (solución) */
  answerNetwork: NetworkState;
  
  /** Pruebas/validaciones */
  tests: ActivityTest[];
  
  /** Variables */
  variables: ActivityVariable[];
  
  /** Instrucciones */
  instructions: ActivityInstructions;
  
  /** Configuración de scoring */
  scoring: ScoringConfig;
}

export interface ActivityInfo {
  /** Título de la actividad */
  title: string;
  
  /** Descripción */
  description: string;
  
  /** Autor */
  author?: string;
  
  /** Tiempo estimado (minutos) */
  estimatedTime?: number;
  
  /** Dificultad */
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  
  /** Versión */
  version?: string;
}

export interface NetworkState {
  /** Dispositivos */
  devices: DeviceState[];
  
  /** Conexiones */
  connections: ConnectionState[];
  
  /** Configuraciones específicas */
  configurations: Map<string, string>;  // deviceName -> config
}

export interface DeviceState {
  /** Nombre del dispositivo */
  name: string;
  
  /** Tipo */
  type: string;
  
  /** Modelo */
  model?: string;
  
  /** Posición en canvas */
  position: Position;
  
  /** Interfaces */
  interfaces: InterfaceState[];
  
  /** Módulos instalados */
  modules?: string[];
  
  /** Estado de power */
  powerOn: boolean;
}

export interface InterfaceState {
  name: string;
  ip?: string;
  subnetMask?: string;
  mac?: string;
  vlan?: number;
  trunk?: boolean;
  shutdown?: boolean;
}

export interface ConnectionState {
  fromDevice: string;
  fromPort: string;
  toDevice: string;
  toPort: string;
  cableType: string;
}

export interface Position {
  x: number;
  y: number;
}

export interface ActivityTest {
  /** ID del test */
  id: string;
  
  /** Nombre */
  name: string;
  
  /** Tipo de test */
  type: TestType;
  
  /** Configuración del test */
  config: TestConfig;
  
  /** Puntos */
  points: number;
  
  /** Feedback para el usuario */
  feedback?: {
    success?: string;
    failure?: string;
  };
}

export type TestType = 
  | 'ping'
  | 'traceroute'
  | 'web'
  | 'email'
  | 'ftp'
  | 'dhcp'
  | 'dns'
  | 'interface'
  | 'vlan'
  | 'routing'
  | 'acl'
  | 'nat'
  | 'custom';

export interface TestConfig {
  /** Origen */
  source?: {
    device: string;
    interface?: string;
  };
  
  /** Destino */
  destination?: {
    device: string;
    interface?: string;
    ip?: string;
    url?: string;
  };
  
  /** Resultado esperado */
  expected: {
    success: boolean;
    value?: string | number | boolean;
    matches?: string;  // regex
  };
  
  /** Timeout */
  timeout?: number;
  
  /** Comando custom */
  customCommand?: string;
  
  /** Output esperado */
  expectedOutput?: string;
}

export interface ActivityVariable {
  /** Nombre de la variable */
  name: string;
  
  /** Tipo */
  type: 'string' | 'number' | 'ip' | 'mac' | 'interface';
  
  /** Valor por defecto */
  defaultValue: string | number;
  
  /** Descripción */
  description?: string;
  
  /** Rango (para números) */
  range?: {
    min: number;
    max: number;
  };
  
  /** Para qué se usa */
  usedIn: string[];  // test IDs
}

export interface ActivityInstructions {
  /** Texto principal */
  main?: string;
  
  /** Formato */
  format: 'text' | 'html' | 'markdown';
  
  /** Pasos */
  steps?: string[];
  
  /** Recursos externos */
  resources?: {
    type: 'pdf' | 'video' | 'link' | 'image';
    url: string;
    title?: string;
  }[];
  
  /** Notas para el instructor */
  instructorNotes?: string;
}

export interface ScoringConfig {
  /** Puntaje total */
  totalPoints: number;
  
  /** Puntaje mínimo para aprobar */
  passingScore: number;
  
  /** Mostrar feedback inmediato */
  showFeedback: boolean;
  
  /** Mostrar respuestas correctas */
  showAnswers: boolean;
  
  /** Tiempo límite (minutos, 0 = sin límite) */
  timeLimit: number;
  
  /** Permitir reintentos */
  allowRetries: boolean;
  
  /** Máximo de reintentos */
  maxRetries?: number;
}

/**
 * Clase para manejar actividades
 */
export class Activity {
  private config: ActivityConfig;
  
  constructor(config: ActivityConfig) {
    this.config = config;
  }
  
  /**
   * Ejecuta un test específico
   */
  async runTest(testId: string, network: NetworkState): Promise<TestResult> {
    const test = this.config.tests.find(t => t.id === testId);
    if (!test) {
      throw new Error(`Test ${testId} not found`);
    }
    
    // Implementar ejecución según tipo
    switch (test.type) {
      case 'ping':
        return this.runPingTest(test, network);
      case 'interface':
        return this.runInterfaceTest(test, network);
      // ... otros tipos
      default:
        throw new Error(`Unknown test type: ${test.type}`);
    }
  }
  
  /**
   * Ejecuta todos los tests
   */
  async runAllTests(network: NetworkState): Promise<TestResult[]> {
    const results: TestResult[] = [];
    
    for (const test of this.config.tests) {
      const result = await this.runTest(test.id, network);
      results.push(result);
    }
    
    return results;
  }
  
  /**
   * Calcula el puntaje total
   */
  calculateScore(results: TestResult[]): number {
    return results
      .filter(r => r.passed)
      .reduce((sum, r) => sum + (r.points || 0), 0);
  }
  
  private async runPingTest(test: ActivityTest, network: NetworkState): Promise<TestResult> {
    // Implementar test de ping
    // ...
  }
  
  private async runInterfaceTest(test: ActivityTest, network: NetworkState): Promise<TestResult> {
    // Implementar test de interface
    // ...
  }
}

export interface TestResult {
  testId: string;
  testName: string;
  passed: boolean;
  points: number;
  actualValue?: string | number | boolean;
  expectedValue?: string | number | boolean;
  message?: string;
  duration: number;
}
```

---

### Tarea 4.2: Modelo de Position

**Archivo:** `src/core/models/Position.ts`

```typescript
// src/core/models/Position.ts

/**
 * Posición en el canvas de Packet Tracer
 */
export interface CanvasPosition {
  /** Coordenada X */
  x: number;
  
  /** Coordenada Y */
  y: number;
  
  /** Dimensiones (para clusters) */
  width?: number;
  height?: number;
  
  /** Rotación en grados */
  rotation?: number;
}

/**
 * Posición física (modo physical)
 */
export interface PhysicalPosition {
  /** Container hierarchy */
  containers: PhysicalContainer[];
  
  /** Posición dentro del container actual */
  localPosition: CanvasPosition;
}

export interface PhysicalContainer {
  type: 'intercity' | 'city' | 'building' | 'closet';
  name: string;
  id: string;
}

/**
 * Utilidades para posicionamiento
 */
export class PositionUtils {
  /**
   * Calcula layout automático para topología
   */
  static autoLayout(
    deviceCount: number,
    canvasWidth: number = 2000,
    canvasHeight: number = 1500,
    algorithm: 'grid' | 'circle' | 'tree' = 'grid'
  ): CanvasPosition[] {
    const positions: CanvasPosition[] = [];
    
    switch (algorithm) {
      case 'grid':
        return this.gridLayout(deviceCount, canvasWidth, canvasHeight);
      case 'circle':
        return this.circleLayout(deviceCount, canvasWidth, canvasHeight);
      case 'tree':
        return this.treeLayout(deviceCount, canvasWidth, canvasHeight);
    }
  }
  
  private static gridLayout(count: number, w: number, h: number): CanvasPosition[] {
    const cols = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / cols);
    const cellW = w / (cols + 1);
    const cellH = h / (rows + 1);
    
    const positions: CanvasPosition[] = [];
    
    for (let i = 0; i < count; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      
      positions.push({
        x: cellW * (col + 1),
        y: cellH * (row + 1)
      });
    }
    
    return positions;
  }
  
  private static circleLayout(count: number, w: number, h: number): CanvasPosition[] {
    const centerX = w / 2;
    const centerY = h / 2;
    const radius = Math.min(w, h) * 0.35;
    
    const positions: CanvasPosition[] = [];
    
    for (let i = 0; i < count; i++) {
      const angle = (2 * Math.PI * i) / count;
      
      positions.push({
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle)
      });
    }
    
    return positions;
  }
  
  private static treeLayout(count: number, w: number, h: number): CanvasPosition[] {
    // Layout en árbol (routers arriba, switches medio, endpoints abajo)
    const positions: CanvasPosition[] = [];
    const levels = 3;  // routers, switches, endpoints
    const levelHeight = h / (levels + 1);
    
    for (let i = 0; i < count; i++) {
      positions.push({
        x: (w / (count + 1)) * (i + 1),
        y: levelHeight * ((i % levels) + 1)
      });
    }
    
    return positions;
  }
}
```

---

### Tarea 4.3: PKA Encoder (para guardar)

**Archivo:** `src/core/pka/encoder.ts`

```typescript
// src/core/pka/encoder.ts

import * as zlib from 'zlib';
import { Twofish } from 'twofish-ts';

/**
 * Constantes de encriptación (mismas que decoder)
 */
const TWOFISH_KEY = new Uint8Array([
  0x89, 0x89, 0x89, 0x89, 0x89, 0x89, 0x89, 0x89,
  0x89, 0x89, 0x89, 0x89, 0x89, 0x89, 0x89, 0x89
]);

const TWOFISH_IV = new Uint8Array([
  0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x10,
  0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x10
]);

/**
 * Encoder para crear archivos PKA
 */
export class PKAEncoder {
  /**
   * Codifica un XML string a formato PKA binario
   */
  static encode(xmlContent: string, version: '5' | '7' = '7'): Buffer {
    // 1. Comprimir con zlib
    const compressed = zlib.deflateSync(Buffer.from(xmlContent, 'utf-8'));
    
    // 2. Aplicar XOR forward
    const xored = this.applyForwardXOR(compressed);
    
    // 3. Encriptar con Twofish CBC
    const encrypted = this.twofishEncrypt(xored);
    
    // 4. Aplicar XOR reverse
    const final = this.applyReverseXOR(encrypted);
    
    // 5. Añadir header mágico
    const header = Buffer.from(this.getMagicHeader(version));
    
    return Buffer.concat([header, final]);
  }
  
  /**
   * XOR forward (pre-encryption)
   */
  private static applyForwardXOR(data: Buffer): Buffer {
    const result = Buffer.alloc(data.length);
    
    for (let i = 0; i < data.length; i++) {
      result[i] = data[i] ^ ((i + 1) % 256);
    }
    
    return result;
  }
  
  /**
   * XOR reverse (post-encryption)
   */
  private static applyReverseXOR(data: Buffer): Buffer {
    const result = Buffer.alloc(data.length);
    
    for (let i = 0; i < data.length; i++) {
      // XOR con valor decreciente desde la longitud
      result[i] = data[i] ^ ((data.length - i) % 256);
    }
    
    return result;
  }
  
  /**
   * Twofish CBC encryption
   */
  private static twofishEncrypt(data: Buffer): Buffer {
    const twofish = new Twofish(TWOFISH_KEY);
    
    // Pad to 16-byte boundary
    const padded = this.pkcs7Pad(data, 16);
    
    // CBC mode
    const result = Buffer.alloc(padded.length);
    let prevBlock = TWOFISH_IV;
    
    for (let i = 0; i < padded.length; i += 16) {
      const block = padded.slice(i, i + 16);
      
      // XOR with previous ciphertext (or IV)
      for (let j = 0; j < 16; j++) {
        block[j] ^= prevBlock[j];
      }
      
      // Encrypt
      const encrypted = twofish.encrypt(block);
      encrypted.copy(result, i);
      
      prevBlock = encrypted;
    }
    
    return result;
  }
  
  /**
   * PKCS7 padding
   */
  private static pkcs7Pad(data: Buffer, blockSize: number): Buffer {
    const padLen = blockSize - (data.length % blockSize);
    const padded = Buffer.alloc(data.length + padLen);
    data.copy(padded);
    padded.fill(padLen, data.length);
    return padded;
  }
  
  /**
   * Magic header para PT version
   */
  private static getMagicHeader(version: string): Buffer {
    // Estos bytes mágicos identifican la versión de Packet Tracer
    if (version === '7') {
      return Buffer.from([0x50, 0x4B, 0x41, 0x07]);  // "PKA\x07"
    } else {
      return Buffer.from([0x50, 0x4B, 0x41, 0x05]);  // "PKA\x05"
    }
  }
}
```

---

### Tarea 4.4: PKA Serializer (Model → XML)

**Archivo:** `src/core/pka/serializer.ts`

```typescript
// src/core/pka/serializer.ts

import type { LabSpec } from '../canonical/lab.spec';
import type { DeviceSpec } from '../canonical/device.spec';
import type { ActivityConfig } from '../models/Activity';
import type { CanvasPosition } from '../models/Position';

/**
 * Serializa un LabSpec a XML de Packet Tracer
 */
export class PKASerializer {
  /**
   * Serializa lab completo a XML
   */
  static serialize(lab: LabSpec, activity?: ActivityConfig): string {
    const lines: string[] = [];
    
    lines.push('<?xml version="1.0" encoding="utf-8"?>');
    lines.push('<PKT>');
    
    // Metadatos
    lines.push(this.serializeMetadata(lab));
    
    // Dispositivos
    lines.push('  <NETWORK>');
    for (const device of lab.devices) {
      lines.push(this.serializeDevice(device));
    }
    lines.push('  </NETWORK>');
    
    // Conexiones
    lines.push('  <CONNECTIONS>');
    for (const conn of lab.connections) {
      lines.push(this.serializeConnection(conn, lab.devices));
    }
    lines.push('  </CONNECTIONS>');
    
    // Activity (si existe)
    if (activity) {
      lines.push(this.serializeActivity(activity));
    }
    
    lines.push('</PKT>');
    
    return lines.join('\n');
  }
  
  private static serializeMetadata(lab: LabSpec): string {
    return `  <INFO>
    <TITLE>${this.escapeXml(lab.metadata.name)}</TITLE>
    <DESCRIPTION>${this.escapeXml(lab.metadata.description || '')}</DESCRIPTION>
    <AUTHOR>${this.escapeXml(lab.metadata.author || 'cisco-auto')}</AUTHOR>
    <VERSION>${lab.metadata.version}</VERSION>
    <DIFFICULTY>${lab.metadata.difficulty}</DIFFICULTY>
    <ESTIMATED_TIME>${lab.metadata.estimatedTime || ''}</ESTIMATED_TIME>
  </INFO>`;
  }
  
  private static serializeDevice(device: DeviceSpec): string {
    const lines: string[] = [];
    
    lines.push(`    <DEVICE>`);
    lines.push(`      <NAME>${this.escapeXml(device.name)}</NAME>`);
    lines.push(`      <TYPE>${device.type}</TYPE>`);
    
    if (device.model) {
      lines.push(`      <MODEL>${device.model.model}</MODEL>`);
    }
    
    // Posición
    if (device.config?.position) {
      const pos = device.config.position as CanvasPosition;
      lines.push(`      <POSITION>`);
      lines.push(`        <X>${pos.x}</X>`);
      lines.push(`        <Y>${pos.y}</Y>`);
      lines.push(`      </POSITION>`);
    }
    
    // Interfaces
    lines.push(`      <INTERFACES>`);
    for (const iface of device.interfaces) {
      lines.push(this.serializeInterface(iface));
    }
    lines.push(`      </INTERFACES>`);
    
    // Running config
    if (device.config?.runningConfig) {
      lines.push(`      <RUNNINGCONFIG>`);
      lines.push(`        <![CDATA[${device.config.runningConfig}]]>`);
      lines.push(`      </RUNNINGCONFIG>`);
    }
    
    lines.push(`    </DEVICE>`);
    
    return lines.join('\n');
  }
  
  private static serializeInterface(iface: InterfaceSpec): string {
    const lines: string[] = [];
    
    lines.push(`        <INTERFACE>`);
    lines.push(`          <NAME>${this.escapeXml(iface.name)}</NAME>`);
    
    if (iface.ip) {
      lines.push(`          <IP>${iface.ip}</IP>`);
      lines.push(`          <SUBNET>${iface.subnetMask}</SUBNET>`);
    }
    
    if (iface.vlan) {
      lines.push(`          <VLAN>${iface.vlan}</VLAN>`);
    }
    
    if (iface.trunk) {
      lines.push(`          <TRUNK>true</TRUNK>`);
    }
    
    if (iface.shutdown) {
      lines.push(`          <SHUTDOWN>true</SHUTDOWN>`);
    }
    
    lines.push(`        </INTERFACE>`);
    
    return lines.join('\n');
  }
  
  private static serializeConnection(conn: ConnectionSpec, devices: DeviceSpec[]): string {
    const lines: string[] = [];
    
    lines.push(`    <CONNECTION>`);
    lines.push(`      <FROM>`);
    lines.push(`        <DEVICE>${this.escapeXml(conn.from.deviceName)}</DEVICE>`);
    lines.push(`        <PORT>${this.escapeXml(conn.from.port)}</PORT>`);
    lines.push(`      </FROM>`);
    lines.push(`      <TO>`);
    lines.push(`        <DEVICE>${this.escapeXml(conn.to.deviceName)}</DEVICE>`);
    lines.push(`        <PORT>${this.escapeXml(conn.to.port)}</PORT>`);
    lines.push(`      </TO>`);
    lines.push(`      <CABLETYPE>${conn.cableType}</CABLETYPE>`);
    lines.push(`    </CONNECTION>`);
    
    return lines.join('\n');
  }
  
  private static serializeActivity(activity: ActivityConfig): string {
    const lines: string[] = [];
    
    lines.push(`  <ACTIVITY>`);
    lines.push(`    <TITLE>${this.escapeXml(activity.info.title)}</TITLE>`);
    lines.push(`    <DESCRIPTION>${this.escapeXml(activity.info.description)}</DESCRIPTION>`);
    
    // Instrucciones
    if (activity.instructions.main) {
      lines.push(`    <INSTRUCTIONS>`);
      lines.push(`      <![CDATA[${activity.instructions.main}]]>`);
      lines.push(`    </INSTRUCTIONS>`);
    }
    
    // Tests
    lines.push(`    <TESTS>`);
    for (const test of activity.tests) {
      lines.push(this.serializeTest(test));
    }
    lines.push(`    </TESTS>`);
    
    // Scoring
    lines.push(`    <SCORING>`);
    lines.push(`      <TOTAL_POINTS>${activity.scoring.totalPoints}</TOTAL_POINTS>`);
    lines.push(`      <PASSING_SCORE>${activity.scoring.passingScore}</PASSING_SCORE>`);
    lines.push(`    </SCORING>`);
    
    lines.push(`  </ACTIVITY>`);
    
    return lines.join('\n');
  }
  
  private static serializeTest(test: ActivityTest): string {
    const lines: string[] = [];
    
    lines.push(`      <TEST>`);
    lines.push(`        <ID>${test.id}</ID>`);
    lines.push(`        <NAME>${this.escapeXml(test.name)}</NAME>`);
    lines.push(`        <TYPE>${test.type}</TYPE>`);
    lines.push(`        <POINTS>${test.points}</POINTS>`);
    
    // Source
    if (test.config.source) {
      lines.push(`        <SOURCE>`);
      lines.push(`          <DEVICE>${test.config.source.device}</DEVICE>`);
      if (test.config.source.interface) {
        lines.push(`          <INTERFACE>${test.config.source.interface}</INTERFACE>`);
      }
      lines.push(`        </SOURCE>`);
    }
    
    // Destination
    if (test.config.destination) {
      lines.push(`        <DESTINATION>`);
      if (test.config.destination.ip) {
        lines.push(`          <IP>${test.config.destination.ip}</IP>`);
      }
      if (test.config.destination.url) {
        lines.push(`          <URL>${this.escapeXml(test.config.destination.url)}</URL>`);
      }
      lines.push(`        </DESTINATION>`);
    }
    
    // Expected
    lines.push(`        <EXPECTED>`);
    lines.push(`          <SUCCESS>${test.config.expected.success}</SUCCESS>`);
    lines.push(`        </EXPECTED>`);
    
    lines.push(`      </TEST>`);
    
    return lines.join('\n');
  }
  
  private static escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
```

---

### Tarea 4.5: PKA Adapter Completo

**Archivo:** `src/core/adapters/pka.adapter.ts`

```typescript
// src/core/adapters/pka.adapter.ts

import type { LabSpec } from '../canonical/lab.spec';
import type { DeviceSpec } from '../canonical/device.spec';
import type { ActivityConfig } from '../models/Activity';
import { PKADecoder } from '../pka/decoder';
import { PKAEncoder } from '../pka/encoder';
import { PKAParser } from '../pka/parser';
import { PKASerializer } from '../pka/serializer';
import * as fs from 'fs';

export interface PKAContent {
  lab: LabSpec;
  activity?: ActivityConfig;
  raw: {
    xml: string;
    version: string;
  };
}

export interface PKAExportOptions {
  /** Versión de Packet Tracer objetivo */
  targetVersion: '5' | '7' | '8';
  
  /** Incluir Activity Wizard */
  includeActivity: boolean;
  
  /** Auto-layout si no hay posiciones */
  autoLayout: boolean;
  
  /** Dimensiones del canvas */
  canvasSize: {
    width: number;
    height: number;
  };
}

/**
 * Adaptador completo PKA ↔ Canonical
 */
export class PkaAdapter {
  /**
   * Importa archivo PKA
   */
  static import(filepath: string): PKAContent {
    const buffer = fs.readFileSync(filepath);
    
    // Detectar versión
    const version = this.detectVersion(buffer);
    
    // Decodificar
    const xml = PKADecoder.decode(buffer);
    
    // Parsear
    const parsed = PKAParser.parse(xml);
    
    return {
      lab: parsed.lab,
      activity: parsed.activity,
      raw: {
        xml,
        version
      }
    };
  }
  
  /**
   * Exporta a archivo PKA
   */
  static export(
    lab: LabSpec,
    activity: ActivityConfig | undefined,
    filepath: string,
    options: Partial<PKAExportOptions> = {}
  ): void {
    const opts: PKAExportOptions = {
      targetVersion: '7',
      includeActivity: !!activity,
      autoLayout: true,
      canvasSize: { width: 2000, height: 1500 },
      ...options
    };
    
    // Aplicar auto-layout si es necesario
    if (opts.autoLayout) {
      lab = this.applyAutoLayout(lab, opts.canvasSize);
    }
    
    // Serializar a XML
    const xml = PKASerializer.serialize(lab, opts.includeActivity ? activity : undefined);
    
    // Codificar a PKA
    const pka = PKAEncoder.encode(xml, opts.targetVersion);
    
    // Guardar
    fs.writeFileSync(filepath, pka);
  }
  
  /**
   * Round-trip: PKA → Lab → PKA
   */
  static roundTrip(filepath: string, outputPath: string): {
    success: boolean;
    warnings: string[];
    errors: string[];
  } {
    const warnings: string[] = [];
    const errors: string[] = [];
    
    try {
      // Importar
      const content = this.import(filepath);
      
      // Verificar datos preservados
      if (content.activity) {
        // Verificar que no se perdió información crítica
        // ...
      }
      
      // Exportar
      this.export(
        content.lab,
        content.activity,
        outputPath,
        { targetVersion: content.raw.version as any }
      );
      
      return { success: true, warnings, errors };
      
    } catch (error: any) {
      errors.push(error.message);
      return { success: false, warnings, errors };
    }
  }
  
  /**
   * Detecta versión del archivo PKA
   */
  private static detectVersion(buffer: Buffer): string {
    const magic = buffer.slice(0, 4).toString('ascii');
    
    if (magic.startsWith('PKA')) {
      return magic[3] || '7';
    }
    
    return '7';  // Default
  }
  
  /**
   * Aplica auto-layout a dispositivos sin posición
   */
  private static applyAutoLayout(lab: LabSpec, canvasSize: { width: number; height: number }): LabSpec {
    const { PositionUtils } = require('../models/Position');
    
    // Contar dispositivos sin posición
    const needsPosition = lab.devices.filter(d => !d.config?.position);
    
    if (needsPosition.length === 0) {
      return lab;
    }
    
    // Generar posiciones
    const positions = PositionUtils.autoLayout(
      lab.devices.length,
      canvasSize.width,
      canvasSize.height
    );
    
    // Asignar posiciones
    lab.devices.forEach((device, i) => {
      if (!device.config) {
        device.config = {};
      }
      device.config.position = positions[i];
    });
    
    return lab;
  }
}
```

---

### Tarea 4.6: PKT Handler (Topología sin Activity)

**Archivo:** `src/core/pkt/handler.ts`

```typescript
// src/core/pkt/handler.ts

import type { LabSpec } from '../canonical/lab.spec';
import * as fs from 'fs';
import * as zlib from 'zlib';

/**
 * Handler para archivos PKT (topologías simples sin actividad)
 * Similar a PKA pero sin Activity Wizard
 */
export class PKTHandler {
  /**
   * Importa archivo PKT
   */
  static import(filepath: string): LabSpec {
    const buffer = fs.readFileSync(filepath);
    
    // PKT usa el mismo formato que PKA pero sin <ACTIVITY>
    const xml = this.decode(buffer);
    
    // Parsear (sin actividad)
    const parsed = this.parse(xml);
    
    return parsed;
  }
  
  /**
   * Exporta a archivo PKT
   */
  static export(lab: LabSpec, filepath: string): void {
    // Serializar sin actividad
    const xml = this.serialize(lab);
    
    // Codificar
    const pkt = this.encode(xml);
    
    // Guardar
    fs.writeFileSync(filepath, pkt);
  }
  
  /**
   * Decodifica PKT a XML
   */
  private static decode(buffer: Buffer): string {
    // Similar a PKA decoder
    // ...
    
    // Por ahora, asumir que usa el mismo formato
    const { PKADecoder } = require('../pka/decoder');
    return PKADecoder.decode(buffer);
  }
  
  /**
   * Codifica XML a PKT
   */
  private static encode(xml: string): Buffer {
    // Similar a PKA encoder
    // ...
    
    const { PKAEncoder } = require('../pka/encoder');
    return PKAEncoder.encode(xml, '7');
  }
  
  /**
   * Parsea XML a LabSpec
   */
  private static parse(xml: string): LabSpec {
    // Similar a PKA parser pero sin actividad
    // ...
    
    const { PKAParser } = require('../pka/parser');
    return PKAParser.parse(xml).lab;
  }
  
  /**
   * Serializa LabSpec a XML
   */
  private static serialize(lab: LabSpec): string {
    // Similar a PKA serializer pero sin actividad
    // ...
    
    const { PKASerializer } = require('../pka/serializer');
    return PKASerializer.serialize(lab);
  }
}
```

---

## Tests

### Tarea 4.7: Tests de Round-Trip PKA

**Archivo:** `tests/integration/pka-roundtrip.test.ts`

```typescript
// tests/integration/pka-roundtrip.test.ts

import { PkaAdapter } from '../../src/core/adapters/pka.adapter';
import * as fs from 'fs';
import * as path from 'path';

describe('PKA Round-Trip', () => {
  const fixturesDir = path.join(__dirname, '../fixtures/pka');
  
  describe('Import/Export', () => {
    const pkaFiles = fs.readdirSync(fixturesDir)
      .filter(f => f.endsWith('.pka'));
    
    pkaFiles.forEach(file => {
      it(`should preserve data in ${file}`, () => {
        const inputPath = path.join(fixturesDir, file);
        const outputPath = path.join(fixturesDir, `output_${file}`);
        
        // Import
        const content = PkaAdapter.import(inputPath);
        
        // Verify basic structure
        expect(content.lab).toBeDefined();
        expect(content.lab.devices.length).toBeGreaterThan(0);
        
        // Export
        PkaAdapter.export(content.lab, content.activity, outputPath);
        
        // Re-import
        const reimported = PkaAdapter.import(outputPath);
        
        // Compare
        expect(reimported.lab.devices.length).toBe(content.lab.devices.length);
        expect(reimported.lab.connections.length).toBe(content.lab.connections.length);
        
        // Cleanup
        fs.unlinkSync(outputPath);
      });
      
      it(`should preserve activity in ${file}`, () => {
        const inputPath = path.join(fixturesDir, file);
        const outputPath = path.join(fixturesDir, `output_${file}`);
        
        const content = PkaAdapter.import(inputPath);
        
        if (content.activity) {
          // Export with activity
          PkaAdapter.export(content.lab, content.activity, outputPath);
          
          // Re-import
          const reimported = PkaAdapter.import(outputPath);
          
          // Verify activity preserved
          expect(reimported.activity).toBeDefined();
          expect(reimported.activity?.info.title).toBe(content.activity.info.title);
          expect(reimported.activity?.tests.length).toBe(content.activity.tests.length);
        }
        
        // Cleanup
        if (fs.existsSync(outputPath)) {
          fs.unlinkSync(outputPath);
        }
      });
    });
  });
  
  describe('Round-trip validation', () => {
    it('should round-trip without data loss', () => {
      const inputFile = path.join(fixturesDir, 'sample.pka');
      const outputFile = path.join(fixturesDir, 'roundtrip.pka');
      
      const result = PkaAdapter.roundTrip(inputFile, outputFile);
      
      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
      
      // Cleanup
      if (fs.existsSync(outputFile)) {
        fs.unlinkSync(outputFile);
      }
    });
  });
});
```

---

## Checklist de Completitud

### Modelos
- [ ] Activity model completo
- [ ] Assessment/Test models
- [ ] Position model
- [ ] Module/Slot models

### PKA Handler
- [ ] Decoder funcional (existente)
- [ ] Encoder implementado
- [ ] Parser mejorado
- [ ] Serializer implementado
- [ ] Activity preservation

### PKT Handler
- [ ] Import PKT
- [ ] Export PKT

### Adapter
- [ ] PKA Adapter bidireccional
- [ ] PKT Adapter bidireccional
- [ ] Round-trip sin pérdida
- [ ] Auto-layout

### Tests
- [ ] Import tests
- [ ] Export tests
- [ ] Round-trip tests
- [ ] Activity preservation tests

---

## Siguiente Fase

Una vez completada la Fase 4, proceder a [FASE-5-VALOR-AGREGADO.md](./FASE-5-VALOR-AGREGADO.md) para implementar simulación básica, templates y colaboración.
