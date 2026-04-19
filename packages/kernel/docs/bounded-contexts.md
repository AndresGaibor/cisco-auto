# Bounded Contexts

El dominio de cisco-auto está dividido en **bounded contexts** según DDD. Cada contexto encapsula sus propias entidades, value objects, aggregates y reglas de negocio.

## Mapa de Contextos

```
┌──────────────────────────────────────────────────────────┐
│                    KERNEL (paquete)                       │
│                                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐  │
│  │ IOS Domain  │  │  Topology   │  │    Lab Domain    │  │
│  │  Context    │  │   Context   │  │    (futuro)      │  │
│  └──────┬──────┘  └──────┬──────┘  └────────┬─────────┘  │
│         │                │                   │            │
│         └────────────────┼───────────────────┘            │
│                          │                               │
│                 ┌────────▼────────┐                       │
│                 │  Shared Kernel  │                       │
│                 │  (base clases)  │                       │
│                 └─────────────────┘                       │
│                                                          │
│  ┌──────────────────────────────────────────────────┐    │
│  │          Application Layer (Use Cases)            │    │
│  │  Depende de ports (interfaces), no impl.          │    │
│  └──────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────┘
```

## 1. IOS Domain Context

**Ubicación**: `packages/kernel/src/domain/ios/`

Modela dispositivos Cisco IOS y su configuración de red.

### Value Objects

| Value Object | Archivo | Descripción |
|-------------|---------|-------------|
| `DeviceId` | `value-objects/device-id.vo.ts` | Identificador único de dispositivo. Valida: no vacío, máx 63 chars, alfanumérico + guiones + puntos |
| `InterfaceName` | `value-objects/interface-name.vo.ts` | Nombre de interfaz Cisco (GigabitEthernet0/0, FastEthernet0/1, VLAN100) |
| `VlanId` | `value-objects/vlan-id.vo.ts` | ID de VLAN válido (1-4094) con tipo (normal, extended) |
| `Ipv4Address` | `value-objects/ipv4-address.vo.ts` | Dirección IPv4 validada con operaciones de subred |
| `SubnetMask` | `value-objects/subnet-mask.vo.ts` | Máscara de subred con conversión CIDR |

**Patrón de Value Object base:**

```typescript
// packages/kernel/src/domain/shared/base/value-object.base.ts
abstract class ValueObject<T> {
  readonly _value: T;

  equals(other: ValueObject<T>): boolean {
    return this._value === other._value;
  }

  toJSON(): unknown { return this._value; }
  toString(): string { return String(this._value); }
}
```

### Entities

| Entity | Archivo | Descripción |
|--------|---------|-------------|
| `DeviceEntity` | `entities/device.entity.ts` | Dispositivo con hostname, tipo, modelo, interfaces y VLANs |
| `InterfaceEntity` | `entities/interface.entity.ts` | Interfaz de red con IP, máscara, estado, modo VLAN |

### Aggregate Root

| Aggregate | Archivo | Invariantes |
|-----------|---------|-------------|
| `DeviceAggregate` | `aggregates/device.aggregate.ts` | - Al menos una interfaz<br>- Nombres de interfaz únicos<br>- Coordina eventos de dominio |

**DeviceAggregate — ejemplo de uso:**

```typescript
// packages/kernel/src/domain/ios/aggregates/device.aggregate.ts
export class DeviceAggregate extends Aggregate<DeviceId> {
  static create(id: DeviceId, deviceType: DeviceType, model: string): DeviceAggregate {
    const aggregate = new DeviceAggregate(id, deviceType, model);
    aggregate.recordEvent(
      createDomainEvent<DeviceAddedEvent>('DeviceAdded', id.value, {
        deviceName: id.value, deviceType, model,
      })
    );
    return aggregate;
  }

  configureInterfaceIp(interfaceName: InterfaceName, ip: Ipv4Address, mask: SubnetMask): void {
    const iface = this._device.getInterface(interfaceName);
    if (!iface) {
      throw DomainError.notFound('Interface', interfaceName.value, { deviceId: this._id.value });
    }
    iface.assignIp(ip, mask);
    this.recordEvent(
      createDomainEvent<InterfaceConfiguredEvent>('InterfaceConfigured', this._id.value, {
        deviceName: this._device.hostname,
        interfaceName: interfaceName.value,
        ipAddress: ip.value, subnetMask: mask.value,
      })
    );
  }

  validate(): void {
    this._device.validate();
    if (this._device.interfaceCount === 0) {
      throw DomainError.invariantViolation(
        `Device "${this._device.hostname}" must have at least one interface`
      );
    }
  }
}
```

### Domain Events

| Evento | Datos | Cuándo se emite |
|--------|-------|-----------------|
| `DeviceAddedEvent` | deviceName, deviceType, model | Al crear un dispositivo |
| `DeviceRenamedEvent` | oldName, newName | Al renombrar dispositivo |
| `InterfaceAddedEvent` | deviceName, interfaceName | Al agregar interfaz |
| `InterfaceConfiguredEvent` | deviceName, interfaceName, ipAddress, subnetMask | Al asignar IP |
| `InterfaceEnabledEvent` | deviceName, interfaceName | Al hacer `no shutdown` |
| `InterfaceDisabledEvent` | deviceName, interfaceName | Al hacer `shutdown` |
| `VlanConfiguredEvent` | deviceName, interfaceName, vlanId | Al configurar VLAN |
| `InterfaceRemovedEvent` | deviceName, interfaceName | Al remover interfaz |

```typescript
// packages/kernel/src/domain/shared/events/domain-event.interface.ts
interface DomainEvent {
  readonly type: string;
  readonly occurredOn: string;  // ISO timestamp
  readonly aggregateId: string;
}
```

## 2. Topology Domain Context

**Ubicación**: `packages/kernel/src/domain/topology/`

Modela la topología de red: dispositivos conectados por enlaces.

### Entities

| Entity | Archivo | Descripción |
|--------|---------|-------------|
| `LinkEntity` | `entities/link.entity.ts` | Enlace punto a punto entre dos dispositivos con puertos y tipo de cable |

### Aggregate Root

| Aggregate | Archivo | Descripción |
|-----------|---------|-------------|
| `TopologyGraphAggregate` | `aggregates/topology-graph.aggregate.ts` | Grafo de topología con nodos (dispositivos) y aristas (enlaces) |

## 3. Lab Domain Context

**Ubicación**: `packages/kernel/src/domain/lab/`

Contexto para definición y validación de laboratorios completos. Actualmente en fase inicial.

**Responsabilidades futuras:**
- Validación de labs completos (dispositivos + enlaces + configuración)
- Generación de planes de despliegue
- Verificación de prerequisitos

## 4. Shared Kernel

**Ubicación**: `packages/kernel/src/domain/shared/`

Contiene las clases base y tipos compartidos entre todos los bounded contexts:

### Clases Base

| Clase | Archivo | Propósito |
|-------|---------|-----------|
| `ValueObject<T>` | `base/value-object.base.ts` | Base para todos los Value Objects |
| `Entity<TId>` | `base/entity.base.ts` | Base para todas las Entities con identidad |
| `Aggregate<TId>` | `base/aggregate.base.ts` | Base para Aggregate Roots con event collection |

```typescript
// packages/kernel/src/domain/shared/base/aggregate.base.ts
abstract class Aggregate<TId extends ValueObject<unknown>> extends Entity<TId> {
  private readonly _events: DomainEvent[] = [];

  recordEvent(event: DomainEvent): void {
    this._events.push(event);
  }

  clearEvents(): void {
    this._events.splice(0);
  }

  get events(): ReadonlyArray<DomainEvent> {
    return this._events;
  }

  abstract validate(): void;
}
```

### Errors

| Clase | Archivo | Uso |
|-------|---------|-----|
| `DomainError` | `errors/domain.error.ts` | Errores de dominio con código y contexto |

```typescript
// Factories de DomainError
DomainError.invalidValue('VlanId', 0, 'must be between 1 and 4094');
DomainError.notFound('Interface', 'Gig0/0', { deviceId: 'R1' });
DomainError.invariantViolation('Device must have at least one interface');
DomainError.notAllowed('delete', 'device is referenced by topology');
DomainError.conflict('Device name already exists');
```

### Types

Tipos compartidos como `Result<T>`, `DeviceType` enum, etc.

## Cómo se Comunican los Bounded Contexts

### 1. A través de Repositories

Los repositories son interfaces en el dominio que definen cómo persistir aggregates:

```typescript
// packages/kernel/src/domain/ios/repositories/index.ts
export interface DeviceRepository {
  findById(id: string): Promise<DeviceAggregate | null>;
  save(device: DeviceAggregate): Promise<void>;
  delete(id: string): Promise<boolean>;
  findAll(): Promise<DeviceAggregate[]>;
  findByType(type: DeviceType): Promise<DeviceAggregate[]>;
}

export interface TopologyRepository {
  save(topology: TopologyGraphAggregate): Promise<void>;
  findById(id: string): Promise<TopologyGraphAggregate | null>;
  findAll(): Promise<TopologyGraphAggregate[]>;
}
```

Los use cases dependen de estas interfaces, no de implementaciones concretas:

```typescript
// Un use case depende del puerto, no de la implementación
export class ApplyVlanUseCase implements UseCase<ApplyVlanInput, UseCaseResult<ApplyVlanOutput>> {
  constructor(
    private readonly repository: PersistencePort<DeviceEntity>,  // ← Interfaz
    private readonly backend: BackendPluginWithDeviceMethods,     // ← Interfaz
    private readonly registry: PluginRegistry,                    // ← Interfaz
  ) {}
  // ...
}
```

### 2. A través de Domain Events

Los aggregates emiten eventos que otros contextos pueden escuchar:

```
DeviceAggregate → "DeviceAdded" → Event Bus → TopologyContext reacciona
DeviceAggregate → "InterfaceConfigured" → Event Bus → LabContext valida
```

### 3. A través de Use Cases

La capa de aplicación orquesta la comunicación entre contextos:

```
ApplyVlanUseCase:
  1. Consulta DeviceRepository (IOS Context)
  2. Valida con vlanPlugin (Plugin System)
  3. Ejecuta en BackendPlugin (Backend Adapter)
  4. Retorna resultado
```

## Resumen de Dependencias

```
Application Layer (Use Cases)
    │
    ├──→ IOS Domain (DeviceAggregate, VlanId, InterfaceName...)
    ├──→ Topology Domain (TopologyGraphAggregate, LinkEntity...)
    ├──→ Shared Kernel (ValueObject, Entity, Aggregate, DomainError)
    └──→ Plugin API (ProtocolPlugin, BackendPlugin, PluginRegistry)
              │
              ├──→ Plugins (vlan, routing, security, services...)
              └──→ Backends (packet-tracer)
```

Ningún dominio depende de otro dominio directamente. La comunicación es a través de:
- Interfaces (ports)
- Domain Events
- Use Cases (capa de aplicación)
