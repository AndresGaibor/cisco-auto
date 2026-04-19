# Sistema de Plugins

El sistema de plugins es el mecanismo central de extensión en cisco-auto. Toda funcionalidad de protocolo y todo backend se implementa como un plugin registrable.

## Tipos de Plugin

### 1. ProtocolPlugin

Plugins que generan y validan configuraciones IOS para protocolos de red específicos.

```typescript
// packages/kernel/src/plugin-api/protocol.plugin.ts
export interface ProtocolPlugin {
  id: string;
  category: 'switching' | 'routing' | 'security' | 'services';
  name: string;
  version: string;
  description: string;
  commands: PluginCommandDefinition[];
  validate(config: unknown): PluginValidationResult;
}
```

**Categorías disponibles:**
- `switching` — VLANs, STP, EtherChannel, Port Security
- `routing` — OSPF, EIGRP, BGP, Static Routes
- `security` — ACLs, NAT, VPN IPsec
- `services` — DHCP, DNS, NTP, Syslog, SNMP

### 2. BackendPlugin

Plugins que implementan la comunicación con un sistema externo (Packet Tracer, GNS3, etc.).

```typescript
// packages/kernel/src/plugin-api/backend.plugin.ts
export interface BackendPlugin extends BackendPort {
  category: 'backend';
  name: string;
  version: string;
  validate(config: unknown): PluginValidationResult;
}

// packages/kernel/src/application/ports/driven/backend.port.ts
export interface BackendPort {
  connect(config: unknown): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
}
```

### 3. DevicePlugin

Plugins que definen capacidades de dispositivos específicos.

```typescript
export interface DevicePlugin {
  category: 'device';
  name: string;
  version: string;
  supportedModels: string[];
  validate(device: unknown): PluginValidationResult;
}
```

## PluginRegistry

El registro central de plugins. Almacena y recupera plugins por tipo e identificador.

```typescript
// packages/kernel/src/plugin-api/registry.ts
export interface PluginRegistry {
  register<K extends PluginKind>(kind: K, plugin: PluginMap[K]): void;
  get<K extends PluginKind>(kind: K, id: string): PluginMap[K] | undefined;
  list<K extends PluginKind>(kind: K): readonly PluginMap[K][];
}

export class DefaultPluginRegistry implements PluginRegistry {
  private readonly plugins: { [K in PluginKind]: Map<string, PluginMap[K]> } = {
    protocol: new Map<string, ProtocolPlugin>(),
    device: new Map<string, DevicePlugin>(),
    backend: new Map<string, BackendPlugin>(),
  };

  register<K extends PluginKind>(kind: K, plugin: PluginMap[K]): void {
    const key = 'id' in plugin ? plugin.id : plugin.name;
    this.plugins[kind].set(key, plugin);
  }

  get<K extends PluginKind>(kind: K, id: string): PluginMap[K] | undefined {
    return this.plugins[kind].get(id);
  }

  list<K extends PluginKind>(kind: K): readonly PluginMap[K][] {
    return [...this.plugins[kind].values()];
  }
}
```

**Uso del registro:**

```typescript
import { DefaultPluginRegistry } from '@cisco-auto/kernel';

const registry = new DefaultPluginRegistry();

// Registrar plugins
registry.register('protocol', vlanPlugin);
registry.register('protocol', routingPlugin);
registry.register('backend', packetTracerBackendPlugin);

// Obtener un plugin
const vlan = registry.get('protocol', 'vlan');
const backend = registry.get('backend', 'packet-tracer');

// Listar todos los plugins de un tipo
const allProtocols = registry.list('protocol');
```

## Plugins de Protocolo Existentes

### VLAN Plugin (`packages/kernel/src/plugins/vlan/`)

```typescript
// packages/kernel/src/plugins/vlan/vlan.plugin.ts
export const vlanPlugin: ProtocolPlugin = {
  id: 'vlan',
  category: 'switching',
  name: 'VLAN',
  version: '1.0.0',
  description: 'Generates and validates IOS VLAN configuration.',
  commands: [
    {
      name: 'configure-vlan',
      description: 'Generate IOS commands for VLANs, trunks and access ports',
      inputSchema: vlanSchema,
      examples: [
        {
          input: {
            switchName: 'SW1',
            vlans: [{ id: 10, name: 'USERS' }],
            trunkPorts: ['GigabitEthernet0/1'],
            accessPorts: [{ port: 'FastEthernet0/1', vlan: 10 }],
          },
          description: 'Create a VLAN with trunk and access ports',
        },
      ],
    },
  ],
  validate: validateVlanConfig,
};
```

### Routing Plugin (`packages/kernel/src/plugins/routing/`)

Soporta OSPF, EIGRP, BGP y rutas estáticas:

```typescript
export const routingPlugin: ProtocolPlugin = {
  id: 'routing',
  category: 'routing',
  name: 'Routing',
  version: '1.0.0',
  description: 'Generates and validates IOS routing configuration for OSPF, EIGRP, BGP, and Static routes.',
  commands: [{ name: 'configure-routing', /* ... */ }],
  validate: validateRoutingConfig,
};
```

### Security Plugin (`packages/kernel/src/plugins/security/`)

ACLs, NAT, VPN IPsec.

### Services Plugin (`packages/kernel/src/plugins/services/`)

DHCP, DNS, NTP, Syslog, SNMP.

### Switching Plugin (`packages/kernel/src/plugins/switching/`)

STP, EtherChannel, Port Security.

### IPv6 Plugin (`packages/kernel/src/plugins/ipv6/`)

Addressing, OSPFv3, EIGRP for IPv6, dual-stack.

### Port Template Plugin (`packages/kernel/src/plugins/port-template/`)

Plantillas de configuración de puertos.

## Backend Plugin: Packet Tracer

```typescript
// packages/kernel/src/backends/packet-tracer/packet-tracer.plugin.ts
export function createPacketTracerBackendPlugin(
  adapter: PacketTracerBackendAdapter = createPacketTracerAdapter(),
): PacketTracerBackendPlugin {
  return {
    id: 'packet-tracer',
    category: 'backend',
    name: 'Cisco Packet Tracer',
    version: '1.0.0',
    description: 'Packet Tracer backend plugin for the kernel.',
    validate: validateConfig,
    connect: (config) => adapter.connect(config),
    disconnect: () => adapter.disconnect(),
    isConnected: () => adapter.isConnected(),
    addDevice: (name, model, options) => adapter.addDevice(name, model, options),
    removeDevice: (name) => adapter.removeDevice(name),
    configureDevice: (name, commands) => adapter.configureDevice(name, commands),
    execShow: (name, command) => adapter.execShow(name, command),
    addLink: (d1, p1, d2, p2) => adapter.addLink(d1, p1, d2, p2),
    removeLink: (device, port) => adapter.removeLink(device, port),
    getTopology: () => adapter.getTopology(),
  };
}
```

## Cómo Crear un Nuevo Plugin (Paso a Paso)

### Paso 1: Crear la estructura de archivos

```
packages/kernel/src/plugins/<nombre>/
├── index.ts              # Export público
├── <nombre>.plugin.ts    # Definición del plugin
├── <nombre>.schema.ts    # Schema Zod de validación
├── <nombre>.generator.ts # Generador de comandos IOS
└── <nombre>.plugin.test.ts  # Tests
```

### Paso 2: Definir el schema Zod

```typescript
// packages/kernel/src/plugins/<nombre>/<nombre>.schema.ts
import { z } from 'zod';

export const miPluginSchema = z.object({
  deviceName: z.string().min(1),
  // ... campos específicos del protocolo
});

export type MiPluginConfigInput = z.infer<typeof miPluginSchema>;
```

### Paso 3: Implementar la validación

```typescript
// packages/kernel/src/plugins/<nombre>/<nombre>.plugin.ts
import type { ProtocolPlugin } from '../../plugin-api/protocol.plugin.js';
import type { PluginValidationResult } from '../../plugin-api/plugin.types.js';
import { miPluginSchema } from './<nombre>.schema.js';

function validateConfig(spec: unknown): PluginValidationResult {
  const parsed = miPluginSchema.safeParse(spec);
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
        code: issue.code,
      })),
    };
  }
  // Validaciones de dominio adicionales...
  return { ok: true, errors: [] };
}
```

### Paso 4: Definir el plugin

```typescript
export const miPlugin: ProtocolPlugin = {
  id: 'mi-protocolo',
  category: 'switching', // o 'routing', 'security', 'services'
  name: 'Mi Protocolo',
  version: '1.0.0',
  description: 'Generates and validates IOS Mi Protocolo configuration.',
  commands: [
    {
      name: 'configure-mi-protocolo',
      description: 'Generate IOS commands for Mi Protocolo',
      inputSchema: miPluginSchema,
      examples: [
        {
          input: { deviceName: 'R1', /* ... */ },
          description: 'Configure Mi Protocolo en R1',
        },
      ],
    },
  ],
  validate: validateConfig,
};
```

### Paso 5: Exportar desde el index

```typescript
// packages/kernel/src/plugins/<nombre>/index.ts
export { miPlugin } from './<nombre>.plugin.js';
export { generateMiProtocoloCommands } from './<nombre>.generator.js';
```

### Paso 6: Registrar en el index de plugins

```typescript
// packages/kernel/src/plugins/index.ts
export * from './vlan/index.js';
export * from './routing/index.js';
// ...
export * from './<nombre>/index.js';  // ← Agregar aquí
```

### Paso 7: Registrar en el PluginRegistry

```typescript
import { DefaultPluginRegistry } from '@cisco-auto/kernel';
import { miPlugin } from '@cisco-auto/kernel/plugins';

const registry = new DefaultPluginRegistry();
registry.register('protocol', miPlugin);
```

## Ciclo de Vida del Plugin

El sistema de plugins actualmente opera sin callbacks de `onLoad`/`onUnload` explícitos. El ciclo de vida es:

1. **Creación**: El plugin se instancia como un objeto literal o factory function
2. **Registro**: Se registra en `PluginRegistry` con `registry.register(kind, plugin)`
3. **Uso**: Los use cases obtienen el plugin con `registry.get(kind, id)` y llaman a `validate(config)` o iteran `commands`
4. **Desregistro**: Implícito — el plugin se elimina cuando el `PluginRegistry` es destruido o se reemplaza

### Extensión futura: onLoad/onUnload

Si se necesita un ciclo de vida explícito:

```typescript
export interface ProtocolPlugin {
  // ... campos existentes
  onLoad?(registry: PluginRegistry): Promise<void>;
  onUnload?(): Promise<void>;
}
```

Los use cases pueden llamar a `onLoad` después del registro y `onUnload` antes de limpiar el registry.

## Validación de Configuraciones

Cada plugin implementa `validate(config): PluginValidationResult`:

```typescript
export interface PluginValidationResult {
  ok: boolean;
  errors: Array<{ path: string; message: string; code: string }>;
  warnings?: string[];
}
```

El flujo de validación es:
1. Parseo con Zod (schema validation)
2. Validaciones de dominio adicionales (referencias cruzadas, duplicados, etc.)
3. Retorno del resultado estructurado

Los use cases usan esta validación antes de generar comandos:

```typescript
// Desde ApplyVlanUseCase
const validation = vlanPlugin.validate(vlanSpec);
if (!validation.ok) {
  return { success: false, errors: validation.errors.map(e => `${e.path}: ${e.message}`) };
}
```
