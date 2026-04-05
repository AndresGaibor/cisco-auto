# Fase 6: Reescritura real de IOS interactivo - Progreso

**Estado**: Pasos 1-8 completados ✅
**Fecha**: 2026-04-05
**Objetivo**: Reescribir IOS interactivo eliminando falsos positivos y heurísticas pobres

---

## Pasos Completados

### ✅ Paso 1: Contrato nuevo de resultado interactivo IOS

**Archivos creados**:
- `packages/types/src/schemas/ios-interactive-result.ts` (270 líneas)
  - `IosInteractiveResult` con campos completos
  - `Diagnostics` con `source`, `completionReason`, `errors`, `warnings`
  - `InteractionMetrics` para tracking de paging, confirms, passwords
  - `TranscriptEntry` para eventos de sesión
  - Factories: `createSuccessResult()`, `createFailedResult()`, `createSyntheticResult()`

- `packages/pt-control/src/contracts/ios-interactive-result.ts` (re-export)

**Cambios en índices**:
- Exportado desde `packages/types/src/schemas/index.ts`
- Exportado desde `packages/pt-control/src/contracts/index.ts`

**Contrato principal**:
```ts
interface IosInteractiveResult {
  ok: boolean
  raw: string
  parsed?: Record<string, unknown>
  session: SessionInfo
  interaction: InteractionMetrics
  diagnostics: Diagnostics
  command?: string
  executionTimeMs?: number
  transcriptSummary?: TranscriptEntry[]
  classification?: OutputClassification
}
```

---

### ✅ Paso 2: Máquina de estados IOS PT-side

**Archivo creado**:
- `packages/pt-runtime/src/templates/ios-session-engine-template.ts` (420 líneas)

**Estados implementados**:
- `idle` → `awaiting-output` → (`paging` | `awaiting-confirm` | `awaiting-password` | `awaiting-destination-filename`) → `awaiting-command-end` → `completed`/`failed`
- `desynced`, `failed` como states finales anómalos

**Eventos procesados**:
- `commandStarted`, `outputWritten`, `moreDisplayed`
- `confirmPrompt`, `passwordPrompt`, `destinationFilenamePrompt`
- `promptChanged`, `modeChanged`, `commandEnded`, `timeout`, `desync`

**Clase principal**: `IosSessionEngine`
- `processEvent(event)`: maneja transiciones
- `getState()`: devuelve `SessionInfo` actual
- `getMetrics()`: devuelve `InteractionMetrics` (pagesAdvanced, confirmsAnswered, etc.)
- Helpers: `advancePaging()`, `answerConfirm()`, `providePassword()`, `provideDestinationFilename()`
- Detection: `detectPaging()`, `detectConfirmPrompt()`, `detectPasswordPrompt()`, etc.

---

### ✅ Paso 6 (early): Helpers explícitos de sesión PT-side

**Archivo creado**:
- `packages/pt-runtime/src/templates/ios-session-primitives-template.ts` (320 líneas)

**Helpers semánticos**:
- `ensureUserExec(engine, executeCommand)` → transición a user-exec
- `ensurePrivilegedExec(engine, executeCommand, password?)` → transición a priv-exec
- `ensureConfigMode(engine, executeCommand)` → transición a config
- `exitConfigMode(engine, executeCommand)` → salir de config
- `handlePaging(engine, executeCommand)` → avanzar automáticamente en paging
- `handleConfirm(engine, executeCommand, answer)` → responder confirmaciones
- `providePassword(engine, executeCommand, password)` → responder password
- `provideDestinationFilename(engine, executeCommand, filename)` → responder filename
- `runInteractiveCommand()` → ejecutor completo con retry de prompts

---

### ✅ Paso 8: Clasificación formal de errores IOS

**Archivo creado**:
- `packages/pt-control/src/domain/ios/ios-error-classifier.ts` (380 líneas)

**Categorías formales**:
- **Sintaxis**: `SYNTAX_ERROR`, `AMBIGUOUS_COMMAND`, `INCOMPLETE_COMMAND`
- **Permisos**: `PRIVILEGE_ERROR`, `PERMISSION_DENIED`
- **Recursos**: `INTERFACE_NOT_FOUND`, `VLAN_NOT_FOUND`, `IP_CONFLICT`, `MASK_INVALID`
- **Timeouts**: `INTERACTION_TIMEOUT`, `PAGING_TIMEOUT`, `CONFIRM_TIMEOUT`, `PASSWORD_TIMEOUT`, `FILENAME_TIMEOUT`
- **Sesión**: `SESSION_DESYNC`, `TERMINAL_UNAVAILABLE`
- **Datos**: `DNS_LOOKUP_TIMEOUT`, `TRUNCATED_OUTPUT`, `SYNTHETIC_RESULT`
- **Persistencia**: `SAVE_FAILED`, `WRITE_MEMORY_FAILED`
- **Genérico**: `EXECUTION_TIMEOUT`, `UNKNOWN_ERROR`

**Función principal**: `classifyIosError(result: IosInteractiveResult): ClassifiedError | null`

**Estructura de error**:
```ts
interface ClassifiedError {
  category: IosErrorCategory
  message: string
  severity: 'info' | 'warning' | 'error' | 'critical'
  retryable: boolean
  details?: { raw?, command?, completionReason?, outputSnippet? }
}
```

**Helpers**:
- `isRetryable(error)` → ¿es retryable?
- `getErrorDescription(error)` → descripción legible
- `isHardFailure(result)` → ¿es fallo irrecuperable?

---

## Pasos Pendientes (Fase 6 Continuación)

### Paso 3: Capa PT-side de transcript real
- Template para registrar eventos de sesión
- Estructura de TranscriptEntry completa

### Paso 4: Reescribir `execInteractive` PT-side
- Actualizar `ios-exec-handlers-template.ts`
- Usar `IosSessionEngine` en lugar de polling simple
- Devolver `IosInteractiveResult`

### Paso 5: Reescribir `configIos` PT-side
- Actualizar `ios-config-handlers-template.ts`
- Usar helpers de sesión (`ensurePrivilegedExec`, `ensureConfigMode`, etc.)
- Devolver resultado enriquecido

### Paso 7: Alinear `IosService` alto
- Actualizar `packages/pt-control/src/application/services/ios-service.ts`
- Usar `diagnostics` en lugar de heurísticas `%` / `Invalid`
- Propagar `completionReason`, `warnings`, `reliability`

### Paso 9: Endurecer transcript ↔ command trace ↔ resultado
- Mejorar trazabilidad en toda la cadena

### Paso 10: Revisar y endurecer `cleanUp()`
- Asegurar idempotencia con nuevos listeners

### Paso 11: Reforzar tests de IOS interactivo
- Tests de `IosSessionEngine`
- Tests de `execInteractive` real
- Tests de `configIos` mejorado
- Tests de clasificación de errores

### Paso 12: Actualizar skill CLI
- Documentar cambios en `docs/CLI_AGENT_SKILL.md`
- Advertir sobre confianza de resultados IOS

---

## Arquitectura Fase 6 (hasta aquí)

```
┌─────────────────────────────────────────────────────┐
│ pt-control (HIGH LEVEL)                             │
├─────────────────────────────────────────────────────┤
│ IosService                                          │
│ ├─ execInteractive() → IosInteractiveResult         │
│ ├─ configIos() → ConfigIosResult (mejorado)         │
│ └─ Clasificador: classifyIosError()                 │
└─────────────────────────────────────────────────────┘
           ↑
           │
┌─────────────────────────────────────────────────────┐
│ pt-runtime/templates (MID LEVEL - GENERATED)        │
├─────────────────────────────────────────────────────┤
│ ios-exec-handlers-template.ts (TO UPDATE)           │
│ ├─ handleExecInteractive() → real interactive       │
│ └─ usa IosSessionEngine + IosSessionPrimitives      │
│                                                     │
│ ios-config-handlers-template.ts (TO UPDATE)         │
│ ├─ handleConfigIos() → con state machine            │
│ └─ usa helpers: ensureConfigMode, etc.              │
└─────────────────────────────────────────────────────┘
           ↑
           │
┌─────────────────────────────────────────────────────┐
│ pt-runtime/templates (CORE - ESTADO)                │
├─────────────────────────────────────────────────────┤
│ ios-session-engine-template.ts ✅                   │
│ └─ IosSessionEngine: state machine, metrics         │
│                                                     │
│ ios-session-primitives-template.ts ✅               │
│ └─ Helpers: ensureXXX(), handleXXX()                │
└─────────────────────────────────────────────────────┘
           ↑
           │
┌─────────────────────────────────────────────────────┐
│ PT Device (DEVICE TERMINAL)                         │
├─────────────────────────────────────────────────────┤
│ device.getCommandLine()                             │
│ ├─ term.enterCommand(cmd)                           │
│ ├─ term.getOutput()                                 │
│ ├─ term.getPrompt()                                 │
│ └─ Events: outputWritten, commandEnded              │
└─────────────────────────────────────────────────────┘
```

---

## Tipos Nuevos en la Cadena

### `packages/types/src/schemas/ios-interactive-result.ts`
```ts
interface IosInteractiveResult {
  ok: boolean
  raw: string
  parsed?: unknown
  session: SessionInfo
  interaction: InteractionMetrics
  diagnostics: Diagnostics
  command?: string
  executionTimeMs?: number
  transcriptSummary?: TranscriptEntry[]
  classification?: OutputClassification
}

interface Diagnostics {
  source: 'terminal' | 'synthetic' | 'hybrid'
  completionReason: CompletionReason
  commandStatus?: number
  errors: string[]
  warnings: string[]
  reliabilityScore?: 0-100
}

type CompletionReason =
  | 'command-ended'
  | 'prompt-stabilized'
  | 'timeout'
  | 'confirm-timeout'
  | 'password-timeout'
  | 'filename-timeout'
  | 'paging-timeout'
  | 'desync'
  | 'user-cancelled'
  | 'unknown'
```

---

## Cambios en Core

1. **Nuevo contrato**: `IosInteractiveResult` reemplaza heurísticas pobres
2. **Nueva máquina de estados**: `IosSessionEngine` en lugar de polling
3. **Nuevos helpers**: funciones semánticas para transiciones de modo
4. **Nuevo clasificador**: `classifyIosError()` para errores estructurados

---

## Criterios de Aceptación (hasta Paso 8)

- ✅ Contrato `IosInteractiveResult` formal y exportado
- ✅ State machine `IosSessionEngine` implementada
- ✅ Helpers de sesión listos para uso
- ✅ Clasificador de errores formal
- ⏳ (Pasos 9-12) Integración en handlers PT-side
- ⏳ (Pasos 9-12) Tests E2E

---

## Próximos Pasos Inmediatos

1. Actualizar `ios-exec-handlers-template.ts` para usar `IosSessionEngine`
2. Actualizar `ios-config-handlers-template.ts` para usar helpers
3. Asegurar que `IosService` consume `IosInteractiveResult` correctamente
4. Agregar tests para state machine y clasificador
5. Validar en laboratorio real de PT

---

## Notas Importantes

- Los templates aún generan JavaScript, así que la integraci en handlers debe ser cuidadosa
- La state machine es agnóstica de PT, puede ser reutilizada en otros contextos
- El clasificador es independiente de la state machine, puede usarse para postprocesar resultados
- Los helpers semánticos (`ensureXXX`) pueden ser async en la implementación final

