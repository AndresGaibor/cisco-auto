# Fase 7: Reglas de Cambio Futuro

## Reglas para Cambios

### Regla A: Nueva Capacidad = Primitive | Omni Adapter | Workflow

Toda nueva capacidad debe entrar por una de estas tres vías.

```
Vía Primitive (pt-runtime):
  ├── Ejecución: runtime.js
  ├── Acceso: directo a PT
  └── Para: operaciones atómicas

Vía Omni Adapter (omni/):
  ├── Wrapper alrededor de primitive
  ├── Manejo de errores standarizado
  ├── Logging/evidence automático
  └── Para: operaciones con retry, fallback

Vía Workflow (pt-control):
  ├── Orquestación de múltiples pasos
  ├── Planning/decisiones
  ├── Verificación compuesta
  └── Para: operaciones complejas
```

**Ejemplo de decisión:**

```typescript
// caso: nueva capacidad "device:reboot"
// pregunta: qué vía usar?

// Si es operación atómica (reboot directo)
// → Primitive en runtime

// Si es operación con retry, logging
// → Omni adapter

// Si es operación multi-step (reboot + wait + verify)
// → Workflow
```

### Regla B: NO Crear Handler Runtime Alto por "Rapidez"

Está prohibido crear lógica alta en runtime por velocidad.

```typescript
// ❌ INVÁLIDO - Lógica alta en runtime por "rapidez"
runtime.handleVlanConfig = async (payload) => {
  // Esto parece simple pero tiene múltiples pasos:
  // 1. Verificar existe switch
  // 2. Crear VLAN
  // 3. Asignar puertos
  // 4. Verificar resultado
  // 5. Retry si falla
  // → VIOLA Regla B
};

// ✅ VÁLIDO - Solo handler baixo
runtime.handleVlanCreate = async (payload) => {
  // Solo creación directa
};

// La lógica alta va a workflow en pt-control
```

### Regla C: Hack Nuevo = Capability Documentada en Omni

Todo hack o bypass debe documentarse como capability.

```typescript
// ❌ INVÁLIDO - Hack sin documentar
function workaroundBoothy() {
  // Magic que funciona
}

# ✅ VÁLIDO - Capability documentada
const capabilityDeviceSkipBoot = {
  name: 'device:skipBoot',
  contract: {
    device: '<string>'  // Required
  },
  supported: true,
  description: 'Fuerza skip boot para evitar tiempo de espera',
  confidence: 70,
  risks: ['estado inconsistente si no se limpia']
};
```

### Regla D: Cambio Kernel/Build = Validadores + Baseline Completa

Cambios al kernel o build requieren validación completa.

```bash
# Cambio(kernel):
# 1. Validar ES5
bun run pt:validate-es5

# 2. Validar PT-safe  
bun run pt:validate-pt

# 3. Build
bun run pt:build

# 4. Baseline completa
bun run pt omni regression-smoke
bun run pt omni terminal-core
bun run pt omni device-basic
bun run pt omni link-basic
bun run pt omni workflow-basic
bun run pt omni omni-safe
```

### Regla E: Nueva Verificación = Integrar con Omni + Evidence Ledger

Toda nueva verificación debe integrarse al sistema de evidence.

```typescript
// ❌ INVÁLIDO - Verificación fuera de omni
function verificarTopologia() {
  const devices = ipc.cli('show devices');
  if (!devices.ok) throw new Error('Falla');
}

// ✅ VÁLIDO - Nueva verificación integrada
const verificationTopologyCheck = {
  name: 'verification:topology',
  execute: async (context) => {
    const devices = await omni.execute('device:list');
    return {
      valid: devices.length > 0,
      evidence: { deviceCount: devices.length }
    };
  },
  integrateWithLedger: true  // <-- flag de integración
};
```

### Regla F: Todo Cambio = Impacto Arquitectónico + Suites + Riesgo + Rollback

Todo cambio debe evaluarse en estas dimensiones.

```
Evaluación de cambio:

1. Impacto Arquitectónico:
   ├── Afecta runtime? → Verificar pt-runtime docs
   ├── Afecta omni?    → Verificar capability registry
   └── Afecta CLI?     → Verificar commands/

2. Suites Afectadas:
   ├── regression-smoke
   ├── terminal-core  
   ├── device-basic
   ├── link-basic
   ├── workflow-basic
   └── omni-safe

3. Análisis de Riesgo:
   ├── Riesgo de regression: ALTO/MEDIO/BAJO
   ├── Riesgo de rotura: ALTO/MEDIO/BAJO
   └── Plan de rollback: requerido

4. Rollback Plan:
   ├── Commit rollback
   ├── Command rollback
   └── Evidence rollback
```

---

## Proceso de Release

### Fase 1: Validar con Baseline Completa

```bash
# Ejecutar baseline completa
bun run pt omni regression-smoke
bun run pt omni terminal-core
bun run pt omni device-basic
bun run pt omni link-basic
bun run pt omni workflow-basic
bun run pt omni omni-safe

# Resultado esperado: 100% pass en todas
```

### Fase 2: Verificar Regressions

```bash
# Comparar con baseline guardado
bun run pt omni compare-baseline

# Verificar:
# - Ninguna capability supported rota
# - Ninguna capability nueva broke otra
# - Flakiness no incrementó >10%
```

### Fase 3: Review de Quality Gates

```
Quality Gates:

[ ] Baseline completa = 100% pass
[ ] Ninguna regression bloqueante
[ ] Evidence ledger completo  
[ ] Support matrix actualizado
[ ] Documentación actualizada
[ ] Tests actualizados
[ ] Código pasa lint
[ ] Código pasa typecheck
```

### Fase 4: Update de Support Matrix

```bash
# Actualizar support matrix
# Location: docs/refactor/support-matrix.md

# Formato:
| Capability | Status | PT Version | Confidence | Notes |
|------------|--------|------------|------------|--------|
| device:add | stable | 8.0+ | 95% | |
| link:add | stable | 8.0+ | 90% | |
| device:skipBoot | experimental | 8.1+ | 70% | nueva en esta release |
```

---

## Checklist de Cambio

### Pre-Cambio

```bash
[ ] Analizar impacto arquitectónico
[ ] Identificar suites afectadas
[ ] Evaluar riesgo (ALTO/MEDIO/BAJO)
[ ] Planificar rollback
[ ] Crear branched de feature
```

### Durante-Cambio

```bash
[ ] Implementar cambio (primitive|adapter|workflow)
[ ] Agregar test unitario
[ ] Agregar a suite apropiada
[ ] Actualizar support matrix (si aplica)
[ ] Documentar capability (si nueva)
```

### Post-Cambio

```bash
[ ] Run baseline completa
[ ] Verificar no hay regression
[ ] Run linter
[ ] Run typecheck
[ ] Update documentación
[ ] Merge con approval
[ ] Tag de release
```

---

## Release Checklist

```
Release Checklist:

[ ] Baseline completa = 100%
[ ] Regression tests = 0 failures  
[ ] Flakiness < 10%
[ ] Evidence ledger = 100%
[ ] Support matrix = actualizado
[ ] Docs = actualizadas
[ ] Changelog = actualizado
[ ] Version = bumped
[ ] Tag = creado
[ ] GitHub release = creado
```

---

## Rollback Procedures

### Por Capability

```bash
# Rollback de capability específica
git revert <commit> -- packages/pt-runtime/src/
bun run pt:build
bun run pt omni regression-smoke
```

### Por Suite

```bash
# Rollback de suite
git revert <commit> -- packages/pt-control/src/
bun run pt:build
bun run pt omni <suite-name>
```

### Por Release Completa

```bash
# Rollback total
git revert <release-commit>
git push --force-with-lease
bun run pt:build
bun run pt omni regression-smoke
```

---

## Excepciones a las Reglas

Las excepciones requieren:

1. **Justificación escrita** - Por qué laregla no aplica
2. **Approval de CCIE** - Revisión de experto
3. **Documentación** - Por qué es excepción
4. **Timeline** - Cuándo se va a resolver

```
Formato de excepción:

{
  "rule": "Regla B",
  "justification": "Es handlers de emergencia para Outage",
  "approver": "CCIE-Senior",
  "expires": "2026-05-01",
  "alternative": "Planeado para Q3 2026"
}
```

---

## Referencias

- Arquitectura Final: `docs/refactor/final-consolidation-phase7.md`
- Legacy Exit Plan: `docs/refactor/legacy-exit-plan-phase7.md`
- Operational Readiness: `docs/refactor/operational-readiness-phase7.md`
- Regression Baseline: `docs/refactor/regression-baseline-phase7.md`
- Support Matrix: `docs/refactor/support-matrix.md`