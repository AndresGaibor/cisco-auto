# Guía de Migración: Arquitectura Legacy a Plugin-First

## Overview

### ¿Qué cambió y por qué?

El proyecto fue refactorizado desde una arquitectura monolítica de generadores de configuración hacia una **Plugin-First Architecture**. Los cambios clave:

| Aspecto | Antes | Ahora |
|---------|-------|-------|
| Generadores | Clases estáticas en `packages/core/src/config-generators/` | Plugins registrados en `packages/kernel/src/plugins/` |
| Backend | Llamadas directas a `PTController` | Backend plugin via `kernel-bridge` |
| Validación | Implícita en cada generador | Schema Zod + `validate()` explícito |
| Registro | Imports directos | `PluginRegistry` singleton |
| Extensibilidad | Modificar código core | Registrar nuevo plugin |

### Estrategia de migración

La migración es **incremental**, no big-bang:

1. **Fase 1**: Kernel bridge y registry funcionando (✅ completado)
2. **Fase 2**: Plugins de protocolo migrados (✅ completado)
3. **Fase 3**: Backend plugin de Packet Tracer (✅ completado)
4. **Fase 4**: Comandos CLI migrados (en progreso)
5. **Fase 5**: Deprecar `config-generators` (pendiente)

### Paquetes involucrados

| Paquete | Rol | Estado |
|---------|-----|--------|
| `@cisco-auto/kernel` | Core del sistema de plugins | ✅ Activo |
| `@cisco-auto/core` | Generadores legacy | ⚠️ En deprecación |
| `@cisco-auto/ios-domain` | Value Objects y operaciones | ✅ Activo |
| `pt-cli` | CLI de Packet Tracer | 🔄 Migrando |

---

## Antes y Después

### Estructura Antigua

```
packages/core/src/config-generators/
├── vlan-generator.ts        # VlanGenerator (clase estática)
├── routing-generator.ts     # RoutingGenerator
├── security-generator.ts    # SecurityGenerator
├── services.generator.ts    # ServicesGenerator
├── stp.generator.ts         # STPGenerator
├── ipv6.generator.ts        # IPv6Generator
├── port-template.generator.ts
├── dhcp-generator.ts
├── base-generator.ts
└── ios-commands.ts          # Trunk, SSH, etc.
```

**Problemas:**
- Generadores monolíticos con lógica acoplada
- Sin validación explícita de inputs
- Sin registro centralizado de capacidades
- Duplicación de lógica entre generadores

### Estructura Nueva

```
packages/kernel/src/
├── plugin-api/
│   ├── plugin.types.ts      # Tipos base (PluginValidationResult, etc.)
│   ├── protocol.plugin.ts   # Interface ProtocolPlugin
│   ├── backend.plugin.ts    # Interface BackendPlugin
│   ├── device.plugin.ts     # Interface DevicePlugin
│   └── registry.ts          # PluginRegistry + DefaultPluginRegistry
├── plugins/
│   ├── vlan/                # vlanPlugin
│   ├── routing/             # routingPlugin
│   ├── security/            # securityPlugin
│   ├── services/            # servicesPlugin
│   ├── switching/           # switchingPlugin (STP, EtherChannel)
│   ├── ipv6/                # ipv6Plugin
│   └── port-template/       # portTemplatePlugin
└── backends/
    └── packet-tracer/       # packetTracerBackendPlugin
```

**Ventajas:**
- Cada plugin es autónomo con su schema, generador y validación
- Registry centralizado via `kernel-bridge`
- Validación Zod explícita antes de generar comandos
- Backend intercambiable (actualmente Packet Tracer)

---

## Pasos de Migración

### 1. Migrar de config-generators a plugins

#### VLANs

**Antes** (`packages/core/src/config-generators/vlan-generator.ts`):

```typescript
import { VlanGenerator } from '@cisco-auto/core/config-generators';
import type { VLANSpec, VTPSpec } from '@cisco-auto/core/canonical';

const vlans: VLANSpec[] = [
  { id: { value: 10, toString: () => '10' }, name: { value: 'ADMIN', toString: () => 'ADMIN' } },
  { id: { value: 20, toString: () => '20' }, name: { value: 'USERS', toString: () => 'USERS' } },
];

const commands = VlanGenerator.generateVLANs(vlans);
// ['! Configuración de VLANs', 'vlan 10', ' name ADMIN', ' exit', ...]
```

**Después** (`packages/kernel/src/plugins/vlan/`):

```typescript
import { vlanPlugin, generateVlanCommands, validateVlanConfig } from '@cisco-auto/kernel/plugins/vlan';
import { getPacketTracerBackend } from '../../kernel-bridge';

// 1. Validar input con schema Zod
const validation = validateVlanConfig({
  switchName: 'SW1',
  vlans: [{ id: 10, name: 'ADMIN' }, { id: 20, name: 'USERS' }],
});

if (!validation.ok) {
  throw new Error(validation.errors.map(e => `${e.path}: ${e.message}`).join(', '));
}

// 2. Generar comandos
const commands = generateVlanCommands({
  switchName: 'SW1',
  vlans: [{ id: 10, name: 'ADMIN' }, { id: 20, name: 'USERS' }],
});
// ['vlan 10', 'name ADMIN', 'exit', 'vlan 20', 'name USERS', 'exit']

// 3. Aplicar via backend plugin
const backend = getPacketTracerBackend();
await backend.configureDevice('SW1', commands);
```

#### Routing

**Antes** (`packages/core/src/config-generators/routing-generator.ts`):

```typescript
import { RoutingGenerator } from '@cisco-auto/core/config-generators';

const commands = RoutingGenerator.generateOSPF({
  processId: 1,
  networks: ['192.168.1.0,0.0.0.255,0'],
});
```

**Después** (`packages/kernel/src/plugins/routing/`):

```typescript
import { routingPlugin } from '@cisco-auto/kernel/plugins/routing';
import { getPacketTracerBackend } from '../../kernel-bridge';

const validation = routingPlugin.validate({
  device: 'R1',
  protocol: 'ospf',
  processId: 1,
  networks: [{ network: '192.168.1.0', wildcard: '0.0.0.255', area: 0 }],
});

if (!validation.ok) {
  throw new Error(validation.errors.map(e => e.message).join(', '));
}

// Usar el comando del plugin
const cmd = routingPlugin.commands.find(c => c.name === 'configure-routing');
// Generar y aplicar...
```

### 2. Migrar comandos CLI

#### Comando VLAN

**Antes** (`apps/pt-cli/src/commands/config-vlan.ts`):

```typescript
import { CapabilitySet } from '@cisco-auto/ios-domain/capabilities';
import { planConfigureVlan } from '@cisco-auto/ios-domain/operations';
import { VlanId } from '@cisco-auto/ios-domain/value-objects';

// Generación manual con capability sets
const caps = CapabilitySet.l2Switch('2960');
const plan = planConfigureVlan(caps, {
  vlan: VlanId.fromString('10'),
  name: 'ADMIN',
});
const commands = plan.steps.map((step, i) => i === 0 ? step.command : ` ${step.command}`);

// Ejecución directa
await ctx.controller.configIosWithResult(device, commands, { save: true });
```

**Después** (patrón con plugin):

```typescript
import { generateVlanCommands, validateVlanConfig } from '@cisco-auto/kernel/plugins/vlan';
import { getPacketTracerBackend } from '../kernel-bridge';

// 1. Validar
const validation = validateVlanConfig({
  switchName: device,
  vlans: [{ id: 10, name: 'ADMIN' }],
});
if (!validation.ok) {
  return createErrorResult('config-vlan', { message: validation.errors[0].message });
}

// 2. Generar
const commands = generateVlanCommands({
  switchName: device,
  vlans: [{ id: 10, name: 'ADMIN' }],
});

// 3. Ejecutar via backend
const backend = getPacketTracerBackend();
await backend.configureDevice(device, commands);
```

### 3. Migrar uso de PTController

**Antes** - Controlador directo:

```typescript
import { PTController } from '@cisco-auto/pt-control';

const controller = new PTController();
await controller.start();
await controller.configIosWithResult('R1', ['hostname NuevoRouter'], { save: true });
await controller.stop();
```

**Después** - Via backend plugin:

```typescript
import { getPacketTracerBackend } from '../kernel-bridge';

const backend = getPacketTracerBackend();
await backend.connect({ devDir: process.env.PT_DEV_DIR });
await backend.configureDevice('R1', ['hostname NuevoRouter']);
await backend.disconnect();
```

### 4. Registrar nuevos plugins

**Kernel Bridge** (`apps/pt-cli/src/kernel-bridge.ts`):

```typescript
import { DefaultPluginRegistry, type PluginRegistry } from '@cisco-auto/kernel/plugin-api';
import { vlanPlugin } from '@cisco-auto/kernel/plugins/vlan';
import { routingPlugin } from '@cisco-auto/kernel/plugins/routing';
import { packetTracerBackendPlugin } from '@cisco-auto/kernel/backends/packet-tracer';

let registry: PluginRegistry | null = null;

export function getKernelRegistry(): PluginRegistry {
  if (!registry) {
    registry = new DefaultPluginRegistry();
    registry.register('protocol', vlanPlugin);
    registry.register('protocol', routingPlugin);
    // Backend
    registry.register('backend', packetTracerBackendPlugin);
  }
  return registry;
}

export function getPacketTracerBackend() {
  const reg = getKernelRegistry();
  return reg.get('backend', 'packet-tracer');
}
```

---

## Tabla de Referencia de Plugins

| Generador Legacy | Plugin Nuevo | Categoría | Archivos Clave | Estado |
|-----------------|-------------|-----------|----------------|--------|
| `VlanGenerator` | `vlanPlugin` | switching | `kernel/src/plugins/vlan/` | ✅ Migrado |
| `RoutingGenerator` | `routingPlugin` | routing | `kernel/src/plugins/routing/` | ✅ Migrado |
| `SecurityGenerator` | `securityPlugin` | security | `kernel/src/plugins/security/` | ✅ Migrado |
| `ServicesGenerator` | `servicesPlugin` | services | `kernel/src/plugins/services/` | ✅ Migrado |
| `STPGenerator` | `switchingPlugin` | switching | `kernel/src/plugins/switching/` | ✅ Migrado |
| `IPv6Generator` | `ipv6Plugin` | routing | `kernel/src/plugins/ipv6/` | ✅ Migrado |
| `PortTemplateGenerator` | `portTemplatePlugin` | switching | `kernel/src/plugins/port-template/` | ✅ Migrado |
| `DHCPServerGenerator` | `servicesPlugin` | services | `kernel/src/plugins/services/` | ✅ Migrado |
| `NTPGenerator` | `servicesPlugin` | services | `kernel/src/plugins/services/` | ✅ Migrado |
| — | `packetTracerBackend` | backend | `kernel/src/backends/packet-tracer/` | ✅ Migrado |

---

## Patrones Comunes

### Patrón de validación + generación

Todos los plugins siguen el mismo patrón:

```typescript
// 1. Importar validación y generación del plugin
import { validateXxxConfig, generateXxxCommands } from '@cisco-auto/kernel/plugins/xxx';
import { getPacketTracerBackend } from '../kernel-bridge';

// 2. Validar input
const validation = validateXxxConfig(input);
if (!validation.ok) {
  // validation.errors: Array<{ path: string; message: string; code: string }>
  throw new Error(validation.errors.map(e => `${e.path}: ${e.message}`).join(', '));
}

// 3. Generar comandos IOS
const commands = generateXxxCommands(input);

// 4. Aplicar via backend
const backend = getPacketTracerBackend();
await backend.configureDevice(deviceName, commands);
```

### Patrón de PluginRegistry

```typescript
import { getKernelRegistry, getProtocolPlugin } from '../kernel-bridge';

// Listar todos los plugins de protocolo
const registry = getKernelRegistry();
const plugins = registry.list('protocol');
// [{ id: 'vlan', category: 'switching', ... }, ...]

// Obtener plugin específico
const vlan = registry.get('protocol', 'vlan');
if (vlan) {
  // vlan.commands, vlan.validate(), etc.
}
```

### Patrón de CLI con runCommand

```typescript
import { runCommand } from '../application/run-command';
import { createSuccessResult, createErrorResult } from '../contracts/cli-result';

const result = await runCommand({
  action: 'config-vlan',
  meta: CONFIG_VLAN_META,
  flags,
  payloadPreview: { device, vlanCount: vlans.length },
  execute: async (ctx) => {
    // Validar
    const validation = validateVlanConfig(input);
    if (!validation.ok) {
      return createErrorResult('config-vlan', { message: validation.errors[0].message });
    }

    // Generar
    const commands = generateVlanCommands(input);

    // Ejecutar
    const backend = getPacketTracerBackend();
    await backend.configureDevice(device, commands);

    return createSuccessResult('config-vlan', { device, commands });
  },
});
```

---

## Troubleshooting

### Error: "Plugin not found"

```typescript
// Problema: El plugin no está registrado
const plugin = registry.get('protocol', 'vlan'); // undefined

// Solución: Verificar que el plugin fue registrado en kernel-bridge.ts
// Revisar: apps/pt-cli/src/kernel-bridge.ts
// Debe incluir: registry.register('protocol', vlanPlugin);
```

### Error de validación Zod

```typescript
// Problema: Input no cumple con el schema
const validation = validateVlanConfig({ switchName: 'S1', vlans: [] });
// { ok: false, errors: [{ path: 'vlans', message: 'At least one VLAN is required', code: 'empty_vlan_list' }] }

// Solución: Verificar input contra el schema del plugin
// Schema en: packages/kernel/src/plugins/vlan/vlan.schema.ts
```

### Backend no conectado

```typescript
// Problema: Packet Tracer no está corriendo o devDir no configurado
await backend.connect({ devDir: '' }); // Error: devDir is required

// Solución: Configurar PT_DEV_DIR o pasar devDir válido
await backend.connect({ devDir: process.env.PT_DEV_DIR || '~/pt-dev' });
```

### Comandos duplicados en VLAN

```typescript
// Problema: IDs de VLAN duplicados en la lista
const validation = validateVlanConfig({
  switchName: 'S1',
  vlans: [{ id: 10, name: 'A' }, { id: 10, name: 'B' }],
});
// { ok: false, errors: [{ path: 'vlans.1.id', message: 'Duplicate VLAN ID 10', code: 'duplicate_vlan_id' }] }
```

### Debug de plugins registrados

```typescript
// Listar todos los plugins y su estado
const registry = getKernelRegistry();

console.log('Protocol plugins:');
for (const p of registry.list('protocol')) {
  console.log(`  - ${p.id} (${p.category}) v${p.version}: ${p.description}`);
}

console.log('Backend plugins:');
for (const b of registry.list('backend')) {
  console.log(`  - ${b.name} v${b.version}`);
}
```

---

## FAQ

### ¿Por qué se hizo este cambio?

1. **Extensibilidad**: Agregar un nuevo protocolo ahora solo requiere crear un plugin y registrarlo
2. **Validación**: Cada plugin valida su input con schemas Zod antes de generar comandos
3. **Testabilidad**: Plugins aislados son más fáciles de testear individualmente
4. **Backend intercambiable**: El backend de Packet Tracer es un plugin, se puede reemplazar
5. **Single source of truth**: El registry centraliza qué protocolos están disponibles

### ¿Puedo seguir usando los generadores legacy?

Sí, temporalmente. Los generadores en `packages/core/src/config-generators/` siguen funcionales pero están marcados para deprecación. Se recomienda migrar al patrón de plugins.

**Timeline estimado:**
- Sprint 1-2: Migrar comandos CLI restantes
- Sprint 3: Remover imports de `config-generators` de CLI
- Sprint 4: Marcar `config-generators` como `@deprecated`
- Sprint 5: Remover `config-generators` del paquete `@cisco-auto/core`

### ¿Cómo agrego un nuevo plugin?

1. Crear directorio: `packages/kernel/src/plugins/mi-protocolo/`
2. Archivos mínimos:
   - `mi-protocolo.schema.ts` — Schema Zod del input
   - `mi-protocolo.generator.ts` — Función `generateXxxCommands()`
   - `mi-protocolo.plugin.ts` — Objeto `miProtocoloPlugin` que implementa `ProtocolPlugin`
   - `index.ts` — Re-exports
3. Registrar en `kernel-bridge.ts`:
   ```typescript
   import { miProtocoloPlugin } from '@cisco-auto/kernel/plugins/mi-protocolo';
   registry.register('protocol', miProtocoloPlugin);
   ```

### ¿Qué pasa si un plugin falla?

Los plugins **no lanzan excepciones** en `validate()`. En cambio, retornan:

```typescript
{
  ok: false,
  errors: [
    { path: 'vlans.0.id', message: 'VLAN ID must be between 1 and 4094', code: 'invalid_vlan_id' }
  ]
}
```

Esto permite al caller manejar errores de forma estructurada sin try/catch.

### ¿Cómo verifico que los comandos se aplicaron correctamente?

Algunos plugins exportan funciones de verificación:

```typescript
import { verifyShowVlanBriefOutput } from '@cisco-auto/kernel/plugins/vlan';

const output = await backend.execShow('S1', 'show vlan brief');
const result = verifyShowVlanBriefOutput(output, {
  switchName: 'S1',
  vlans: [{ id: 10, name: 'ADMIN' }],
});

if (!result.ok) {
  console.error('Verificación fallida:', result.errors);
}
```

---

## Glosario

| Término | Definición |
|---------|-----------|
| **PluginRegistry** | Singleton que mantiene registro de todos los plugins disponibles |
| **ProtocolPlugin** | Plugin que genera comandos para un protocolo específico (VLAN, OSPF, etc.) |
| **BackendPlugin** | Plugin que ejecuta comandos en un dispositivo real o simulado |
| **kernel-bridge** | Puente entre la CLI y el kernel, expone funciones de acceso rápido |
| **validate()** | Función que valida input contra schema Zod + reglas de negocio |
| **generateConfig()** | Genera comandos IOS a partir de input validado |
| **PluginValidationResult** | `{ ok: boolean; errors: Array<{ path, message, code }> }` |
