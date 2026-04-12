# Estrategia de Testing

## Pirámide de Tests

```
                    ┌───────────┐
                   │  E2E /    │  ← Pocos (flujos completos)
                  │ Integración│
                 ├─────────────┤
                │   Use Cases  │  ← Moderados (orquestación con mocks)
               │   Plugins    │
              ├───────────────┤
             │    Dominio     │  ← Muchos (puros, rápidos, sin mocks)
            │  Value Objects │
           │    Entities      │
          │    Aggregates     │
         ├───────────────────┤
        │  (No escribir:     │
        │   tests de libs)   │
         └───────────────────┘
```

### Principios

| Nivel | Qué testear | Velocidad | Frecuencia |
|-------|------------|-----------|------------|
| **Unit (Dominio)** | Value Objects, Entities, Aggregates, errores | Microsegundos | Cada cambio |
| **Unit (Application)** | Use cases con repositorios/backends mockeados | Milisegundos | Cada cambio |
| **Unit (Plugins)** | Validación, generación de comandos | Milisegundos | Cada cambio |
| **Integration** | Use case + repositorio real + backend mock | Décimas de segundo | En PR |
| **E2E** | CLI completa con FileBridge + Packet Tracer | Segundos | En release |

## Ejecutar Tests

```bash
# Todos los tests
bun test

# Tests de un archivo específico
bun test packages/kernel/tests/domain/ios/value-objects/vlan-id.vo.test.ts

# Tests con patrón
bun test "vlan"

# Tests con output detallado
bun test --verbose

# Tests con coverage (si configurado)
bun test --coverage
```

## Organización de Tests

Los tests se ubican en `packages/kernel/tests/`, replicando la estructura de `src/`:

```
packages/kernel/
├── src/
│   ├── domain/
│   │   ├── ios/
│   │   ├── topology/
│   │   └── shared/
│   ├── application/
│   │   ├── ports/
│   │   └── use-cases/
│   ├── plugin-api/
│   └── plugins/
│
└── tests/                              ← Tests aquí
    ├── domain/
    │   ├── ios/
    │   │   └── value-objects/
    │   │       ├── device-id.vo.test.ts
    │   │       ├── ipv4-address.vo.test.ts
    │   │       └── vlan-id.vo.test.ts
    │   ├── shared/
    │   │   ├── base/
    │   │   │   └── entity-aggregate.test.ts
    │   │   └── errors/
    │   │       └── domain.error.test.ts
    │   └── topology/
    │       └── aggregates/
    │           └── topology-graph.aggregate.test.ts
    ├── application/
    │   ├── base/
    │   │   └── use-case.test.ts
    │   ├── ports/
    │   │   └── interfaces.test.ts
    │   └── use-cases/
    │       ├── device/
    │       │   ├── add-device.use-case.test.ts
    │       │   └── remove-device.use-case.test.ts
    │       ├── topology/
    │       │   └── create-topology.use-case.test.ts
    │       └── vlan/
    │           └── apply-vlan.use-case.test.ts
    └── plugin-api/
        ├── interfaces.test.ts
        ├── plugin-types.test.ts
        └── registry.test.ts
```

## Cómo Testear el Dominio (Sin Infraestructura)

El dominio es **puro** — no tiene dependencias externas. Los tests son directos:

### Value Objects

```typescript
// packages/kernel/tests/domain/ios/value-objects/vlan-id.vo.test.ts
import { describe, expect, test } from 'bun:test';
import { VlanId } from '../../../../src/domain/ios/value-objects/vlan-id.vo.js';

describe('VlanId', () => {
  test('crea un VlanId válido', () => {
    const vlan = VlanId.from(10);
    expect(vlan.toNumber()).toBe(10);
  });

  test('rechaza VLAN fuera de rango', () => {
    expect(() => VlanId.from(0)).toThrow();
    expect(() => VlanId.from(4095)).toThrow();
  });

  test('crea desde string', () => {
    const vlan = VlanId.fromString('20');
    expect(vlan.toNumber()).toBe(20);
  });

  test('isValid devuelve true para valores válidos', () => {
    expect(VlanId.isValid(1)).toBe(true);
    expect(VlanId.isValid(4094)).toBe(true);
    expect(VlanId.isValid(0)).toBe(false);
    expect(VlanId.isValid(4095)).toBe(false);
  });

  test('comparación de VLANs', () => {
    const v1 = VlanId.from(10);
    const v2 = VlanId.from(20);
    expect(v1.compareTo(v2)).toBeLessThan(0);
    expect(v1.compareTo(v1)).toBe(0);
  });
});
```

### Aggregates

```typescript
// packages/kernel/tests/domain/ios/aggregates/device.aggregate.test.ts
import { describe, expect, test } from 'bun:test';
import { DeviceAggregate } from '../../../../src/domain/ios/aggregates/device.aggregate.js';
import { DeviceId, DeviceType } from '../../../../src/domain/ios/value-objects/device-id.vo.js';
import { InterfaceName } from '../../../../src/domain/ios/value-objects/interface-name.vo.js';
import { Ipv4Address, SubnetMask } from '../../../../src/domain/ios/value-objects/ipv4-address.vo.js';

describe('DeviceAggregate', () => {
  test('crea dispositivo con evento DeviceAdded', () => {
    const id = DeviceId.from('R1');
    const device = DeviceAggregate.create(id, DeviceType.ROUTER, '2911');

    expect(device.events).toHaveLength(1);
    expect(device.events[0].type).toBe('DeviceAdded');
  });

  test('agrega interfaz y emite evento', () => {
    const id = DeviceId.from('R1');
    const device = DeviceAggregate.create(id, DeviceType.ROUTER, '2911');
    device.addInterface(InterfaceName.fromJSON('GigabitEthernet0/0'));

    expect(device.interfaceCount).toBe(1);
    expect(device.events.some(e => e.type === 'InterfaceAdded')).toBe(true);
  });

  test('no puede remover última interfaz', () => {
    const id = DeviceId.from('R1');
    const device = DeviceAggregate.create(id, DeviceType.ROUTER, '2911');
    device.addInterface(InterfaceName.fromJSON('Gig0/0'));

    expect(() => device.removeInterface(InterfaceName.fromJSON('Gig0/0'))).toThrow();
  });

  test('configura IP en interfaz', () => {
    const id = DeviceId.from('R1');
    const device = DeviceAggregate.create(id, DeviceType.ROUTER, '2911');
    const iface = InterfaceName.fromJSON('GigabitEthernet0/0');
    device.addInterface(iface);

    device.configureInterfaceIp(
      iface,
      Ipv4Address.fromJSON('192.168.1.1'),
      SubnetMask.fromJSON('255.255.255.0')
    );

    expect(device.events.some(e => e.type === 'InterfaceConfigured')).toBe(true);
  });

  test('valida que tiene al menos una interfaz', () => {
    const id = DeviceId.from('R1');
    const device = DeviceAggregate.create(id, DeviceType.ROUTER, '2911');

    expect(() => device.validate()).toThrow();  // Sin interfaces
  });
});
```

## Cómo Testear Use Cases (Con Mocks)

Los use cases dependen de interfaces (ports). Se mockean todas las dependencias:

```typescript
// packages/kernel/tests/application/use-cases/vlan/apply-vlan.use-case.test.ts
import { describe, expect, test, mock } from 'bun:test';
import { ApplyVlanUseCase } from '../../../../src/application/use-cases/vlan/apply-vlan.use-case.js';
import type { PersistencePort } from '../../../../src/application/ports/driven/persistence.port.js';
import type { BackendPlugin } from '../../../../src/plugin-api/backend.plugin.js';
import type { ProtocolPlugin } from '../../../../src/plugin-api/protocol.plugin.js';
import type { PluginRegistry } from '../../../../src/plugin-api/registry.js';
import type { DeviceEntity } from '../../../../src/application/use-cases/types.js';

// ===== Factory Functions para Mocks =====

function createMockRepository(): PersistencePort<DeviceEntity> {
  const store = new Map<string, DeviceEntity>();
  return {
    findById: mock(async (id: string) => store.get(id) ?? null),
    save: mock(async (entity: DeviceEntity) => { store.set(entity.id, entity); }),
    delete: mock(async (id: string) => { store.delete(id); }),
  };
}

function createMockVlanPlugin(): ProtocolPlugin {
  return {
    id: 'vlan',
    category: 'switching',
    name: 'VLAN',
    version: '1.0.0',
    description: 'VLAN plugin',
    commands: [],
    validate: mock(() => ({ ok: true, errors: [] })),
  };
}

function createMockBackendPlugin(shouldFail = false): BackendPlugin & {
  configureDevice: ReturnType<typeof mock>;
} {
  return {
    id: 'packet-tracer',
    category: 'backend',
    name: 'Mock PT',
    version: '1.0.0',
    validate: mock(() => ({ ok: true, errors: [] })),
    connect: mock(async () => {}),
    disconnect: mock(async () => {}),
    isConnected: mock(() => true),
    configureDevice: mock(async () => {
      if (shouldFail) throw new Error('Backend configureDevice failed');
      return { results: [] };
    }),
  };
}

function createMockRegistry(vlanPlugin?: ProtocolPlugin | null): PluginRegistry {
  const plugins = new Map<string, ProtocolPlugin>();
  if (vlanPlugin) {
    plugins.set('vlan', vlanPlugin);
  }
  return {
    register: mock(() => {}),
    get: mock((kind: string, id: string) => {
      if (kind === 'protocol') return plugins.get(id);
      return undefined;
    }),
    list: mock((kind: string) => {
      if (kind === 'protocol') return [...plugins.values()];
      return [];
    }),
  };
}

// ===== Tests =====

describe('ApplyVlanUseCase', () => {
  test('aplica VLANs a switch existente', async () => {
    const repository = createMockRepository();
    const backend = createMockBackendPlugin();
    const vlanPlugin = createMockVlanPlugin();
    const registry = createMockRegistry(vlanPlugin);
    const useCase = new ApplyVlanUseCase(repository, backend, registry);

    await repository.save({ id: 'SW1', name: 'SW1', model: '2960', type: 'switch' });

    const result = await useCase.execute({
      switchName: 'SW1',
      vlanIds: [10, 20, 30],
      vlanNames: { 10: 'ADMIN', 20: 'USERS', 30: 'GUEST' },
    });

    expect(result.success).toBe(true);
    expect(result.data?.vlans).toHaveLength(3);
    expect(result.errors).toHaveLength(0);
  });

  test('falla cuando switch no existe', async () => {
    const repository = createMockRepository();
    const backend = createMockBackendPlugin();
    const vlanPlugin = createMockVlanPlugin();
    const registry = createMockRegistry(vlanPlugin);
    const useCase = new ApplyVlanUseCase(repository, backend, registry);

    const result = await useCase.execute({
      switchName: 'SW99',
      vlanIds: [10],
    });

    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('falla cuando plugin VLAN no está registrado', async () => {
    const repository = createMockRepository();
    const backend = createMockBackendPlugin();
    const registry = createMockRegistry(null);
    const useCase = new ApplyVlanUseCase(repository, backend, registry);

    await repository.save({ id: 'SW1', name: 'SW1', model: '2960', type: 'switch' });

    const result = await useCase.execute({
      switchName: 'SW1',
      vlanIds: [10],
    });

    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('falla cuando lista de VLANs está vacía', async () => {
    const repository = createMockRepository();
    const backend = createMockBackendPlugin();
    const vlanPlugin = createMockVlanPlugin();
    const registry = createMockRegistry(vlanPlugin);
    const useCase = new ApplyVlanUseCase(repository, backend, registry);

    await repository.save({ id: 'SW1', name: 'SW1', model: '2960', type: 'switch' });

    const result = await useCase.execute({
      switchName: 'SW1',
      vlanIds: [],
    });

    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('falla cuando backend falla', async () => {
    const repository = createMockRepository();
    const backend = createMockBackendPlugin(true);  // shouldFail = true
    const vlanPlugin = createMockVlanPlugin();
    const registry = createMockRegistry(vlanPlugin);
    const useCase = new ApplyVlanUseCase(repository, backend, registry);

    await repository.save({ id: 'SW1', name: 'SW1', model: '2960', type: 'switch' });

    const result = await useCase.execute({
      switchName: 'SW1',
      vlanIds: [10],
    });

    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
```

## Cómo Testear Plugins

Los plugins son objetos puros con lógica de validación. Tests simples:

```typescript
// packages/kernel/src/plugins/vlan/vlan.plugin.test.ts
import { describe, expect, test } from 'bun:test';
import { vlanPlugin, validateVlanConfig } from './vlan.plugin.js';

describe('vlanPlugin', () => {
  test('tiene metadata correcta', () => {
    expect(vlanPlugin.id).toBe('vlan');
    expect(vlanPlugin.category).toBe('switching');
    expect(vlanPlugin.version).toBe('1.0.0');
  });

  test('tiene al menos un comando', () => {
    expect(vlanPlugin.commands).toHaveLength(1);
    expect(vlanPlugin.commands[0].name).toBe('configure-vlan');
  });
});

describe('validateVlanConfig', () => {
  test('acepta configuración válida', () => {
    const result = validateVlanConfig({
      switchName: 'SW1',
      vlans: [{ id: 10, name: 'USERS' }],
    });
    expect(result.ok).toBe(true);
  });

  test('rechaza configuración sin VLANs', () => {
    const result = validateVlanConfig({
      switchName: 'SW1',
      vlans: [],
    });
    expect(result.ok).toBe(false);
  });

  test('rechaza IDs duplicados', () => {
    const result = validateVlanConfig({
      switchName: 'SW1',
      vlans: [{ id: 10 }, { id: 10 }],
    });
    expect(result.ok).toBe(false);
    expect(result.errors.some(e => e.code === 'duplicate_vlan_id')).toBe(true);
  });

  test('rechaza access port con VLAN no definida', () => {
    const result = validateVlanConfig({
      switchName: 'SW1',
      vlans: [{ id: 10 }],
      accessPorts: [{ port: 'Fa0/1', vlan: 20 }],
    });
    expect(result.ok).toBe(false);
  });
});
```

## Cómo Testear PluginRegistry

```typescript
// packages/kernel/tests/plugin-api/registry.test.ts
import { describe, expect, test } from 'bun:test';
import { DefaultPluginRegistry } from '../../../src/plugin-api/registry.js';
import type { ProtocolPlugin } from '../../../src/plugin-api/protocol.plugin.js';

describe('DefaultPluginRegistry', () => {
  test('registra y obtiene un plugin', () => {
    const registry = new DefaultPluginRegistry();
    const plugin: ProtocolPlugin = {
      id: 'test',
      category: 'switching',
      name: 'Test',
      version: '1.0.0',
      description: 'Test',
      commands: [],
      validate: () => ({ ok: true, errors: [] }),
    };

    registry.register('protocol', plugin);
    const found = registry.get('protocol', 'test');

    expect(found).toBe(plugin);
  });

  test('retorna undefined para plugin no registrado', () => {
    const registry = new DefaultPluginRegistry();
    expect(registry.get('protocol', 'nonexistent')).toBeUndefined();
  });

  test('lista todos los plugins de un tipo', () => {
    const registry = new DefaultPluginRegistry();
    registry.register('protocol', {
      id: 'vlan', category: 'switching', name: 'VLAN',
      version: '1.0.0', description: '', commands: [],
      validate: () => ({ ok: true, errors: [] }),
    });
    registry.register('protocol', {
      id: 'routing', category: 'routing', name: 'Routing',
      version: '1.0.0', description: '', commands: [],
      validate: () => ({ ok: true, errors: [] }),
    });

    const protocols = registry.list('protocol');
    expect(protocols).toHaveLength(2);
  });
});
```

## Patrones de Testing

### Factory Functions para Mocks

Siempre usar factory functions, no compartir mocks entre tests:

```typescript
// ✅ BIEN — Cada test tiene su propia instancia
function createMockRepository() { /* ... */ }

// ❌ MAL — Estado compartido entre tests
const mockRepo = { findById: mock(async () => null) };
```

### Arrange-Act-Assert

```typescript
test('aplica VLANs a switch existente', async () => {
  // Arrange
  const repository = createMockRepository();
  const backend = createMockBackendPlugin();
  const registry = createMockRegistry(createMockVlanPlugin());
  const useCase = new ApplyVlanUseCase(repository, backend, registry);
  await repository.save({ id: 'SW1', name: 'SW1', model: '2960', type: 'switch' });

  // Act
  const result = await useCase.execute({
    switchName: 'SW1',
    vlanIds: [10, 20],
  });

  // Assert
  expect(result.success).toBe(true);
  expect(result.data?.vlans).toHaveLength(2);
});
```

### Tests de Errores

Testear todos los caminos de error:

```typescript
describe('ApplyVlanUseCase — errores', () => {
  test('switch no existe', async () => { /* ... */ });
  test('plugin no registrado', async () => { /* ... */ });
  test('lista de VLANs vacía', async () => { /* ... */ });
  test('backend falla', async () => { /* ... */ });
  test('validación de plugin falla', async () => { /* ... */ });
});
```

## Qué NO Testear

- **Validación de Zod**: Zod ya tiene sus tests. Solo testear las validaciones de dominio adicionales.
- **Clases base abstractas**: Se testean indirectamente a través de subclasses concretas.
- **Implementaciones de infraestructura externa**: Mockear en tests unitarios, testear en integración.
- **Generación de código**: Testear el output de los generadores como strings, no la implementación interna.

## Checklist para Nuevos Tests

- [ ] Testear caminos felices
- [ ] Testear todos los caminos de error
- [ ] Testear edge cases (valores límite, colecciones vacías)
- [ ] Cada test es independiente (sin estado compartido)
- [ ] Los tests no dependen de infraestructura externa
- [ ] Los nombres de tests describen el comportamiento esperado
- [ ] Factory functions para mocks
