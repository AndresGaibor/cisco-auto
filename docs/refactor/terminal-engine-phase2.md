# Terminal Engine Phase 2 — Diseño Oficial

## Problema Actual

### Symptoms Identificados

1. **Éxito sintético**: `configIos`/`execIos` dependen de una suposición inválida sobre `enterCommand()`. El código asume que llamar `enterCommand(cmd)` devuelve el resultado cuando en realidad eso es un método asíncrono basado en eventos.

2. **Falsos positivos**: Comandos que "funcionan" devuelven `ok: true` sin evidencia real del resultado. La verificación se basa en heuristic como "el prompt cambió" o "no hubo excepción".

3. **Verificación imposible**: Sin evidencia estructurada, no se puede hacer omni fiable sobre terminal. No hay forma de validar que un comando realmente hizo lo que se esperaba.

4. **Rendimiento fragile**: El sistema usa hot-reload de `runtime.js` como lifecycle, lo cual oscurece bugs de estado.

### Raíz del Problema

El modelo actual treated `enterCommand()` como una operación síncrona:
```javascript
// ❌ MALO - Asume retorno inmediato
term.enterCommand("show ip int brief");
return { ok: true, output: "..." }; // Falso!
```

Cuando en realidad es:
```javascript
// ✅ CORRETO - Es asíncrono via eventos
term.enterCommand("show ip int brief");
// Necesitas esperar "commandEnded" y capturar "outputWritten"
```

---

## Modelo Nuevo

### Arquitectura de Componentes

```
src/terminal/
├── session-registry.ts      # Una sesión por dispositivo
├── session-state.ts        # Estado observable de sesión
├── terminal-events.ts     # Contrato de eventos PT
├── prompt-detector.ts     #Clasificación de prompts
├── pager-handler.ts       # Manejo de --More--
├── command-executor.ts   # Corazón: ejecución basada en eventos
├── mode-guard.ts         # Transiciones de modo explícitas
├── terminal-plan.ts      # Plan terminal estructurado
├── plan-engine.ts        # Ejecutor de planes
├── ios-evidence.ts       # Builder de evidencia
├── terminal-errors.ts   # Taxonomía de errores
└── index.ts           # Exports públicos
```

### Flujo Oficial

```
1. abrir o recuperar sesión del dispositivo
2. leer estado actual
3. aplicar precondiciones (wizard / enable / config mode)
4. ejecutar paso
5. capturar eventos y salida
6. esperar commandEnded
7. evaluar modo/prompt final
8. guardar evidencia
9. devolver resultado estructurado
```

---

## Componentes

### SessionRegistry

- Una sesión por dispositivo
- Reutiliza sesiones existentes
- Limpia sesiones rotas
- Expone API: getSession, ensureSession, markBroken, disposeSession

### SessionState

Campos:
- deviceName, sessionId, createdAt, lastActivityAt
- isOpen, isBooting, wizardDetected, pagerActive, confirmPromptActive
- lastPrompt, lastMode, lastCommand, lastCommandStartedAt, lastCommandEndedAt
- pendingCommand, outputBuffer, recentOutputs, warnings
- health, listenersAttached

### TerminalMode

- unknown, user-exec, privileged-exec, global-config, sub-config
- wizard, confirm, pager, boot

### TerminalHealth

- healthy, stale, desynced, blocked, broken

---

## CommandExecutor (Corazón)

### Responsabilidades

**Antes de ejecutar:**
- Obtener sesión
- Verificar salud
- Limpiar buffers temporales
- Registrar listeners si no existen
- Preparar collector de evidencia

**Durante la ejecución:**
- Enviar `enterCommand(command)`
- Capturar `commandStarted`
- Acumular `outputWritten`
- Manejar `moreDisplayed`
- Seguir `modeChanged` y `promptChanged`
- Esperar `commandEnded`

**Al finalizar:**
- Congelar evidencia
- Determinar resultado real
- Actualizar estado de sesión
- Devolver CommandExecutionResult

### CommandExecutionResult

```typescript
interface CommandExecutionResult {
  ok: boolean;
  command: string;
  status: number;
  startedAt: number;
  endedAt: number;
  durationMs: number;
  promptBefore: string;
  promptAfter: string;
  modeBefore: IosMode;
  modeAfter: IosMode;
  output: string;
  events: TerminalEventRecord[];
  warnings: string[];
  evidence: TerminalExecutionEvidence;
  error?: string;
  confidence: number;
}
```

### Reglas Duras

- NO usar retorno de `enterCommand()` como fuente de verdad
- NO devolver éxito sin `commandEnded` recibido
- NO asumir prompt cambió correctamente sin evidencia de eventos
- NO ocultar errores con fallback silencioso

---

## ModeGuard

Transiciones explícitas:

1. **Wizard inicial**: Detectar → responder → registrar evidencia
2. **Paso a privileged**: `enable` → esperar `#`
3. **Paso a config**: `configure terminal` → esperar `(config)#`
4. **Confirmaciones**: Detectar → decidir según política

---

## TerminalPlan

Estructura de plan:

```typescript
interface TerminalPlan {
  id: string;
  deviceName: string;
  targetMode: IosMode;
  steps: TerminalPlanStep[];
  timeouts: TerminalPlanTimeouts;
  policies: TerminalPlanPolicies;
}

interface TerminalPlanStep {
  kind: "command" | "ensureMode" | "confirm" | "expectPrompt";
  command?: string;
  expectMode?: IosMode;
  expectPromptPattern?: RegExp;
  allowPager: boolean;
  allowConfirm: boolean;
  optional: boolean;
}
```

---

## PlanPolicies

```typescript
interface TerminalPlanPolicies {
  autoBreakWizard: boolean;
  autoAdvancePager: boolean;
  maxPagerAdvances: number;
  maxConfirmations: number;
  abortOnPromptMismatch: boolean;
  abortOnModeMismatch: boolean;
}
```

---

## Evidence

```typescript
interface TerminalExecutionEvidence {
  sessionSnapshotBefore: SessionSnapshot;
  sessionSnapshotAfter: SessionSnapshot;
  promptBefore: string;
  promptAfter: string;
  modeBefore: IosMode;
  modeAfter: IosMode;
  command: string;
  rawOutput: string;
  normalizedOutput: string;
  events: TerminalEventRecord[];
  pagerAdvances: number;
  wizardInterventions: number;
  confirmationsAnswered: number;
  warnings: string[];
  anomalies: string[];
}
```

---

## Errores Terminales

| Error | Descripción |
|-------|-------------|
| TerminalSessionOpenFailed | No se pudo abrir sesión |
| TerminalCommandStartTimeout | Timeout esperando commandStarted |
| TerminalCommandEndTimeout | Timeout esperando commandEnded |
| TerminalPromptMismatch | Prompt final no coincide |
| TerminalModeMismatch | Modo final no coincide |
| TerminalPagerLoopDetected | Pager en loop |
| TerminalWizardBlocked | Wizard impide operación |
| TerminalConfirmationBlocked | Confirm interactiva |
| TerminalSessionBroken | Sesión en estado roto |
| TerminalEvidenceMissing | Sin evidencia |
| TerminalUnknownState | Estado no esperado |

---

## Transición del Legacy

### handlers/ios-execution.ts

El handler existente debe pasar a usar `PlanEngine` internamente:

```typescript
// ANTES (malo)
function handleExecIos(payload: ExecIosPayload, api): PtResult {
  const term = api.getCommandLine(device);
  term.enterCommand(cmd); // Fire and forget!
  return { ok: true }; // Sintético!
}

// DESPUÉS (bien)
function handleExecIos(payload: ExecIosPayload, api): PtResult {
  const executor = getExecutorForDevice(device);
  const result = executor.executeCommand(cmd); // Basado en eventos
  return toPtResult(result); // Con evidencia real
}
```

### Deprecaciones Phase 2

- Cualquier helper que use retorno de `enterCommand()` → deprecated
- Cualquier "prompt-only success" → deprecated
- Cualquier parser coupled a dispatch → deprecated
- Cualquier fallback sintético → deprecated

---

## Histórico

| Fecha | Versión | Cambios |
|------|--------|---------|
| 2026-04-19 | 1.0 | Initial terminal engine design |