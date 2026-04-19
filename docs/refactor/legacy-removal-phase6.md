# Legacy Removal - Fase 6

> Identificación y eliminación de legacy técnico acumulado.

## 1. Taxonomía de legacy

```
┌─────────────────────────────────────────────────────────────┐
│                  LEGACY CLASSIFICATION                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   ELIMINAR/DESCONECTAR                                       │
│   ├── Paths de build obsoletos                               │
│   ├── Exports públicos sin uso                               │
│   ├── Wrappers sin consumidores                             │
│   ├── Validadores redundantes                               │
│   └── Wiring de handlers ya migrados                         │
│                                                              │
│   MANTENER TEMPORALMENTE                                     │
│   ├── Wrappers de compatibilidad externa                     │
│   └── Transición de cola (si cola real no está completa)    │
│                                                              │
│   BLOQUEAR (PELIGROSO)                                       │
│   ├── Éxito sintético                                       │
│   ├── Hot reload excesivo                                   │
│   ├── Dependencies de command.json                          │
│   └── Rutas directas a internals                            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 2. Legacy a eliminar/desconectar

### 2.1 Paths de build obsoletos

```yaml
# ANTES (build pipeline compleja con múltiples paths)
build:
  main:
    - src/pt/kernel/main-old.ts      # ❌ ELIMINAR - versión anterior
    - src/pt/kernel/main-legacy.ts    # ❌ ELIMINAR - versión anterior
    - src/pt/kernel/main-experimental.ts  # ❌ ELIMINAR - experimento
  runtime:
    - src/runtime/handlers/deprecated/  # ❌ ELIMINAR directorio completo

# DESPUÉS (build pipeline limpia)
build:
  main:
    - src/pt/kernel/main.ts           # ✅ Un solo entry point
  runtime:
    - src/runtime/generated/          # ✅ Generator output
```

### 2.2 Exports públicos obsoletos

```typescript
// ANTES - exports públicos que nadie consume

// src/runtime/public-api.ts
export { legacyHandler } from './handlers/legacy';           // ❌ ELIMINAR
export { oldVlanWorkflow } from './workflows/vlan-old';   // ❌ ELIMINAR
export { deprecatedOmni } from './omni/deprecated';         // ❌ ELIMINAR

// DESPUÉS - solo exports necesarios
export { devicePrimitives } from './primitives/device';
export { terminalSubsystem } from './terminal/subsystem';
```

### 2.3 Wrappers sin consumidores

```typescript
// ANTES - wrappers de compatibilidad que nadie usa

// ❌ ELIMINAR - wrapper para versión anterior de API
class LegacyVlanWrapper {
  static create(args) { /* migrate a WorkflowVlan */ }
}

// ❌ ELIMINAR - wrapper para API alternativa
class AlternativeApiWrapper {
  // Sin usages en codebase
}

// ✅ MANTENER solo si hay consumers externos activos
class StablePublicApi {
  // 10+ usages → mantener
}
```

### 2.4 Validadores antiguos redundantes

```typescript
// ANTES - múltiples capas de validación redundantes

// Capa 1: legacy validator (duplicado)
function legacyValidateDeviceConfig(config: DeviceConfig): boolean {
  // Mismo código que validateDeviceConfig
  return validateDeviceConfig(config);
}

// Capa 2: validator nuevo
function validateDeviceConfig(config: DeviceConfig): boolean {
  // Lógica real
}

// ❌ ELIMINAR legacyValidateDeviceConfig

// DESPUÉS - una sola fuente de validación
export { validateDeviceConfig } from './device-validator';
```

### 2.5 Wiring de handlers migrados

```
# ANTES - dispatch routing a handlers ya migrados a pt-control

// dispatch.ts
case 'workflow.vlan':
  // ❌ ELIMINAR - VLAN workflow ya migrado a pt-control
  return handleLegacyVlanWorkflow(payload);

// case 'workflow.ospf':
// ❌ ELIMINAR - OSPF workflow ya migrado
//   return handleLegacyOspfWorkflow(payload);

// DESPUÉS - dispatch solo delega a pt-control o runtime

case 'device.add':
  // ✅ Runtime primitive
  return _primitives['device.add'](payload, api);
```

## 3. Legacy a mantener temporalmente

### 3.1 Wrappers de compatibilidad externa

```typescript
// MANTENER - API pública todavía consumida por usuarios

interface CompatibilityWrapper {
  // Versión de API 1.x todavía en uso
  legacyMethod(params: LegacyParams): Promise<LegacyResult>;

  // Migrations en progreso:
  // - 2024-Q1: 100% consumers迁移 a nueva API
  // - 2024-Q2: deprecate wrapper
}

// Tracking de usage:
var LEGACY_API_USAGE = {
  'legacyMethod': {
    lastUsed: '2024-01-15',
    consumerCount: 3,  // ⚠️ Monitorear
    migrationTarget: 'newMethod'
  }
};
```

### 3.2 Transición de cola

```
# Estado actual de migración de cola:

# ✅ COMPLETADO
- command queue (file-based) → pt-control workflow
- legacy dispatch → new dispatch

# 🔄 EN PROGRESO
- command.json legacy parsing → pt-control parser
# ETA: Fase 6

# ⏳ PENDIENTE
- None
```

**Regla:** Si la cola real está lista y funcionando, eliminar las rutas legacy que dependan de `command.json`.

## 4. Legacy peligroso a bloquear

### 4.1 Éxito sintético

```typescript
// ❌ BLOQUEAR - Success retornado sin hacer trabajo real

function fakeDeviceAdd(config) {
  // No llama al runtime, solo retorna "success"
  return { success: true, id: 'fake-' + Date.now() };
}

// ✅ CORRECTO - Siempre delega al runtime
function realDeviceAdd(config, api) {
  return _primitives['device.add'](config, api);
}
```

### 4.2 Hot reload excesivo sin validación

```typescript
// ❌ BLOQUEAR - Hot reload sin validación de sanity

// Main.js NO debe hacer esto:
function hotReload() {
  // Sin checksum, sin validación
  _runtime = require('runtime.js'); // Peligroso!
}

// ✅ CORRECTO - Hot reload con validación
function hotReload() {
  var newChecksum = md5(newRuntimeSource);
  if (newChecksum !== _runtimeChecksum) {
    validatePTSafe(newRuntimeSource); // Fallo si no es ES5-safe
    _runtime = require('runtime.js');
    _runtimeChecksum = newChecksum;
  }
}
```

### 4.3 Dependencias de command.json

```typescript
// ❌ BLOQUEAR - Si la cola real está lista, no usar command.json

// ANTES (transición):
if (useNewQueue) {
  result = readFromNewQueue();
} else {
  // ✅ Legacy fallback temporal
  result = parseLegacyCommandJson();
}

// DESPUÉS (post-transición):
// ❌ ELIMINAR fallback a command.json
// ✅ Usar solo new queue
result = readFromNewQueue();
```

### 4.4 Rutas directas a internals

```typescript
// ❌ BLOQUEAR - Acceso directo a globals de PT sin abstracción

// NO hacer esto en handlers/workflows:
var device = n.devices[deviceId]; // Acceso directo a internals
var links = w.links;              // Sin abstracción

// ✅ CORRECTO - Usar primitivas/omni adapters
var result = _primitives['device.get']({ id: deviceId }, api);
```

## 5. Checklist de limpieza

```
LEGACY A ELIMINAR:
□ src/pt/kernel/main-old.ts
□ src/pt/kernel/main-legacy.ts
□ src/runtime/handlers/deprecated/
□ Wrappers sin consumers
□ Validadores redundantes (duplicados)
□ Wiring de handlers ya migrados a pt-control

LEGACY A MANTENER TEMPORALMENTE:
□ Wrappers de compatibilidad externa (con tracking de uso)
□ Transición de cola (verificar estado)

LEGACY PELIGROSO A BLOQUEAR:
□ Éxito sintético (fake returns)
□ Hot reload sin validación
□ Dependencies de command.json (si cola real está lista)
□ Acceso directo a internals (n.devices, w.links)
```

## 6. Validación post-limpieza

```bash
# Verificar que no quedan imports de código eliminado

# 1. Buscar imports de módulos eliminados
grep -r "from.*main-old" src/
grep -r "from.*legacy" src/
grep -r "from.*deprecated" src/

# 2. Verificar que exports públicos tienen consumers
# (usar code-index o grep para buscar usages)

# 3. Buscar uso de APIs internal directa
grep -r "n\.devices\[" src/
grep -r "w\.links" src/
grep -r "global\.ipc" src/

# 4. Verificar PT-safe de runtime generado
bun run validate-pt-safe dist/runtime.js
```

## 7. Timeline de eliminación

```
FASE 6 (actual):
├── Eliminar: main-old, main-legacy, main-experimental
├── Eliminar: handlers/deprecated/
├── Bloquear: éxito sintético
└── Bloquear: hot reload sin validación

POST-FASE 6 (cuando corresponda):
├── Eliminar: wrappers de compatibilidad (cuando consumers = 0)
├── Eliminar: command.json fallback (cuando cola real probada)
└── Bloquear: acceso directo a internals (con lint rule)
```
