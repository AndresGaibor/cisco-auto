# Runtime Deprecations - Fase 1

## Propósito

Este documento marca lo que queda **deprecado** a partir de Fase 1 y no puede seguir creciendo.

---

## Deprecations en Runtime

### Handlers de Negocio Compuestos

| Archivo | Handler | Deprecated | Reemplazo |
|---------|----------|-------------|----------|
| `handlers/ios-plan-builder.ts` | `buildConfigIosPlan`, `buildExecIosPlan` | **Fase 3** | Mover a `pt-control` workflows |
| `handlers/ios-output-classifier.ts` | `classifyOutput`, `OutputClassificationType` | **Fase 3** | Mover a `ios-domain/parsers` |
| `handlers/vlan.ts` | `handleEnsureVlans`, `handleConfigVlanInterfaces` | **Fase 2** | Mantener solo primitives básicas |
| `handlers/dhcp.ts` | `handleConfigureDhcpServer`, `handleConfigureDhcpPool` | **Fase 2** | Mantener solo primitives básicas |

### Validadores Semánticos

| Archivo | Función | Deprecated | Reemplazo |
|---------|--------|-------------|----------|
| `runtime/validators/ios.ts` | Validación semántica | **Ahora** | `pt-control` verification |

### Workflows Altos

| Archivo | Deprecated | Reemplazo |
|---------|-------------|----------|
| `handlers/device-config.ts` | **Ahora** | `pt-control` services |
| `handlers/cable-recommender.ts` | **Ahora** | `pt-control` planners |

### Éxito Sintético

| Práctica | Deprecated | Reemplazo |
|---------|-------------|----------|
| `ok: true` sin evidencia | **Ahora** | Siempre incluir `evidence` |
| `enterCommand()` como síncrono | **Ahora** | Usar deferred jobs con evidencia |

---

## Deprecations en Control

### Acceso Directo a Internals PT

| Práctica | Deprecated | Reemplazo |
|---------|-------------|----------|
| Acceso directo a `AssessmentModel` | **Ahora** | Usar capability adapter |
| Acceso directo a `ipc.*` sin runtime | **Ahora** | Usar primitives runtime |
| Manipulación directa de `global` | **Ahora** | Usar omni capability |

### Uso de Hacks Fuera de Capability

| Práctica | Deprecated | Reemplazo |
|---------|-------------|----------|
| `omniscience-*.ts` directamente | **Ahora** | Usar harness capability |
| Saltar contrato de capability | **Ahora** | Registrar capability primero |

---

## Deprecations en Documentación

### Documentos que Contradicen la Frontera

| Documento | Acción |
|-----------|-------|
| `docs/PT_EVALUATE_HACKING_GUIDE.md` | Actualizar para referenciar capability contract |
| `packages/pt-runtime/AGENTS.md` | Actualizar para nueva frontera |
| `packages/pt-runtime/README.md` | Actualizar descripción |
| `packages/pt-control/AGENTS.md` | Actualizar para nueva frontera |
| `packages/pt-control/README.md` | Actualizar descripción |

---

## API Deprecations

### Runtime Exports a Remover

| Export | Deprecated | Reemplazo |
|--------|-------------|----------|
| `DeviceHandler` class | **Fase 4** | No reemplazar |
| `IOSEngine` class | **Fase 5** | No reemplazar |
| `renderRuntimeV2` (deprecated signature) | **Fase 4** | Usar `renderRuntimeV2Sync` |

### Control Exports a Remover

| Export | Deprecated | Reemplazo |
|--------|-------------|----------|
| Acceso directo a `ipc` | **Ahora** | Usar `pt-runtime` primitives |

---

## Símbolos Deprecated

### Constantes

| Símbolo | Archivo | Deprecated | Reemplazo |
|---------|--------|-------------|----------|
| `PT_DEVICE_TYPE.*` (old) | `pt-api/pt-constants.ts` | **Fase 4** | Usar catálogo |
| `PT_CABLE_TYPE.*` (old) | `pt-api/pt-constants.ts` | **Fase 4** | Usar catálogo |

### Error Codes

| Código | Archivo | Deprecated | Reemplazo |
|--------|--------|-------------|----------|
| `COMMAND_FAILED` (sin evidencia) | `pt-results.ts` | **Ahora** | `COMMAND_FAILED_EVIDENCE` |
| `IOS_JOB_FAILED` (sin output) | `pt-results.ts` | **Ahora** | Include output |

---

## Transición

### Fase 1 (esta)

- [x] Documentar deprecaciones
- [x] Crear contratos

### Fase 2

- [ ] Implementar primitives básicas en VLAN/DHCP
- [ ] Marcar `ios-plan-builder` como deprecated
- [ ] Crear evidencia para resultados

### Fase 3

- [ ] Mover `ios-plan-builder` a control
- [ ] Mover `ios-output-classifier` a ios-domain
- [ ] Actualizar intents

### Fase 4

- [ ] Reescribir exports
- [ ] Marcar `DeviceHandler`, `IOSEngine` deprecated
- [ ] Actualizar constantes

### Fase 5

- [ ] Eliminar deprecated APIs
- [ ] Limpiar internos

---

## Warnings de Deprecation

Para warnings oficiales en código:

```typescript
/**
 * @deprecated Use device.add primitive from @cisco-auto/pt-runtime
 * Will be removed in Phase 4
 */
export function handleAddDeviceLegacy(/* ... */) {
  console.warn("DEPRECATED: handleAddDeviceLegacy is deprecated. Use device.add from pt-runtime.");
  // ...
}
```

---

## Histórico

| Fecha | Versión | Cambios |
|------|---------|---------|
| 2026-04-19 | 1.0 | Initial deprecations |