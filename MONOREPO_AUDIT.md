# Monorepo — Análisis de Duplicación y Paquetes Innecesarios

**Fecha**: 2026-04-01  
**Propósito**: Identificar lógica duplicada, paquetes innecesarios y oportunidades de consolidación

---

## 📦 Packages del Monorepo

| Package | Versión | Propósito | Estado |
|---------|---------|-----------|--------|
| `@cisco-auto/types` | 0.1.0 | Tipos y schemas Zod compartidos | ✅ Necesario |
| `@cisco-auto/core` | 0.1.0 | Lógica de negocio, generadores IOS, SSH | ✅ Necesario |
| `@cisco-auto/ios-domain` | 0.1.0 | Dominio IOS compartido | ⚠️ **Problema** |
| `@cisco-auto/pt-control` | 2.0.0 | Control en tiempo real de PT | ✅ Necesario |
| `@cisco-auto/file-bridge` | 0.1.0 | Bridge CLI ↔ PT | ✅ Necesario |
| `@cisco-auto/tools` | 0.1.0 | Exports de conveniencia | ⚠️ **Innecesario** |

---

## 🔴 Problema Principal: `@cisco-auto/ios-domain`

### ¿Qué es `ios-domain`?

Package que contiene **dominio IOS puro** (Value Objects, Operations, Parsers, Session, Capabilities).

**Estructura**:
```
ios-domain/src/
├── value-objects/      # 20 Value Objects (VlanId, Ipv4Address, etc.)
├── operations/         # 10 operaciones (planConfigureVlan, etc.)
├── parsers/            # Parsers de output IOS
├── session/            # CLI session management
├── capabilities/       # Device capabilities
├── utils/              # Utilidades (ios-commands.ts)
└── errors.ts
```

### ¿Quién usa `ios-domain`?

```bash
# core NO usa ios-domain
grep -r "ios-domain" packages/core/  # ❌ 0 resultados

# pt-control SÍ usa ios-domain intensivamente
grep -r "ios-domain" packages/pt-control/  # ✅ 42 imports
```

**Paquetes que importan `ios-domain`**:
- ✅ `@cisco-auto/pt-control` — 42 imports
- ✅ `@cisco-auto/core` — **0 imports** (NO LO USA)

### Duplicación Crítica

#### 1. **Value Objects DUPLICADOS**

| Ubicación | Contenido |
|-----------|-----------|
| `ios-domain/src/value-objects/` | 20 Value Objects |
| `core/src/value-objects/` | 5 Value Objects (VlanId, VlanName, VlanRange, VtpTypes) |

**Problema**: `core` tiene SUS PROPIOS Value Objects en lugar de usar `ios-domain`.

**Ejemplo**:
```typescript
// ios-domain/src/value-objects/vlan-id.ts
export class VlanId {
  constructor(public readonly value: number) {}
  // ... validación
}

// core/src/value-objects/vlan-id.ts
export class VlanId {
  constructor(public readonly value: number) {}
  // ... misma validación
}
```

#### 2. **Generadores de Comandos DUPLICADOS**

| Ubicación | Función |
|-----------|---------|
| `ios-domain/src/utils/ios-commands.ts` | `buildVlanCommands()`, `buildTrunkCommands()`, `buildSshCommands()` |
| `core/src/config-generators/vlan-generator.ts` | `VlanGenerator.generateVLANs()` |

**Comparación**:
```typescript
// ios-domain (usado por pt-control CLI)
export function buildVlanCommands(vlans: number[], name?: string): string[] {
  return vlans.map(v => [`vlan ${v}`, ` name ${name ?? `VLAN${v}`}`, ' exit']).flat();
}

// core (usado por deploy SSH)
export class VlanGenerator {
  public static generateVLANs(vlans: VLANSpec[], vtp?: VTPSpec): string[] {
    // Genera comandos desde schema Zod
  }
}
```

**Diferencia**:
- `ios-domain`: Funciones simples, input primitivo (numbers, strings)
- `core`: Clases con schemas Zod, input validado

#### 3. **Operations vs ConfigGenerators**

| `ios-domain/operations` | `core/config-generators` |
|-------------------------|--------------------------|
| `planConfigureVlan()` | `VlanGenerator.generateVLANs()` |
| `planConfigureAccessPort()` | ❌ No existe en core |
| `planConfigureTrunkPort()` | ❌ No existe en core |
| `planConfigureSvi()` | `VlanGenerator.generateSVIs()` |
| `planConfigureStaticRoute()` | `RoutingGenerator.generateOSPF()` |
| `CommandPlanBuilder` | ❌ No existe en core |

**Diferencia fundamental**:
- `ios-domain`: Genera **CommandPlan** con estados/modos (para PT)
- `core`: Genera **strings** para SSH directo

---

## 📊 Dependencias Actuales

```
@cisco-auto/core
├── @cisco-auto/ios-domain  ❌ NO LO USA (0 imports)
├── @cisco-auto/types       ✅ Sí lo usa
└── (node-ssh, js-yaml, etc.)

@cisco-auto/pt-control
├── @cisco-auto/ios-domain  ✅ Sí lo usa (42 imports)
├── @cisco-auto/types       ✅ Sí lo usa
├── @cisco-auto/file-bridge ✅ Sí lo usa
└── (oclif, ora, etc.)
```

---

## 🔴 Problemas Identificados

### 1. **`core` depende de `ios-domain` pero NO LO USA**

**package.json de `core`**:
```json
{
  "dependencies": {
    "@cisco-auto/ios-domain": "workspace:*",  // ❌ INNECESARIA
    "@cisco-auto/types": "workspace:*",
    // ...
  }
}
```

**Impacto**:
- Dependencia fantasma (aumenta install time)
- Confusión para desarrolladores
- Riesgo de acoplamiento innecesario

**Solución**: Eliminar dependencia de `core/package.json`

---

### 2. **Value Objects duplicados**

**Archivos duplicados**:
```
ios-domain/src/value-objects/vlan-id.ts
core/src/value-objects/vlan-id.ts

ios-domain/src/value-objects/ipv4-address.ts
core/src/value-objects/ipv4-address.ts  (si existiera)
```

**Solución recomendada**:
1. Mover TODOS los Value Objects a `ios-domain` (ya tiene 20)
2. `core` importa desde `@cisco-auto/ios-domain/value-objects`
3. Eliminar `core/src/value-objects/`

---

### 3. **`@cisco-auto/tools` es innecesario**

**Propósito declarado**: "Convenience tool exports and adapters"

**Realidad**:
```typescript
// tools/src/index.ts (400+ líneas)
// Re-exporta funciones de core con wrappers
export const ptListDevicesTool = {
  ...corePtListDevicesTool,
  handler: wrapCoreTool(corePtListDevicesTool.handler, ...),
};

// ¿Quién usa @cisco-auto/tools?
grep -r "@cisco-auto/tools" packages/  # Solo root package.json
```

**Problemas**:
- Solo hace wrap de funciones de `core`
- Añade complejidad sin valor real
- Nadie lo usa directamente

**Solución**: Eliminar `@cisco-auto/tools`

---

### 4. **`ios-domain/utils/ios-commands.ts` duplica `core/config-generators`**

**Funciones en `ios-domain`**:
- `buildVlanCommands()` — duplica `VlanGenerator.generateVLANs()`
- `buildTrunkCommands()` — no existe en core
- `buildSshCommands()` — no existe en core

**Análisis**:
- `buildVlanCommands` está DUPLICADO (diferente API, mismo propósito)
- `buildTrunkCommands` y `buildSshCommands` son ÚTILES (no existen en core)

**Solución**:
1. Mover `buildTrunkCommands` y `buildSshCommands` a `core/config-generators/`
2. Eliminar `buildVlanCommands` de `ios-domain` (usar `VlanGenerator`)
3. Actualizar `pt-control` para usar `core` en lugar de `ios-domain/utils`

---

## ✅ Lo que SÍ está bien separado

### `ios-domain` tiene responsabilidades ÚNICAS:

1. **CommandPlan** — Plan de comandos con modos (user→enable→config)
2. **CliSession** — Estado de sesión CLI (modo actual, historial)
3. **CapabilitySet** — Capacidades de dispositivo PT
4. **IOS Parsers** — Parseo de output (aunque debería ser compartido)

### `core` tiene responsabilidades ÚNICAS:

1. **YAML Parser** — Parseo de labs YAML
2. **SSH Connector** — Conexión SSH a dispositivos reales
3. **Deploy Orchestrator** — Orquestación de despliegue paralelo
4. **Config Generators** — Generadores desde schemas Zod

---

## 🎯 Plan de Refactorización

### Fase 1: Eliminar dependencia fantasma (1 hora)

```bash
# 1. Editar core/package.json
# Eliminar: "@cisco-auto/ios-domain": "workspace:*"

# 2. Verificar que core no importa ios-domain
grep -r "ios-domain" packages/core/src/  # Debe dar 0 resultados

# 3. Reinstalar
bun install
```

---

### Fase 2: Consolidar Value Objects (2 horas)

```bash
# 1. Mover TODOS los value-objects de core a ios-domain
mv packages/core/src/value-objects/* packages/ios-domain/src/value-objects/

# 2. Eliminar directorio en core
rm -rf packages/core/src/value-objects/

# 3. Actualizar exports en ios-domain/src/index.ts
export * from "./value-objects/index.js";

# 4. Actualizar imports en core
# Cambiar: import { VlanId } from './value-objects/vlan-id.js';
# Por:     import { VlanId } from '@cisco-auto/ios-domain/value-objects';

# 5. Actualizar core/src/index.ts
export { VlanId, Ipv4Address, ... } from '@cisco-auto/ios-domain/value-objects';
```

---

### Fase 3: Eliminar `@cisco-auto/tools` (2 horas)

```bash
# 1. Identificar quién usa @cisco-auto/tools
grep -r "@cisco-auto/tools" apps/ packages/

# 2. Actualizar imports para usar core directamente
# Cambiar: import { ptListDevicesTool } from '@cisco-auto/tools';
# Por:     import { ptListDevicesTool } from '@cisco-auto/core/tools';

# 3. Eliminar package
rm -rf packages/tools/

# 4. Actualizar root package.json
# Eliminar: "@cisco-auto/tools": "workspace:*"

# 5. Reinstalar
bun install
```

---

### Fase 4: Mover utilidades IOS a core (2 horas)

```bash
# 1. Mover funciones útiles de ios-domain a core
# Mover: buildTrunkCommands, buildSshCommands
# De:    packages/ios-domain/src/utils/ios-commands.ts
# A:     packages/core/src/config-generators/ios-commands.ts

# 2. Eliminar buildVlanCommands de ios-domain (ya existe VlanGenerator en core)

# 3. Actualizar pt-control para usar core
# Cambiar: import { buildTrunkCommands } from '@cisco-auto/ios-domain';
# Por:     import { buildTrunkCommands } from '@cisco-auto/core/config-generators';

# 4. Actualizar ios-domain/src/index.ts
# Eliminar export de utils/ios-commands.ts
```

---

### Fase 5: Mover parsers a ios-domain (3 horas)

**Estado actual**:
- `pt-control/src/domain/ios/parsers/` — 10 parsers
- `ios-domain/src/parsers/` — 2 archivos (parse-with-sanitization, parser-utils)

**Acción**:
```bash
# 1. Mover parsers de pt-control a ios-domain
mv packages/pt-control/src/domain/ios/parsers/* packages/ios-domain/src/parsers/

# 2. Actualizar imports en pt-control
# Cambiar: import { parseShowIpInterfaceBrief } from '../domain/ios/parsers';
# Por:     import { parseShowIpInterfaceBrief } from '@cisco-auto/ios-domain/parsers';

# 3. Exportar desde ios-domain
export * from "./parsers/index.js";

# 4. Actualizar core si usa parsers
# (actualmente core no usa parsers)
```

---

## 📦 Estructura Final Recomendada

```
packages/
├── types/                    # ✅ Tipos y schemas Zod (Single Source of Truth)
│   ├── schemas/              # Lab, Device, VLAN, OSPF, etc.
│   └── types/                # Re-exports de tipos
│
├── ios-domain/               # ✅ Dominio IOS puro (consolidado)
│   ├── value-objects/        # TODOS los VOs (25+)
│   ├── operations/           # CommandPlan operations
│   ├── parsers/              # TODOS los parsers IOS
│   ├── session/              # CLI session management
│   ├── capabilities/         # Device capabilities
│   └── errors.ts
│
├── core/                     # ✅ Lógica de negocio (sin ios-domain)
│   ├── parser/               # YAML parser
│   ├── config-generators/    # Generadores desde schemas Zod
│   │   ├── vlan-generator.ts
│   │   ├── routing-generator.ts
│   │   ├── ios-commands.ts   # buildTrunkCommands, buildSshCommands
│   │   └── ...
│   ├── connector/            # SSH/Telnet
│   ├── executor/             # Deploy orchestrator
│   ├── canonical/            # Canonical models
│   ├── validation/           # Validadores
│   └── tools/                # Herramientas
│
├── file-bridge/              # ✅ Bridge CLI ↔ PT
│
├── pt-control/               # ✅ Control en tiempo real de PT
│   ├── controller/           # PTController API
│   ├── application/services/ # TopologyService, DeviceService, IosService
│   ├── vdom/                 # Virtual topology
│   ├── cli/commands/         # OCLIF commands
│   └── domain/ios/           # Solo capacidades PT-specific
│       └── capabilities/     # pt-capability-resolver.ts
│
└── (tools eliminado)         # ❌ ELIMINADO
```

---

## 🔗 Dependencias Finales

```json
{
  "name": "@cisco-auto/core",
  "dependencies": {
    "@cisco-auto/types": "workspace:*"
    // ✅ ios-domain eliminado (no se usa)
  }
}

{
  "name": "@cisco-auto/pt-control",
  "dependencies": {
    "@cisco-auto/types": "workspace:*",
    "@cisco-auto/ios-domain": "workspace:*",  // ✅ Sí lo usa
    "@cisco-auto/file-bridge": "workspace:*",
    "@cisco-auto/core": "workspace:*"         // ✅ Para generadores
  }
}
```

---

## 📊 Resumen de Cambios

| Acción | Impacto | Tiempo |
|--------|---------|--------|
| Eliminar dependencia `core → ios-domain` | Limpieza | 1h |
| Mover Value Objects a `ios-domain` | Consolidación | 2h |
| Eliminar `@cisco-auto/tools` | Simplificación | 2h |
| Mover utilidades IOS a `core` | Consolidación | 2h |
| Mover parsers a `ios-domain` | Consolidación | 3h |
| Actualizar tests | Validación | 4h |
| **TOTAL** | | **14 horas** |

---

## ✅ Beneficios

1. **Menos duplicación**: Value Objects en un solo lugar
2. **Dependencias claras**: `core` no depende de `ios-domain` innecesariamente
3. **Packages con propósito definido**:
   - `types`: Tipos y schemas
   - `ios-domain`: Dominio IOS puro
   - `core`: Lógica de negocio y generadores
   - `pt-control`: Control en tiempo real de PT
4. **Menos packages**: De 6 a 5 packages activos
5. **Imports más claros**: Sabés dónde buscar cada cosa

---

## ⚠️ Riesgos

1. **Tests rotos**: Actualizar imports en tests
2. **Breaking changes**: API cambia para consumidores
3. **Merge conflicts**: Si hay ramas activas

**Mitigación**:
- Hacer cambios en rama separada
- Ejecutar todos los tests antes de merge
- Actualizar documentación

---

**Fin del análisis**
