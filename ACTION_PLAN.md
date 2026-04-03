# 🚀 Plan de Acción: Migración a TypeScript Source

## Fase 0: Preparación Inmediata (30 min)

### 0.1 Crear Rama
```bash
cd /Users/andresgaibor/code/javascript/cisco-auto
git checkout -b refactor/typescript-runtime
git push --set-upstream origin refactor/typescript-runtime
```

### 0.2 Crear Estructura Base
```bash
mkdir -p packages/pt-runtime/src/runtime/{handlers,types}
mkdir -p packages/pt-runtime/src/runtime/scripts
```

### 0.3 Crear `tsconfig.runtime.json`
```bash
cat > packages/pt-runtime/tsconfig.runtime.json << 'EOF'
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "target": "ES5",
    "lib": ["ES5"],
    "module": "commonjs",
    "moduleResolution": "node",
    "outDir": "./generated",
    "declaration": false,
    "sourceMap": false,
    "removeComments": true,
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/runtime/**/*.ts"],
  "exclude": ["node_modules", "dist", "__tests__"]
}
EOF
```

---

## Fase 1: Crear Módulo de Tipos (30 min)

### 1.1 Crear `src/runtime/types.ts`

```bash
cat > packages/pt-runtime/src/runtime/types.ts << 'EOF'
/**
 * Core runtime types
 * Used by all handlers and PT integration
 */

/** Payload sent to runtime handlers */
export interface HandlerPayload {
  type: string;
  [key: string]: unknown;
}

/** Dependencies injected to handlers */
export interface HandlerDependencies {
  ipc: any;
  dprint: (msg: string) => void;
}

/** Result returned from handlers */
export interface HandlerResult {
  ok: boolean;
  error?: string;
  value?: unknown;
}

/** Handler function type */
export type HandlerFunction = (
  payload: HandlerPayload,
  deps: HandlerDependencies
) => HandlerResult;

/** Handler registry */
export interface HandlerRegistry {
  [key: string]: HandlerFunction;
}
EOF
```

### 1.2 Crear `src/runtime/index.ts` (Main Entry Point)

```bash
cat > packages/pt-runtime/src/runtime/index.ts << 'EOF'
/**
 * PT Control V2 - Runtime Entry Point
 * 
 * This is the main runtime function called from PT main.js
 * Usage: var result = runtime(payload, ipc, dprint);
 */

import type { HandlerPayload, HandlerDependencies, HandlerResult } from "./types";

// Import all modules (will be compiled to ES5)
// NOTE: Import paths are resolved at compile time

/**
 * Main runtime dispatcher
 * Called by PT Script Engine with: runtime(payload, ipc, dprint)
 */
function runtime(
  payload: HandlerPayload,
  ipc: any,
  dprint: (msg: string) => void
): HandlerResult {
  const deps: HandlerDependencies = { ipc, dprint };

  try {
    dprint("[RUNTIME] Processing command: " + payload.type);

    // TODO: Import dispatcher and call it
    // For now, basic implementation
    
    return {
      ok: true,
      value: { message: "Runtime active" }
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    dprint("[RUNTIME] Fatal error: " + message);

    return {
      ok: false,
      error: "Runtime error: " + message
    };
  }
}

// Export as global for PT to call
declare global {
  function runtime(payload: HandlerPayload, ipc: any, dprint: any): HandlerResult;
}

(globalThis as any).runtime = runtime;

export { runtime };
EOF
```

---

## Fase 2: Migrar Constants (1 hora)

### 2.1 Crear `src/runtime/constants.ts`

Puedes copiar del POC o ejecutar:

```bash
cat > packages/pt-runtime/src/runtime/constants.ts << 'EOF'
/**
 * PT Runtime Constants
 * Packet Tracer IPC device and cable types
 */

// Cable types (PT IPC constants)
export const CABLE_TYPES = {
  "ethernet-straight": 8100,
  "ethernet-cross": 8101,
  "straight": 8100,
  "cross": 8101,
  "roll": 8102,
  "fiber": 8103,
  "phone": 8104,
  "cable": 8105,
  "serial": 8106,
  "auto": 8107,
  "console": 8108,
  "wireless": 8109,
  "coaxial": 8110,
  "octal": 8111,
  "cellular": 8112,
  "usb": 8113,
  "custom_io": 8114,
} as const;

export type CableType = keyof typeof CABLE_TYPES;

// Device types (PT IPC constants)
export const DEVICE_TYPES = {
  "router": 0,
  "switch": 1,
  "cloud": 2,
  "bridge": 3,
  "hub": 4,
  "repeater": 5,
  "coaxialSplitter": 6,
  "wireless": 7,
  "pc": 8,
  "server": 9,
  "printer": 10,
  "wirelessRouter": 11,
  "ipPhone": 12,
  "dslModem": 13,
  "cableModem": 14,
  "multilayerSwitch": 16,
  "laptop": 18,
  "tablet": 19,
  "smartphone": 20,
  "wirelessEndDevice": 21,
  "wiredEndDevice": 22,
  "tv": 23,
  "homeVoip": 24,
  "analogPhone": 25,
  "firewall": 27,
  "dlc": 29,
  "homeRouter": 30,
  "cellTower": 31,
  "centralOfficeServer": 32,
  "iot": 34,
  "sniffer": 35,
  "mcu": 36,
  "sbc": 37,
  "embeddedServer": 40,
  "wlc": 41,
  "aironet": 44,
  "powerDistribution": 45,
  "patchPanel": 46,
  "wallMount": 47,
  "meraki": 48,
  "merakiServer": 49,
  "networkController": 50,
} as const;

export type DeviceType = keyof typeof DEVICE_TYPES;

// Reverse mappings
export const DEVICE_TYPE_NAMES: Record<string, string> = {
  "0": "router",
  "1": "switch",
  "2": "cloud",
  "3": "bridge",
  "4": "hub",
  "5": "repeater",
  "7": "wireless",
  "8": "pc",
  "9": "server",
  "10": "printer",
  "11": "wireless-router",
  "16": "multilayer-switch",
  "18": "laptop",
  "19": "tablet",
  "20": "smartphone",
  "21": "wireless-end-device",
  "22": "wired-end-device",
  "27": "firewall",
  "30": "home-router",
  "34": "iot",
  "41": "wlc",
  "44": "aironet",
};

export const CABLE_TYPE_NAMES: Record<string, string> = {
  "8100": "straight",
  "8101": "cross",
  "8102": "roll",
  "8103": "fiber",
  "8104": "phone",
  "8105": "cable",
  "8106": "serial",
  "8107": "auto",
  "8108": "console",
  "8109": "wireless",
  "8110": "coaxial",
  "8111": "octal",
  "8112": "cellular",
  "8113": "usb",
  "8114": "custom_io",
};

export const MODEL_ALIASES = {
  "pc": "PC-PT",
  "laptop": "Laptop-PT",
  "server": "Server-PT",
  "cloud": "Cloud-PT",
  "printer": "Printer-PT",
  "ap": "AccessPoint-PT",
  "accesspoint": "AccessPoint-PT",
  "wrt300n": "Linksys-WRT300N",
} as const;

// Validation helpers
export function isValidDeviceType(type: string): type is DeviceType {
  return type in DEVICE_TYPES;
}

export function isValidCableType(type: string): type is CableType {
  return type in CABLE_TYPES;
}

export function getDeviceTypeCode(type: string): number | null {
  const t = type.toLowerCase();
  if (t in DEVICE_TYPES) {
    return DEVICE_TYPES[t as DeviceType];
  }
  return null;
}
EOF
```

### 2.2 Compilar y Probar

```bash
cd packages/pt-runtime

# Compilar a ES5
npx tsc -p tsconfig.runtime.json

# Verificar salida
cat generated/runtime.js | head -100

# Debería mostrar ES5 puro sin tipos TypeScript
# var CABLE_TYPES = { ... };
# var DEVICE_TYPES = { ... };
# function isValidDeviceType(type) { ... }
```

### 2.3 Validar que sea ES5

```bash
# Buscar características ES6+ que NO deberían estar
grep -E "=>|const |let |class |import |export |async |await " generated/runtime.js

# Si no hay salida, ¡perfecto! Es puro ES5
```

---

## Fase 3: Crear Helpers (45 min)

### 3.1 Crear `src/runtime/helpers.ts`

```bash
cat > packages/pt-runtime/src/runtime/helpers.ts << 'EOF'
/**
 * PT Runtime Helpers
 * Utility functions used by handlers
 */

import { DEVICE_TYPES, CABLE_TYPES } from "./constants";

/**
 * Format error message with optional context
 */
export function formatError(message: string, context?: Record<string, unknown>): string {
  if (!context || Object.keys(context).length === 0) {
    return message;
  }

  let result = message + " [";
  let first = true;

  for (const [key, value] of Object.entries(context)) {
    if (!first) result += ", ";
    result += key + "=" + JSON.stringify(value);
    first = false;
  }

  result += "]";
  return result;
}

/**
 * Safely get a value with type checking
 */
export function safeGetString(obj: any, key: string): string | null {
  if (!obj || typeof obj !== "object") return null;
  const value = obj[key];
  return typeof value === "string" ? value : null;
}

export function safeGetNumber(obj: any, key: string): number | null {
  if (!obj || typeof obj !== "object") return null;
  const value = obj[key];
  return typeof value === "number" ? value : null;
}

/**
 * Log with timestamp
 */
export function logWithTime(dprint: (msg: string) => void, message: string): void {
  const now = new Date().toISOString();
  dprint("[" + now + "] " + message);
}

/**
 * Create error result
 */
export function errorResult(error: string, context?: Record<string, unknown>) {
  return {
    ok: false,
    error: formatError(error, context),
  };
}

/**
 * Create success result
 */
export function successResult(value: unknown) {
  return {
    ok: true,
    value,
  };
}
EOF
```

### 3.2 Compilar de nuevo

```bash
npx tsc -p tsconfig.runtime.json

# Verificar que incluye las funciones
grep "function formatError" generated/runtime.js
grep "function safeGetString" generated/runtime.js
```

---

## Fase 4: Actualizar package.json Scripts (15 min)

### 4.1 Modificar scripts en `packages/pt-runtime/package.json`

```bash
cat > /tmp/add-scripts.json << 'EOF'
{
  "build:runtime": "tsc -p tsconfig.runtime.json",
  "build:runtime:watch": "tsc -p tsconfig.runtime.json --watch",
  "build:lib": "tsc",
  "build": "npm run build:lib && npm run build:runtime",
  "typecheck": "tsc --noEmit && tsc -p tsconfig.runtime.json --noEmit",
  "generate": "npm run build:runtime && bun run src/index.ts generate",
  "deploy": "npm run build:runtime && bun run src/index.ts deploy",
  "dev": "npm run build:runtime:watch"
}
EOF

# Actualizar el package.json manualmente o con jq:
jq '.scripts |= . + (input)' packages/pt-runtime/package.json /tmp/add-scripts.json > /tmp/pkg.json && mv /tmp/pkg.json packages/pt-runtime/package.json
```

### 4.2 Verificar

```bash
cd packages/pt-runtime
npm run build:runtime   # Should compile to ES5
npm run typecheck       # Should pass type checking
```

---

## Fase 5: Primer Test Completo (30 min)

### 5.1 Compilar Todo

```bash
cd /Users/andresgaibor/code/javascript/cisco-auto

# Compilar library (dist/)
npm run build:lib

# Compilar runtime (generated/runtime.js)
npm run -w packages/pt-runtime run build:runtime

# Verificar ambos existen
ls -lh packages/pt-runtime/dist/
ls -lh packages/pt-runtime/generated/
```

### 5.2 Inspeccionar Output

```bash
# Ver primeras líneas del runtime.js compilado
head -30 packages/pt-runtime/generated/runtime.js

# Contar líneas
wc -l packages/pt-runtime/generated/runtime.js

# Verificar que es ES5 (sin arrow functions, const, etc.)
grep -E "=>|const |import |export " packages/pt-runtime/generated/runtime.js | wc -l
# Should be 0 or near 0
```

### 5.3 Copiar a PT Dev

```bash
# Crear directorio PT dev si no existe
mkdir -p ~/pt-dev

# Copiar runtime compilado
cp packages/pt-runtime/generated/runtime.js ~/pt-dev/

# Verificar
cat ~/pt-dev/runtime.js | head -20
```

---

## Fase 6: Siguientes Pasos (Plan)

### Próximas Migraciones (siguiendo el mismo patrón):

1. **Session Management** (1 hora)
   - Migrar: `src/templates/session-template.ts` → `src/runtime/session.ts`
   - Crear tipos para session state
   - Compilar y validar

2. **Device Handlers** (2 horas)
   - Migrar: `src/templates/device-handlers-template.ts` → `src/runtime/handlers/device.ts`
   - Crear `AddDevicePayload`, `RemoveDevicePayload` tipos
   - Compilar y validar

3. **Other Handlers** (3 horas)
   - Link handlers
   - Config handlers
   - Inspect handlers
   - Canvas handlers

4. **Main Dispatcher** (1 hora)
   - Crear `src/runtime/handlers/index.ts` que orquesta todos
   - Actualizar `src/runtime/index.ts` para usar dispatcher
   - Compilar y test

5. **Cleanup** (1 hora)
   - Eliminar archivos template viejos
   - Eliminar `runtime-generator.ts`
   - Actualizar documentación

---

## 📊 Checklist Fase 0-1

```bash
# ✅ Tarea 1: Crear rama
git checkout -b refactor/typescript-runtime

# ✅ Tarea 2: Crear estructura
mkdir -p packages/pt-runtime/src/runtime/{handlers,types}

# ✅ Tarea 3: Crear tsconfig.runtime.json
# (Ver script arriba)

# ✅ Tarea 4: Crear types.ts
# (Ver script arriba)

# ✅ Tarea 5: Crear index.ts basic
# (Ver script arriba)

# ✅ Tarea 6: Crear constants.ts
# (Ver script arriba)

# ✅ Tarea 7: Crear helpers.ts
# (Ver script arriba)

# ✅ Tarea 8: Actualizar package.json scripts
# (Ver script arriba)

# ✅ Tarea 9: Compilar
cd packages/pt-runtime && npx tsc -p tsconfig.runtime.json

# ✅ Tarea 10: Validar ES5
head -50 generated/runtime.js

# ✅ Tarea 11: Type check
npx tsc -p tsconfig.runtime.json --noEmit

# ✅ Tarea 12: Commit
git add .
git commit -m "refactor: setup typescript runtime structure"
git push
```

---

## 🎯 Estimación de Tiempo

| Fase | Tarea | Tiempo |
|------|-------|--------|
| 0 | Preparación | 30 min |
| 1 | Tipos y Entry Point | 30 min |
| 2 | Constants + Test | 1 hora |
| 3 | Helpers | 45 min |
| 4 | Scripts + Validación | 15 min |
| 5 | Test Completo | 30 min |
| **TOTAL FASE INICIAL** | **→ POC Funcional** | **~3 horas** |
| 6 | Migraciones restantes | 7-10 horas |
| 7 | Cleanup | 1 hora |
| **TOTAL REFACTOR** | **→ Completo** | **11-14 horas** |

---

## ⚠️ Posibles Problemas & Soluciones

### Problema: "Cannot find module X"
```bash
# Solución: Usar rutas correctas en imports
# ❌ import { handleDevice } from "./handlers";
# ✅ import { handleDevice } from "./handlers/device.js";
```

### Problema: "ES6 syntax in output"
```bash
# Verificar tsconfig.runtime.json tiene:
# "target": "ES5",
# "lib": ["ES5"],
# "module": "commonjs"
```

### Problema: "Works in TS but not in PT"
```bash
# Validar que runtime.js es ES5 puro:
grep -E "=>|const |import |export " generated/runtime.js
# Si hay resultado, revisar qué falta compilar a ES5
```

---

## 📚 Referencias

- Documentación completa: `/RUNTIME_REFACTOR_ANALYSIS.md`
- Arquitectura visual: `/COMPARISON_VISUAL.md`
- Ejemplo POC: `/POC_COMPLETE_STRUCTURE.md`
