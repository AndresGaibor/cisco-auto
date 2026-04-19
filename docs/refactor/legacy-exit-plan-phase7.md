# Fase 7: Plan de Salida de Legacy

## Inventario de Deuda Residual

### Dual Terminal (V1 en pt/terminal y V2 en terminal/)
Status: Mantener V2, deprecar V1

```
Location V1: packages/pt-runtime/src/pt/terminal/
Location V2: packages/pt-runtime/src/terminal/

Decisión: Mantener V2 (terminal/) como estándar
          Deprecar V1 (pt/terminal/) con @deprecated marker
```

**Acciones:**
- V1 marcar con `@deprecated` en exports
- V2 es el default para nuevos desarrollos
- Documentar migración en `docs/migration/terminal-v1-to-v2.md`

### ModularRuntimeGenerator
Status: Mantener pero no es default

```
Location: packages/pt-runtime/src/build/

Decisión: Mantener código pero usar InlineRuntimeGenerator como default
```

**Acciones:**
- Mantener para backwards compatibility
- No usar como default en builds nuevos
- Documentar como deprecated en el código

### Aliases Legacy (renderRuntimeSource, renderMainSource)
Status: Documentar como deprecated

```
Aliases actuales:
  - renderRuntimeSource → genera runtime.js inline
  - renderMainSource → genera main.js

Decisión: Documentar como deprecated, mantener funcionalidad
```

**Acciones:**
- Agregar @deprecated en JSDoc
- Mantener por backwards compat
- Crear redirección a nuevos nombres

### Terminal V1 Exports en pt-runtime
Status: Marcar como @deprecated

```
Export actual en packages/pt-runtime/src/index.ts:
  - Terminal class (V1)
  - TerminalResult (V1)
  - execute() (V1)

Decisión: Mantener exports pero marcar como legacy
```

---

## Tabla de Deuda Residual

| Ítem | Tipo | Impacto | Acción | Fecha |
|------|------|--------|--------|-------|
| Terminal V1 (pt/terminal/) | Deprecación | Bajo | Mantener, no usar | Q2 2026 |
| ModularRuntimeGenerator | Deprecación | Bajo | Mantener, no default | Q2 2026 |
| renderRuntimeSource alias | Deprecación | Bajo | Documentar | Q2 2026 |
| Terminal exports @deprecated | Deprecación | Bajo | Marker en código | Q2 2026 |
| Dual command queue (legacy/) | Legacy | Medio | Migrar a commands/ | Q3 2026 |
| pt/handlers legacy | Legacy | Medio | Eliminar si no hay uso | Q3 2026 |

---

## Criterios de Eliminación

### Criterio 1: Sin Consumidores Activos → Eliminar
Si el código no tiene consumidores en el codebase, eliminar directamente.

```bash
# Análisis de consumidores:
grep -r "from.*pt/terminal" --include="*.ts" packages/
grep -r "renderRuntimeSource" --include="*.ts" packages/

# Resultado: 0 consumidores → eliminar
```

### Criterio 2: Delegando al Nuevo → Deprecar + Aislar
Si hay implementación nueva que lo reemplaza, deprecar y aislar.

```typescript
// Marcado como deprecated
/**
 * @deprecated Use TerminalV2 instead.
 * Este módulo será eliminado en Q3 2026.
 */
export class Terminal { /* ... */ }

// Aislamiento: Mover a legacy/
export { Terminal } from '../legacy/terminal';
```

### Criterio 3: Introduce Riesgo → Bloquear Por Defecto
Si el código legacy introduce riesgo instability, bloquear por defecto.

```typescript
// En build config:
const isLegacy = process.env.USE_LEGACY === 'true';
if (isLegacy) {
  console.warn('⚠️ LEGACY MODE ENABLED - No soportado');
} else {
  // Default: no legacy
}
```

---

## Plan de Eliminación por Fase

### Fase 7.1 (Inmediato)
- [x] Identificar todo código legacy
- [x] Marcar con @deprecated
- [x] Documentar en este archivo

### Fase 7.2 (Q2 2026)
- [ ] Mover Terminal V1 a legacy/terminal/
- [ ] Eliminar aliases no usados
- [ ] Actualizar exports con deprecation markers

### Fase 7.3 (Q3 2026)
- [ ] Review de consumidores restantes
- [ ] Migrar a新的 implementaciones
- [ ] Eliminar código sin consumidores

### Fase 7.4 (Q4 2026)
- [ ] cleanup final de legacy/
- [ ]确认 sistema estable
- [ ] Documentar lecciones aprendidas

---

## Cómo Verificar Deuda Residual

### Checklist de Deuda

```bash
# 1. Verificar Exports deprecated
grep -r "@deprecated" packages/pt-runtime/src/index.ts

# 2. Verificar consumers activos
code-index_search_code_advanced pattern="from.*legacy/terminal"

# 3. Verificar tests legacy
code-index_search_code_advanced pattern="describe.*legacy.*terminal"
```

### Métricas de Progreso

| Métrica | Target Q2 | Target Q3 | Target Q4 |
|---------|----------|-----------|-----------|----------|
| % deprecated marcado | 100% | 100% | 100% |
| % código isolate | 50% | 80% | 100% |
| Consumers activos | <5 | <2 | 0 |

---

## Rollback Plan

Si la eliminación de legacy causa problemas:

```bash
# Rollback individual
git checkout HEAD~1 -- packages/pt-runtime/src/pt/terminal/

# Rollback total
git checkout HEAD~1 -- .
```

**Criterios de rollback:**
- >10% de tests fallando
- smoke test falla
- regression test falla