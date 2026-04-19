# Terminal Deprecations — Fase 2

## Propósito

Este documento lista lo que queda deprecado en esta fase en el subsystema terminal.

---

## Deprecaciones de Helpers

| Helper | Archivo | Deprecated | Reemplazo |
|--------|--------|-------------|----------|
| `executeIosCommand` (old signature) | ios-execution.ts | **Ahora** | CommandExecutor.executeCommand() |
| `execSimpleCommand` | ios-execution.ts | **Ahora** | CommandExecutor |
| `sendCommandAndWait` | ios-execution.ts | **Ahora** | CommandExecutor con eventos |
| `ensureMode` (old) | ios-execution.ts | **Ahora** | ModeGuard.ensure* |
| `parseOutput` (coupled) | ios-output-classifier.ts | **Ahora** | Parser separado |

---

## Deprecaciones de Patrones

| Patrón | Estado | Reemplazo |
|-------|--------|----------|
| Retorno de `enterCommand()` como fuente de verdad | **DEPRECATED** | Esperar evento `commandEnded` |
| Éxito por cambio de prompt | **DEPRECATED** | `status === 0` en evento `commandEnded` |
| Éxito por ausencia de excepción | **DEPRECATED** | Evidencia estructurada requerida |
| Fallback sintético ("assumed success") | **DEPRECATED** | Error con código |
| "fire and forget" commands | **DEPRECATED** | Esperar completitud |

---

## Deprecaciones de Parsers

| Parser | Estado | Reemplazo |
|-------|--------|----------|
| Output parsing dentro del handler | **DEPRECATED** | Parser separado en ios-domain |
| Regex matching coupled a dispatch | **DEPRECATED** | Separation of concerns |

---

## API Antigua a Remover

### IOS Execution API Vieja

```typescript
// ESTO YA NO FUNCIONA ASÍ:
// ❌ NO USAR - Retorna undefined
const term = device.getCommandLine();
term.enterCommand(cmd);
return term.getCommandInput(); // NO!

// ✅ USAR - Ejecutor basado en eventos
const executor = getExecutor(device);
const result = executor.executeCommand(cmd);
return result; // Con evidencia
```

---

## Símbolos Deprecated

| Símbolo | Archivo | Deprecated | Reemplazo |
|---------|--------|-------------|----------|
| `handleExecIos` (old) | ios-execution.ts | **Fase 3** | CommandExecutor |
| `handleConfigIos` (old) | ios-execution.ts | **Fase 3** | PlanEngine |
| `buildExecIosPlan` | ios-plan-builder.ts | **Fase 3** | TerminalPlan |
| `buildConfigIosPlan` | ios-plan-builder.ts | **Fase 3** | TerminalPlan |

---

## Errores que ya no usar

| Código Viejo | Descripción | Nuevo Código |
|--------------|-------------|--------------|
| `COMMAND_FAILED` (sin evidencia) | Genérico | `TERMINAL_EVIDENCE_MISSING` |
| `IOS_JOB_FAILED` (sin output) | Genérico | `TERMINAL_COMMAND_END_TIMEOUT` |
| `INVALID_MODE` (heurístico) | Asumido | `TERMINAL_MODE_MISMATCH` |

---

## Transición

### Fase 2 (Esta)

- [x] Documentar deprecaciones
- [x] Crear CommandExecutor
- [x] Crear evidencia builder
- [x] Marcar helpers viejos como deprecated

### Fase 3

- [ ] Reemplazar handlers ios-execution.ts
- [ ] Reemplazar ios-plan-builder.ts  
- [ ] Mover parsers a ios-domain
- [ ] Actualizar exports

### Fase 4

- [ ] Eliminar APIs deprecated
- [ ] Limpiar internos

---

## Warnings

Para marcar deprecated en código:

```typescript
/**
 * @deprecated Use CommandExecutor.executeCommand() instead.
 * Will be removed in Phase 3.
 */
export function handleExecIosLegacy(/* ... */) {
  console.warn("DEPRECATED: handleExecIosLegacy is deprecated.");
  // delegates to new executor
}
```

---

## Histórico

| Fecha | Versión | Cambios |
|------|--------|---------|
| 2026-04-19 | 1.0 | Initial deprecations |