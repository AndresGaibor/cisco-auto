# Regla de Dependencia — Clean Architecture

## La Regla Fundamental

> **Las dependencias solo apuntan hacia adentro.** El código de las capas externas puede conocer las capas internas, pero nunca al revés.

```
┌─────────────────────────────────────────────────────────┐
│                    FRAMEWORKS (Bun)                      │  ← Capa externa
│  ┌───────────────────────────────────────────────────┐  │
│  │               INTERFACES ADAPTERS                  │  │
│  │  (Backends, Plugins, CLI, FileBridge)             │  │
│  │  ┌─────────────────────────────────────────────┐  │  │
│  │  │           APPLICATION LAYER                  │  │  │
│  │  │  (Use Cases, Ports/Interfaces)               │  │  │
│  │  │  ┌───────────────────────────────────────┐  │  │  │
│  │  │  │            DOMAIN LAYER               │  │  │  │
│  │  │  │  (Entities, Aggregates, Value Objects)│  │  │  │  ← Capa interna
│  │  │  └───────────────────────────────────────┘  │  │  │
│  │  └─────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘

         Dependen de → → → → → → → → → → → → →
```

## Qué Puede Dependender Cada Capa

### Domain Layer (más interno)

**Puede depender de:** Nada. Es puro.

**NO puede depender de:**
- Zod (validación externa)
- Bun (runtime)
- Interfaces de aplicación
- Plugins
- Backends
- Cualquier cosa fuera de `domain/`

```typescript
// ✅ CORRECTO: Value Object puro, sin dependencias externas
class VlanId extends ValueObject<number> {
  static isValid(value: number): boolean {
    return value >= 1 && value <= 4094;  // Solo lógica pura
  }
}

// ❌ INCORRECTO: Domain importando Zod
import { z } from 'zod';  // ← ¡Zod es externo al dominio!
class VlanId extends ValueObject<number> { /* ... */ }
```

### Application Layer

**Puede depender de:**
- Domain layer (entities, aggregates, value objects)
- Shared kernel (base classes, errors)
- Sus propias interfaces (ports)

**NO puede depender de:**
- Implementaciones concretas de backends
- Plugins concretos
- Bun APIs directamente
- FileBridge, SSH, etc.

```typescript
// ✅ CORRECTO: Use case depende de interfaces (ports)
import type { PersistencePort } from '../../ports/driven/persistence.port.js';
import type { BackendPlugin } from '../../../../plugin-api/backend.plugin.js';

export class ApplyVlanUseCase implements UseCase<ApplyVlanInput, UseCaseResult<ApplyVlanOutput>> {
  constructor(
    private readonly repository: PersistencePort<DeviceEntity>,  // Interfaz
    private readonly backend: BackendPluginWithDeviceMethods,     // Interfaz
    private readonly registry: PluginRegistry,                    // Interfaz
  ) {}
  // ...
}

// ❌ INCORRECTO: Use case importando implementación concreta
import { PacketTracerBackendAdapter } from '../../../../backends/packet-tracer/packet-tracer.adapter.js';
// ← El use case no debe conocer implementaciones
```

### Plugin API

**Puede depender de:**
- Domain layer (para tipos de dominio)
- Application ports (BackendPort)

**NO puede depender de:**
- Implementaciones de plugins concretos
- Backends concretos

```typescript
// ✅ CORRECTO: BackendPlugin depende de BackendPort (interfaz)
import type { BackendPort } from '../application/ports/driven/backend.port.js';

export interface BackendPlugin extends BackendPort {
  category: 'backend';
  name: string;
  version: string;
  validate(config: unknown): PluginValidationResult;
}
```

### Plugins

**Pueden depender de:**
- Plugin API (interfaces)
- Sus propios schemas Zod

**NO pueden depender de:**
- Otros plugins directamente
- Backends concretos
- Use cases

```typescript
// ✅ CORRECTO: Plugin depende solo de la interfaz ProtocolPlugin
import type { ProtocolPlugin } from '../../plugin-api/protocol.plugin.js';

export const vlanPlugin: ProtocolPlugin = {
  id: 'vlan',
  category: 'switching',
  // ...
};
```

### Backends (capa más externa)

**Pueden depender de:**
- Plugin API
- Application ports
- Cualquier infraestructura (Bun, filesystem, red)

**NO pueden depender de:**
- Use cases
- Plugins de protocolo

```typescript
// ✅ CORRECTO: Backend implementa interfaces y usa infraestructura
import type { BackendPlugin } from '../../plugin-api/backend.plugin.js';
import { createPacketTracerAdapter } from './packet-tracer.adapter.js';

export function createPacketTracerBackendPlugin(
  adapter = createPacketTracerAdapter(),
): PacketTracerBackendPlugin {
  return {
    id: 'packet-tracer',
    connect: (config) => adapter.connect(config),  // Infraestructura
    // ...
  };
}
```

## Dependency Inversion Principle (DIP)

El DIP se aplica a través de **Ports** (interfaces) que el dominio y la aplicación definen, y que la infraestructura implementa.

### Ejemplo: PersistencePort

**El dominio define la interfaz:**

```typescript
// packages/kernel/src/application/ports/driven/persistence.port.ts
export interface PersistencePort<T> {
  findById(id: string): Promise<T | null>;
  save(entity: T): Promise<void>;
  delete(id: string): Promise<void>;
}
```

**Un adaptador externo la implementa:**

```typescript
// packages/pt-control/src/infrastructure/memory-device-repository.ts
export class MemoryDeviceRepository implements PersistencePort<DeviceEntity> {
  private readonly store = new Map<string, DeviceEntity>();

  async findById(id: string): Promise<DeviceEntity | null> {
    return this.store.get(id) ?? null;
  }

  async save(entity: DeviceEntity): Promise<void> {
    this.store.set(entity.id, entity);
  }

  async delete(id: string): Promise<void> {
    this.store.delete(id);
  }
}
```

**El use case solo conoce la interfaz:**

```typescript
// El use case NO sabe si usa memoria, SQLite, o API REST
constructor(private readonly repository: PersistencePort<DeviceEntity>) {}
```

### Ejemplo: BackendPort

```
┌─────────────────────┐     depende de     ┌──────────────────┐
│   Application Layer │ ──────────────────▶│   BackendPort    │
│   (Use Cases)       │                    │   (interface)    │
└─────────────────────┘                    └────────┬─────────┘
                                                    │
                                   implementan      │
                                   ┌────────────────┼────────────────┐
                                   │                │                │
                          ┌────────▼──────┐  ┌──────▼──────┐  ┌────▼─────┐
                          │ Packet Tracer │  │   GNS3      │  │  Real    │
                          │   Backend     │  │  (futuro)   │  │  Device  │
                          └───────────────┘  └─────────────┘  └──────────┘
```

## Ports y Adapters

### Driven Ports (puertos manejados)

Interfaces que el dominio/aplicación define y la infraestructura implementa:

| Port | Ubicación | Implementaciones |
|------|-----------|-----------------|
| `BackendPort` | `application/ports/driven/backend.port.ts` | PacketTracerBackendPlugin |
| `PersistencePort<T>` | `application/ports/driven/persistence.port.ts` | MemoryDeviceRepository, SQLiteRepo |
| `LoggerPort` | `application/ports/driven/logger.port.ts` | PinoLogger, ConsoleLogger |

```typescript
// packages/kernel/src/application/ports/driven/logger.port.ts
export interface LoggerPort {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}
```

### Driver Ports (puertos conductores)

Interfaces que exponen las capacidades del sistema hacia el exterior (CLI, API REST, etc.).

Actualmente definidos en `application/ports/driver/`.

## Reglas de Importación por Paquete

```
@kernel/domain        → solo shared kernel
@kernel/application   → domain, shared kernel, plugin-api (interfaces)
@kernel/plugin-api    → domain (tipos), application/ports
@kernel/plugins       → plugin-api, propios schemas
@kernel/backends      → plugin-api, application/ports, infraestructura externa

@pt-control           → kernel (todo), file-bridge, types
@core                 → types, ios-domain
@file-bridge          → types
```

## Violaciones Comunes a Evitar

### 1. Dominio importando Zod

```typescript
// ❌ MAL
import { z } from 'zod';
export const vlanSchema = z.object({ /* ... */ });

// ✅ BIEN — Schema en el plugin, no en el dominio
// packages/kernel/src/plugins/vlan/vlan.schema.ts
import { z } from 'zod';
export const vlanSchema = z.object({ /* ... */ });
```

### 2. Dominio importando infraestructura

```typescript
// ❌ MAL
import { BunFile } from 'bun';
class DeviceAggregate {
  async loadFromFile(file: BunFile) { /* ... */ }
}

// ✅ BIEN — Usar ports
class DeviceAggregate {
  static fromJSON(data: Record<string, unknown>): DeviceAggregate { /* ... */ }
}
// La carga de archivos la hace un adaptador externo
```

### 3. Use case importando implementación concreta

```typescript
// ❌ MAL
import { PacketTracerBackendPlugin } from '../../backends/packet-tracer/';

// ✅ BIEN — Depender de interfaces
import type { BackendPlugin } from '../../../../plugin-api/backend.plugin.js';
```

### 4. Plugin dependiendo de otro plugin

```typescript
// ❌ MAL — VLAN importando Routing
import { routingPlugin } from '../routing/routing.plugin.js';

// ✅ BIEN — Cada plugin es independiente
// Si necesitan coordinación, usar un use case
```
