# PT Runtime - Fuente de Verdad Tipada

## 🎯 Fuente de Verdad Única

**`verified-models.ts`** es la **ÚNICA fuente de verdad** para modelos de dispositivos en Packet Tracer 9.0.0.

### Principio Fundamental

> **Los errores de modelos se detectan en compile-time con TypeScript, NO en runtime en PT.**

---

## 📁 Estructura

```
packages/pt-runtime/src/
├── verified-models.ts          # ✅ FUENTE DE VERDAD - Modelos verificados
├── scripts/
│   └── generate-model-map.ts   # Genera modelo map desde verified-models.ts
└── templates/
    ├── helpers-template.ts     # Usa modelo map generado
    └── generated-model-map.ts  # ⚠️ AUTO-GENERADO - No editar
```

---

## 🔧 Cómo Agregar un Nuevo Modelo

### Paso 1: Verificar en PT

Primero, verificar que el modelo existe en Packet Tracer:

```bash
cd packages/pt-runtime
bun run src/scripts/test-model.ts <modelo>
```

### Paso 2: Agregar a verified-models.ts

Editar `verified-models.ts` y agregar el modelo en la categoría correspondiente:

```typescript
export const VERIFIED_MODELS = {
  switches: {
    // ... modelos existentes
    '2960-24TC': { model: '2960-24TC', type: PTDeviceType.Switch, verified: true },
  } as const,
} as const;
```

### Paso 3: Agregar Aliases (opcional)

Si el modelo tiene aliases comunes:

```typescript
export const MODEL_ALIASES: Record<string, string> = {
  // ... aliases existentes
  '2960-tc': '2960-24TC',
} as const;
```

### Paso 4: Regenerar

```bash
cd packages/pt-runtime
bun run generate
cp ../generated/runtime.js /Users/andresgaibor/pt-dev/runtime.js
```

### Paso 5: Validar en Compile-Time

TypeScript validará automáticamente que el modelo es correcto:

```typescript
import { getVerifiedModel } from './verified-models';

// ✅ Funciona - modelo verificado
const info = getVerifiedModel('2960-24TC');

// ❌ ERROR en compile-time - modelo no verificado
const invalid = getVerifiedModel('2960-24TC-L');  // TypeScript error!
```

---

## 📝 Ejemplos de Uso

### Uso en Código TypeScript

```typescript
import { 
  getVerifiedModel, 
  isVerifiedModel, 
  getDeviceType,
  PTDeviceType 
} from './verified-models';

// Obtener información de un modelo
const info = getVerifiedModel('2960-24TT');
if (info) {
  console.log(`Model: ${info.model}, Type: ${info.type}`);
}

// Validar si un modelo está verificado
if (isVerifiedModel('2960')) {
  // TypeScript sabe que '2960' es válido aquí
  const type = getDeviceType('2960');
}

// Manejar error si el modelo no está verificado
try {
  const type = getDeviceType('modelo-invalido');
} catch (error) {
  console.error('Modelo no verificado:', error.message);
}
```

### Uso en Runtime de PT (ES5)

El script `generate-model-map.ts` genera automáticamente código ES5 compatible con PT:

```javascript
// generated-model-map.ts (auto-generado)
var PT_MODEL_MAP = {
  "2960": "2960-24TT",
  "2960-24tt": "2960-24TT",
  // ...
};

var PT_DEVICE_TYPE_MAP = {
  "2960-24tt": 1,
  "2960": 1,
  // ...
};
```

---

## ⚠️ Errores Comunes

### 1. Agregar Modelo Sin Verificar

```typescript
// ❌ INCORRECTO - Agregar modelo del catálogo sin verificar
switches: {
  '2960-24TT-L': { model: '2960-24TT-L', type: PTDeviceType.Switch, verified: true },
}

// ✅ CORRECTO - Solo modelos verificados empíricamente
switches: {
  '2960-24TT': { model: '2960-24TT', type: PTDeviceType.Switch, verified: true },
}
```

### 2. Editar Archivo Generado

```typescript
// ❌ INCORRECTO - Editar generated-model-map.ts
// Este archivo se regenera automáticamente

// ✅ CORRECTO - Editar verified-models.ts y regenerar
bun run generate
```

### 3. No Validar en Compile-Time

```typescript
// ❌ INCORRECTO - Usar string directamente sin validar
const model = "2960-24TT-L";  // Puede no existir

// ✅ CORRECTO - Usar función de validación
const info = getVerifiedModel('2960-24TT');  // TypeScript valida
```

---

## 🧪 Testing

### Test de Modelos Individuales

```bash
# Testear si un modelo funciona en PT
bun run src/scripts/test-model.ts 2960-24TT
```

### Test Exhaustivo

```bash
# Ejecutar todos los tests con modelos verificados
bun run exhaustive-pt-test.ts
```

---

## 📊 Modelos Verificados Actuales

### Routers (10)
- 1841, 1941, 2811, 2901, 2911, 4331
- 2620XM, 2621XM, 819, 829

### Switches (3)
- 2950-24, 2950T-24, 2960-24TT

### Wireless (1)
- AccessPoint-PT

### End Devices (4)
- PC-PT, Laptop-PT, Server-PT, Printer-PT

### Cloud (1)
- Cloud-PT

**Total: 19 modelos verificados**

---

## 🔗 Referencias

- [verified-models.ts](./verified-models.ts) - Fuente de verdad completa
- [generate-model-map.ts](./scripts/generate-model-map.ts) - Script de generación
- [PT_CONTROL_MODELS.md](../../docs/PT_CONTROL_MODELS.md) - Documentación de modelos

---

## 🎯 Beneficios de Esta Arquitectura

| Antes | Ahora |
|-------|-------|
| Errores en runtime (PT) | Errores en compile-time (TypeScript) |
| Múltiples fuentes de verdad | Única fuente de verdad |
| Modelos hardcodeados | Modelos tipados y validados |
| Difícil de mantener | Fácil de extender |
| Sin documentación | Documentación automática |

---

*Última actualización: 2026-04-02*
