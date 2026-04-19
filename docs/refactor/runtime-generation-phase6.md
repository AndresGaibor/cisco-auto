# Runtime Generation - Fase 6

> Arquitectura de generación de assets PT (`main.js`, `runtime.js`, `catalog.js`) desde código fuente tipado.

## 1. Visión general

```
┌─────────────────────────────────────────────────────────────────────┐
│                    GENERATION PIPELINE                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌──────────────────┐    ┌──────────────────┐    ┌──────────────┐ │
│   │ main-generator   │    │ runtime-generator│    │ catalog-     │ │
│   │                  │    │                  │    │ generator    │ │
│   └────────┬─────────┘    └────────┬─────────┘    └──────┬───────┘ │
│            │                        │                      │         │
│            ▼                        ▼                      ▼         │
│   ┌──────────────────┐    ┌──────────────────┐    ┌──────────────┐ │
│   │   main.js        │    │   runtime.js     │    │ catalog.js   │ │
│   │   (kernel)       │    │   (primitives +  │    │ (device      │ │
│   │                  │    │    omni adapters)│    │  definitions)│ │
│   └──────────────────┘    └──────────────────┘    └──────────────┘ │
│                                                                     │
│   Fuente única: runtime-manifest.ts                                │
└─────────────────────────────────────────────────────────────────────┘
```

**Regla central:** No más generación opaca basada en rutas mágicas o globbing sin control.

## 2. main-generator.ts

Genera `main.js` — el kernel mínimo de PT.

### 2.1 Inputs

```typescript
// Genera main.js con estructura fija:
interface MainGeneratorInput {
  version: string;
  pollIntervalMs: number;
  enableHotReload: boolean;
  enableHeartbeat: boolean;
  heartbeatIntervalMs: number;
}
```

### 2.2 Output

```javascript
// main.js generado
'use strict';

var ipc = global.ipc;
var n = global.n;
var w = global.w;
var _runtime = null;
var _pollingTimer = null;
var _cleanupHandlers = [];

function init() {
  // Registrar cleanup handlers
  _cleanupHandlers.push(function() {
    // cleanup del runtime
  });
}

function cleanUp() {
  // Detener timers, desconectar listeners
  if (_pollingTimer) {
    clearInterval(_pollingTimer);
    _pollingTimer = null;
  }
  _cleanupHandlers.forEach(function(h) {
    try { h(); } catch (e) { /* log sin reventar */ }
  });
  _cleanupHandlers = [];
}

function loadRuntime() {
  // Hot reload check por mtime
  try {
    _runtime = require('runtime.js');
  } catch (e) {
    // fallback
  }
}

function main() {
  init();
  loadRuntime();

  _pollingTimer = setInterval(function() {
    // Poll commands from filesystem
    // Dispatch via _ptDispatch()
  }, 500);
}

main();
```

### 2.3 Contrato de main.js

```typescript
interface MainContract {
  functions: ['init', 'main', 'cleanUp', 'loadRuntime'];
  globals: ['ipc', 'n', 'w', '_runtime', '_pollingTimer', '_cleanupHandlers'];
  noExport: true; // Solo se ejecuta, no exporta
}
```

## 3. runtime-generator.ts

Genera `runtime.js` —包含了 primitives y omni adapters.

### 3.1 Inputs

```typescript
interface RuntimeGeneratorInput {
  primitives: PrimitiveDefinition[];
  omniAdapters: OmniAdapterDefinition[];
  terminalSubsystem: TerminalSubsystemDefinition;
  manifest: RuntimeManifest;
}
```

### 3.2 Fuentes de registry

```typescript
// Estructura de registries tipados

// packages/pt-runtime/src/runtime/primitives/
//   - device-primitives.ts
//   - link-primitives.ts
//   - terminal-primitives.ts
//   - snapshot-primitives.ts

// packages/pt-runtime/src/runtime/omni-adapters/
//   - device-omni.ts
//   - link-omni.ts
//   - assessment-omni.ts

// packages/pt-runtime/src/runtime/terminal/
//   - terminal-engine.ts
```

### 3.3 Output

```javascript
// runtime.js generado
'use strict';

var _primitives = {
  'device.add': function(config) { /* ... */ },
  'device.list': function() { /* ... */ },
  // ... todos los primitives del manifest
};

var _omniAdapters = {
  'omni.device.evaluate': function(script) { /* ... */ },
  'omni.assessment.read': function(itemId) { /* ... */ },
  // ... todos los omni adapters del manifest
};

var _terminal = {
  'terminal.open': function(deviceId) { /* ... */ },
  'terminal.send': function(sessionId, command) { /* ... */ },
  // ... terminal subsystem
};

function _ptDispatch(payload, api) {
  var cmdId = payload.type;
  var handler;

  if (handler = _primitives[cmdId]) {
    return handler(payload, api);
  }
  if (handler = _omniAdapters[cmdId]) {
    return handler(payload, api);
  }
  if (handler = _terminal[cmdId]) {
    return handler(payload, api);
  }

  return { error: 'Unknown command: ' + cmdId };
}

module.exports = {
  _ptDispatch: _ptDispatch,
  primitives: _primitives,
  omniAdapters: _omniAdapters,
  terminal: _terminal
};
```

## 4. catalog-generator.ts

Genera `catalog.js` — definiciones de dispositivos para PT.

### 4.1 Input

```typescript
interface CatalogGeneratorInput {
  devices: DeviceDefinition[];
  modules: ModuleDefinition[];
  connections: ConnectionDefinition[];
}
```

### 4.2 Source

```typescript
// packages/pt-runtime/src/catalog/
// Catalog limpio: solo definiciones de devices/modules
// Sin lógica de generación复杂的
```

### 4.3 Output

```javascript
// catalog.js generado
'use strict';

module.exports = {
  devices: [
    { type: 'Router', model: '1941', defaultRAM: '256' },
    { type: 'Switch', model: '2960', defaultRAM: '128' },
    // ...
  ],
  modules: [
    { deviceType: 'Router', slot: 0, module: 'NM-1FE' },
    // ...
  ],
  connections: [
    { from: 'Router', to: 'Switch', cable: 'Copper Cross-Over' },
    // ...
  ]
};
```

## 5. runtime-manifest.ts

**Fuente única de verdad** para qué entra en cada asset.

### 5.1 Contrato

```typescript
interface RuntimeManifest {
  // Metadatos
  version: string;
  generatedAt: string;
  checksum: string;

  // Qué va en runtime.js
  runtime: {
    primitives: string[];      // IDs de primitives incluidos
    omniAdapters: string[];    // IDs de omni adapters incluidos
    terminalApi: string[];    // Métodos del terminal subsystem
  };

  // Qué va en main.js
  main: {
    pollIntervalMs: number;
    enableHotReload: boolean;
    heartbeatIntervalMs: number;
  };

  // Qué va en catalog.js
  catalog: {
    devices: string[];         // Tipos de dispositivos
    modules: string[];         // Módulos disponibles
  };

  // IDs disponibles para dispatch
  availableCommands: CommandId[];
}

type CommandId =
  // Primitives
  | 'device.add' | 'device.list' | 'device.remove' | 'device.move'
  | 'link.add' | 'link.remove'
  | 'terminal.open' | 'terminal.send' | 'terminal.close'
  | 'snapshot.take' | 'snapshot.restore'
  // Omni
  | 'omni.evaluate' | 'omni.assessment.read' | 'omni.device.genome'
  // Workflows (en pt-control, no en runtime)
  | 'workflow.vlan' | 'workflow.dhcp' | 'workflow.ospf';
```

### 5.2 Uso del manifest

```typescript
// En runtime-generator.ts
function generateRuntime(manifest: RuntimeManifest): string {
  var code = '// Generated from manifest: ' + manifest.version + '\n';
  code += "'use strict';\n\n";

  // Solo incluir primitives del manifest
  manifest.runtime.primitives.forEach(function(id) {
    code += generatePrimitive(id);
  });

  // Solo incluir omni adapters del manifest
  manifest.runtime.omniAdapters.forEach(function(id) {
    code += generateOmniAdapter(id);
  });

  return code;
}
```

## 6. Proceso de generación

```
┌──────────────────────────────────────────────────────────────────┐
│                    bun run pt:build                               │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  1. Load runtime-manifest.ts                                     │
│     → Validar que todos los IDs referenciados existan           │
│                                                                   │
│  2. Generate main.js                                            │
│     → main-generator.ts → main.js                               │
│     → Validar ES5-safe                                          │
│                                                                   │
│  3. Generate runtime.js                                         │
│     → runtime-generator.ts → runtime.js                          │
│     → Validar ES5-safe                                          │
│     → Validar PT-safe                                            │
│     → Verificar todos los IDs del manifest están incluidos     │
│                                                                   │
│  4. Generate catalog.js                                         │
│     → catalog-generator.ts → catalog.js                          │
│     → Validar ES5-safe                                          │
│                                                                   │
│  5. Bundle y deploy a ~/pt-dev/                                 │
│                                                                   │
│  6. Generate checksums para hot reload                          │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

## 7. Reglas de generación

| Regla | Descripción |
|-------|-------------|
| No magic paths | Cada archivo generado tiene source explícito en manifest |
| No globbing | Se especifica exactamente qué va en cada asset |
| ID tracking | Todos los command IDs están en el manifest |
| ES5-only | El generador produce ES5 válido |
| PT-safe | El output pasa la validación PT-safe gate |
| Traceability | manifest.checksum vincula output a input |
