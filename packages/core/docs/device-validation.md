# Validación de Dispositivos - Referencia Rápida

## Problema Resuelto ✅

**Antes**: `pt-runtime` aceptaba modelos inválidos sin validar
**Ahora**: Catálogo único de verdad en `packages/core/src/catalog/` con validación estricta

---

## Uso

### Agregar dispositivo válido
```typescript
handleAddDevice({
  type: 'addDevice',
  model: '1941',  // ✅ Válido - del catálogo
  name: 'Router1'
}, deps);
```

### Agregar dispositivo inválido
```typescript
handleAddDevice({
  type: 'addDevice',
  model: 'MODELO-INEXISTENTE',  // ❌ Inválido
  name: 'BadRouter'
}, deps);

// Resultado: { ok: false, error: 'Invalid device model...', code: 'INVALID_INPUT' }
```

---

## Modelos Válidos (por tipo)

### Routers
- `1841`, `1941`, `2811`, `2901`, `2911`
- `ISR4321`, `ISR4331`, `C8200`
- Alias: `router` → `1941`

### Switches  
- `2950-24`, `2950T-24`
- `2960-24TT-L`, `2960-24TC-L`
- `3560-24PS`, `3650-24PS`
- Alias: `switch` → `2960-24TT-L`

### End Devices
- PC: `PC-PT` (alias: `pc`)
- Server: `Server-PT` (alias: `server`)
- Laptop: `Laptop-PT` (alias: `laptop`)
- Cloud: `Cloud-PT` (alias: `cloud`)
- Printer: `Printer-PT` (alias: `printer`)
- AP: `AccessPoint-PT` (alias: `ap`)

---

## Archivos Clave

| Archivo | Propósito |
|---------|-----------|
| `packages/core/src/catalog/` | **Fuente única de verdad** - Todos los modelos |
| `packages/pt-runtime/src/value-objects/validated-models.ts` | **AUTO-GENERADO** - Mapas PT validados |
| `packages/pt-runtime/src/utils/helpers.ts` | Validación en `resolveModel()` |
| `packages/pt-runtime/src/handlers/device.ts` | Manejo de errores en `handleAddDevice()` |
| `packages/pt-runtime/src/scripts/generate-validated-model-map.ts` | Script para regenerar mapas |

---

## Regenerar Mapas (si el catálogo cambia)

```bash
bun packages/pt-runtime/src/scripts/generate-validated-model-map.ts
```

Esto:
1. Lee `packages/core/src/catalog/*.ts`
2. Extrae 64+ dispositivos y 74 alias
3. Regenera `packages/pt-runtime/src/value-objects/validated-models.ts`
4. Valida que NO hay modelos huérfanos

---

## Pruebas

```bash
# Ejecutar todas las pruebas de validación
bun test packages/pt-runtime/src/__tests__/device-catalog-validation.test.ts

# Resultado esperado: 21 pass, 0 fail
```

Cubre:
- ✅ ADD dispositivos válidos
- ✅ ADD rechaza inválidos  
- ✅ LIST dispositivos
- ✅ VERIFY propiedades
- ✅ REMOVE dispositivos
- ✅ RENAME dispositivos
- ✅ Integración con catálogo core

---

## Flujo de Validación

```
Usuario: handleAddDevice({ model: '2960' })
    ↓
resolveModel('2960')
    ↓
validatePTModel('2960')  ← Consulta PT_MODEL_MAP
    ↓
¿Existe en catálogo? 
    ✅ SÍ → '2960-24TT-L' (modelo exacto)
    ❌ NO → throw Error
    ↓
Dispositivo creado con modelo validado
```

---

## Garantías

| Garantía | Detalles |
|----------|----------|
| **Una fuente de verdad** | `packages/core/src/catalog/` |
| **Validación temprana** | Falla ANTES de intentar crear |
| **Código roto si inválido** | `resolveModel()` lanza Error |
| **Pruebas al 100%** | 21 tests, todos passing |
| **Sincronización automática** | Script regenera desde catálogo |
| **Backcompat** | Aliases comunes funcionan (`pc`, `server`, `router`) |

---

## Errores Comunes

### ❌ Modelo rechazado
```
Error: Invalid device model: "2960-24TT". 
Check packages/core/src/catalog/ for valid models.
```

**Solución**: Usar modelo exacto `2960-24TT-L` o alias `2960`

### ❌ Catálogo desincronizado
Si agregaste modelo nuevo al catálogo y no funciona:

```bash
bun packages/pt-runtime/src/scripts/generate-validated-model-map.ts
```

---

## Para Desarrolladores

1. **Agregar modelo al catálogo**:
   - Editar `packages/core/src/catalog/<tipo>.ts`
   - Agregar entrada `DeviceCatalogEntry`
   - Regenerar: `bun scripts/generate-validated-model-map.ts`

2. **Agregar alias**:
   - Editar `PT_ALIASES` en `generate-validated-model-map.ts`
   - Regenerar

3. **Verificar validación**:
   - Leer `packages/pt-runtime/src/value-objects/validated-models.ts`
   - Ver mapas `PT_MODEL_MAP` y `PT_DEVICE_TYPE_MAP`

---

**Estado**: ✅ Implementado y probado
**Última actualización**: 2026-04-02
**Tests**: 21/21 passing
