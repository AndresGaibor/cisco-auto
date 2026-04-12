# Runtime TypeScript Refactoring Analysis

## 📋 Estado Actual del Sistema

### Arquitectura Actual (Template-Based)
```
TypeScript Plantillas → String Generation → runtime.js (ES5)
```

**Flujo actual:**
1. `compose.ts` llama a `generateRuntimeCode()`
2. `runtime-generator.ts` orquesta múltiples plantillas:
   - `constants-template.ts` 
   - `helpers-template.ts`
   - `session-template.ts`
   - `device-handlers-template.ts`
   - `ios-config-handlers-template.ts`
   - `ios-exec-handlers-template.ts`
   - `inspect-handlers-template.ts`
   - `canvas-handlers-template.ts`
   - `dispatcher-template.ts`
3. Cada plantilla retorna un string de JavaScript
4. Los strings se concatenan en un solo archivo: `packages/generated/runtime.js`
5. Archivo se escribe sin compilación TypeScript

**Ubicaciones clave:**
- Plantillas: `packages/pt-runtime/src/templates/`
- Generador: `packages/pt-runtime/src/runtime-generator.ts`
- Salida: `packages/generated/runtime.js` (1773+ líneas)
- Compilación: TypeScript → dist (con source maps), luego genera strings JS

---

## 🔴 Problemas Identificados

### 1. **Falta de Tipado en Código Generado**
- El `runtime.js` es puro JavaScript sin tipos TypeScript
- No hay intellisense ni validación en tiempo de compilación del código generado
- Bugs en el código generado se descubren solo en ejecución en PT

### 2. **Dificultad de Mantenimiento**
- Plantillas son funciones que retornan strings (difícil de leer/editar)
- Cambios requieren actualizar dos lugares: template + lógica
- No hay refactor tools de TypeScript disponibles

### 3. **Validación Manual**
- `runtime-validator.ts` hace smoke tests básicos del código generado
- No se valida tipos, interfaz de handlers, etc.
- Falta linting en el código generado

### 4. **Compilación Compleja**
- Dos fases: TypeScript → dist (con plantillas), luego genera strings
- No es claro qué está siendo compilado dónde
- El `tsconfig.json` compila a ES2022, pero PT necesita ES5 compatible

### 5. **Sin Bundling**
- `runtime.js` es solo concatenación de strings
- No hay tree-shaking, minificación, u optimización
- Las importaciones en plantillas no son módulos reales

---

## ✅ Opción A: Source-First TypeScript (RECOMENDADO)

### Descripción
Convertir el runtime de **plantillas generadoras de strings** a **código fuente TypeScript real** que se compila a ES5.

### Estructura Propuesta

```
packages/pt-runtime/
├── src/
│   ├── runtime/                    # ← NUEVO: Código fuente del runtime
│   │   ├── index.ts               # Entry point (main dispatcher)
│   │   ├── constants.ts           # Constantes (antes en template)
│   │   ├── helpers.ts             # Funciones helper (antes en template)
│   │   ├── session.ts             # Session management (antes en template)
│   │   ├── types.ts               # Tipos reutilizables
│   │   └── handlers/              # Handlers reales
│   │       ├── device.ts
│   │       ├── link.ts
│   │       ├── config.ts
│   │       └── ...
│   │
│   ├── compiler.ts                # ← NUEVO: Orquestador de compilación
│   ├── templates/                 # ← DEPRECAR: Solo si es necesario
│   ├── handlers/                  # ← MOVER: Código de handlers (reutilizable)
│   └── ...
│
├── dist/
│   └── (compilado con tipos: .d.ts, .js, .map)
│
├── generated/
│   └── runtime.js                 # ← ES5 puro, sin tipos, bundled
│
├── tsconfig.json                  # ← Actualizar para ES5 + bundling
├── tsconfig.runtime.json          # ← NUEVO: Config para compilar runtime
└── package.json
```

### Flujo de Compilación

```
TypeScript Runtime Code
        ↓
   [tsc/esbuild]
        ↓
   runtime.js (ES5, compatible PT)
        ↓
   [Copy to generated/]
```

### Ventajas

✅ **Tipado completo**: Todo el código tiene tipos TypeScript en desarrollo  
✅ **Linting real**: ESLint funciona en todo el código  
✅ **Refactoring seguro**: Rename, move, delete funcionan correctamente  
✅ **Validación en compilación**: Errores se detectan antes de generar  
✅ **Mantenibilidad**: Código es más legible y estructurado  
✅ **Performance**: Bundler puede optimizar el código  
✅ **Source maps**: Debug más fácil (si necesitas)

### Pasos de Implementación

#### Paso 1: Crear estructura de runtime TypeScript
```bash
mkdir -p packages/pt-runtime/src/runtime/{handlers,types}
```

#### Paso 2: Convertir plantillas a módulos TypeScript reales
- `constants-template.ts` → `runtime/constants.ts`
- `helpers-template.ts` → `runtime/helpers.ts`
- etc.

#### Paso 3: Crear `runtime/index.ts` que orquesta todo
```typescript
// src/runtime/index.ts
import * as constants from './constants';
import * as helpers from './helpers';
import * as session from './session';
// ... más imports

// Global scope variables para PT
declare const ipc: any;
declare const dprint: any;

const CABLE_TYPES = constants.CABLE_TYPES;
const DEVICE_TYPES = constants.DEVICE_TYPES;
// ... más variables globales

// Handler dispatcher
function handleCommand(payload: any): any {
  // ... implementación
}

// Export como función global para PT
(globalThis as any).runtime = handleCommand;
```

#### Paso 4: Crear `tsconfig.runtime.json`
```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "target": "ES5",              // ← PT compatible
    "module": "commonjs",          // ← No ESM
    "lib": ["ES5"],                // ← Mínimo
    "outDir": "./generated",
    "declaration": false,          // ← Sin .d.ts
    "sourceMap": false,            // ← Sin maps (opcional)
    "removeComments": true,        // ← Limpio
    "strict": true                 // ← Mantener tipado
  },
  "include": ["src/runtime/**/*.ts"]
}
```

#### Paso 5: Actualizar scripts en `package.json`
```json
{
  "scripts": {
    "build:runtime": "tsc -p tsconfig.runtime.json",
    "build:lib": "tsc",
    "generate": "bun run src/index.ts generate",
    "deploy": "npm run build:runtime && bun run src/index.ts deploy"
  }
}
```

#### Paso 6: Actualizar `index.ts` para leer archivo compilado
```typescript
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export function renderRuntimeSource(): string {
  // Leer el archivo compilado en lugar de generar strings
  const runtimePath = resolve(import.meta.dirname, "../generated/runtime.js");
  return readFileSync(runtimePath, "utf-8");
}
```

#### Paso 7: Validar y copiar
```bash
# Compilar runtime a ES5
npm run build:runtime

# Generar archivos finales y desplegar
npm run generate
npm run deploy
```

---

## ✨ Opción B: Hybrid (Alternativa)

### Descripción
Mantener plantillas pero usarlas como **generadores de módulos TypeScript**, no strings.

### Diferencia
- Las plantillas generan archivos `.ts` en lugar de strings
- Se compilan normalmente con TypeScript
- Se bundlean en un archivo final

### Ventajas
- Transición menos drástica desde el sistema actual
- Plantillas todavía útiles para generar código variable

### Desventajas
- Más complejidad (genera archivos intermedios)
- Plantillas siguen siendo un nivel de indirección

---

## 🔧 Configuración ES5 para PT Compatibility

### TypeScript → ES5 Sin Dependencias
```json
{
  "compilerOptions": {
    "target": "ES5",
    "lib": ["ES5"],
    "module": "commonjs",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": false,
    "sourceMap": false,
    "removeComments": true,
    "outDir": "./generated"
  }
}
```

### Restricciones PT Script Engine
- ✅ Soporta ES5
- ✅ Soporta `var`, funciones, objetos
- ❌ NO soporta clases (convertir a function prototypes o factory functions)
- ❌ NO soporta módulos/imports
- ❌ NO soporta async/await
- ❌ NO soporta arrow functions (convertir a function declarations)
- ❌ NO soporta let/const (solo var)
- ❌ NO soporta template literals (usar + concatenation)

### Compiler Options para ES5 PT
```typescript
// Evitar en runtime.ts
❌ class Handler { }        // Usar: function Handler() {}
❌ () => { }                // Usar: function() { }
❌ let/const               // Usar: var
❌ `template ${lit}`       // Usar: "template " + lit
❌ import/export           // Usar: global variables
❌ async/await             // Usar: callbacks
❌ destructuring           // Usar: manual assignment
```

---

## 📦 Bundling con Bun

### Alternativa: Usar `bun build`
```bash
bun build ./src/runtime/index.ts \
  --outfile ./packages/generated/runtime.js \
  --target=browser \
  --format=iife
```

### Ventajas Bun
- Más rápido que tsc + esbuild
- Soporte nativo TypeScript
- Mejor minificación
- Más integrado con el proyecto

---

## 📋 Checklist de Migración

### Fase 1: Preparación (1-2 horas)
- [ ] Crear estructura `src/runtime/`
- [ ] Crear `tsconfig.runtime.json`
- [ ] Backup plantillas existentes (git branch)

### Fase 2: Conversión (2-4 horas)
- [ ] Convertir `constants-template.ts` → `runtime/constants.ts`
- [ ] Convertir `helpers-template.ts` → `runtime/helpers.ts`
- [ ] Convertir `session-template.ts` → `runtime/session.ts`
- [ ] Convertir handlers a módulos TypeScript
- [ ] Crear `runtime/index.ts` con orchestración

### Fase 3: Compilación (1-2 horas)
- [ ] Configurar compilación tsc/bun
- [ ] Actualizar `index.ts` para usar archivo compilado
- [ ] Actualizar scripts en `package.json`
- [ ] Validar que `runtime.js` sea ES5 puro

### Fase 4: Testing (1-2 horas)
- [ ] Verificar que PT carga `runtime.js`
- [ ] Pruebas de handlers
- [ ] Comparar rendimiento con versión anterior
- [ ] Cleanup de plantillas (si aplica)

**Tiempo total estimado: 5-10 horas**

---

## 🎯 Recomendación Final

**USE OPCIÓN A (Source-First TypeScript)**

### Razones:
1. **Elimina completamente la complejidad de plantillas**
2. **Tipado en tiempo de desarrollo**
3. **Mejor mantenibilidad a largo plazo**
4. **Compatible con PT (ES5 compilation)**
5. **Permite refactoring seguro con TypeScript tools**
6. **Setup más simple** (una compilación, no dos fases)

### Next Steps Recomendados:
1. ✅ Crear rama: `git checkout -b refactor/typescript-runtime`
2. ✅ Implementar estructura propuesta
3. ✅ Migrar una plantilla como POC (ej: constants)
4. ✅ Validar compilación y test en PT
5. ✅ Migrar resto de plantillas
6. ✅ Eliminar código de template generators
7. ✅ PR review y merge

---

## 📚 Referencias

- PT Script Engine limitations: No classes, no ES6+, vars only, no async
- TypeScript ES5 target: https://www.typescriptlang.org/docs/handbook/compiler-options.html
- Bun build: https://bun.sh/docs/build
