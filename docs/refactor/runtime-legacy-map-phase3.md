# Runtime Legacy Map Phase 3 — Mapa de Componentes Legacy

## Propósito

Este documento lista todos los componentes dentro de `pt-runtime` y su categoría destino. Es la guía para que un futuro agente no limpie a ciegas.

## Categorías

Cada componente debe estar en una sola categoría:

- **kernel**: Bootstrap, dispatch, ciclo de ejecución
- **terminal**: Sesiones, executor, mode guard, pager
- **primitive**: Acceso PT bajo nivel por dominio
- **omni**: Adapters de hacks/capabilities
- **catalog**: Metadata estática
- **contracts**: Tipos públicos
- **compat**: Validación PT-safe
- **build**: Generación de assets
- **business legacy**: Lógica de negocio compuesta (a mover a pt-control)
- **verification legacy**: Verificaciones semánticas (a mover a pt-control)
- **workflow legacy**: Orquestación (a mover a pt-control)

## Clasificación Actual

### Kernel (existente)

| Archivo | Estado | Acción |
|---------|--------|---------|
| `pt/kernel/main.ts` | activo | mantener |
| `pt/kernel/kernel-state.ts` | activo | mantener |
| `pt/kernel/directories.ts` | activo | mantener |
| `pt/kernel/command-queue.ts` | activo | mantener |
| `pt/kernel/lease.ts` | activo | mantener |
| `pt/kernel/heartbeat.ts` | activo | mantener |
| `pt/kernel/runtime-loader.ts` | activo | mantener |

### Terminal (existente)

| Archivo | Estado | Acción |
|---------|--------|---------|
| `terminal/session-state.ts` | activo | mantener |
| `terminal/session-registry.ts` | activo | mantener |
| `terminal/prompt-detector.ts` | activo | mantener |
| `terminal/pager-handler.ts` | activo | mantener |
| `terminal/command-executor.ts` | activo | mantener |
| `terminal/mode-guard.ts` | activo | mantener |
| `terminal/terminal-plan.ts` | activo | mantener |
| `terminal/plan-engine.ts` | activo | mantener |
| `terminal/ios-evidence.ts` | activo | mantener |
| `terminal/terminal-errors.ts` | activo | mantener |
| `pt/terminal/terminal-engine.ts` | legacy | deprecate, usar terminal nuevo |

### Primitives (nuevo)

| Archivo | Estado | Acción |
|---------|--------|---------|
| `primitives/device/index.ts` | nuevo | mantener |
| `primitives/link/index.ts` | nuevo | mantener |
| `primitives/module/index.ts` | nuevo | mantener |
| `primitives/host/index.ts` | nuevo | mantener |
| `primitives/snapshot/index.ts` | nuevo | mantener |
| `primitives/index.ts` | nuevo | mantener |

### Omni (nuevo)

| Archivo | Estado | Acción |
|---------|--------|---------|
| `omni/index.ts` | nuevo | mantener |

### Handlers (mixto)

| Archivo | Categoría Actual | Destino | Acción |
|---------------|-----------------|---------|---------|
| `handlers/device-crud.ts` | handler mixto | primitive | split |
| `handlers/device-discovery.ts` | handler | primitive | migrate |
| `handlers/device.ts` | handler | primitive | migrate |
| `handlers/device-classifier.ts` | handler | business legacy | move to control |
| `handlers/device-listing.ts` | handler | primitive | migrate |
| `handlers/device-config.ts` | handler | wrapper legacy | deprecate |
| `handlers/deep-inspect.ts` | handler | primitive | migrate |
| `handlers/link.ts` | handler | primitive | migrate |
| `handlers/add-link.ts` | handler | primitive | migrate |
| `handlers/remove-link.ts` | handler | primitive | migrate |
| `handlers/inspect.ts` | handler | primitive | migrate |
| `handlers/module.ts` | handler | primitive | migrate |
| `handlers/host.ts` | handler | primitive | migrate |
| `handlers/vlan.ts` | handler | business legacy | move to control |
| `handlers/dhcp.ts` | handler | business legacy | move to control |
| `handlers/ios-execution.ts` | handler | terminal | migrate to new executor |
| `handlers/ios-plan-builder.ts` | workflow legacy | move to control |
| `handlers/ios-session.ts` | handler | primitive | migrate |
| `handlers/terminal-sanitizer.ts` | handler | compat | migrate to compat |
| `handlers/result-factories.ts` | handler | contracts | migrate to contracts |
| `handlers/host-handler.ts` | wrapper legacy | deprecate |
| `handlers/runtime-handlers.ts` | dispatch | wrapper legacy | refactorizar |
| `handlers/dispatcher.ts` | dispatch | wrapper legacy/refactor |

### Omni Handlers (a convertir)

| Archivo | Categoría Actual | Destino | Acción |
|---------------|-----------------|---------|---------|
| `handlers/omniscience-physical.ts` | hack | omni | convert to adapter |
| `handlers/omniscience-logical.ts` | hack | omni | convert to adapter |
| `handlers/omniscience-environment.ts` | hack | omni | convert to adapter |
| `handlers/omniscience-telepathy.ts` | hack | omni | convert to adapter |
| `handlers/omniscience-utils.ts` | hack | omni | convert to adapter |
| `handlers/evaluate.ts` | hack | omni | convert to adapter |

### Catalog

| Archivo | Estado | Acción |
|---------|--------|---------|
| `pt-api/pt-constants.ts` | activo | mantener |
| `pt-api/pt-api-registry.ts` | activo | mantener |

### Build

| Archivo | Estado | Acción |
|---------|--------|---------|
| `build/runtime-generator.ts` | activo | mantener |
| `build/render-runtime-v2.ts` | activo | mantener |
| `build/render-main-v2.ts` | activo | mantener |
| `build/render-catalog.ts` | activo | mantener |
| `build/validate-pt-safe.ts` | activo | mantener |
| `build/runtime-manifest.ts` | activo | mantener |
| `build/checksum.ts` | activo | mantener |

### Domain (legacy)

| Archivo | Categoría Actual | Destino | Acción |
|---------------|-----------------|---------|---------|
| `domain/deferred-job-plan.ts` | workflow legacy | deprecate/move |
| `domain/ios-plans.ts` | workflow legacy | move to control |

---

## Pendiente para Fase 4

### Business Logic aún en Runtime

- VLAN configuration
- DHCP configuration  
- Device classification
- Plan building semántico

### Verification aún en Runtime

- Output parsing semántico
- Config verification
- Connectivity verification

### Workflow aún en Runtime

- IOS execution flow (parcial)
- Deferred job execution

---

## Histórico

| Fecha | Versión | Cambios |
|--------|---------|----------|
| 2026-04-19 | 1.0 | Initial legacy map |