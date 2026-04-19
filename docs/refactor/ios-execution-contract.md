# IOS Execution Contract

## Propósito

Este documento define el contrato oficial para toda ejecución IOS en `pt-runtime`. Establece las reglas que deben seguir los handlers IOS.

---

## Contrato de Ejecución

### Regla 1: Éxito Requiere Evidencia

Ningún handler puede devolver `ok: true` sin evidencia de que el comando terminó exitosamente.

```typescript
// ❌ INVÁLIDO - Éxito sin evidencia
function legacyExec(device, cmd) {
  const term = getDeviceTerminal(device);
  term.enterCommand(cmd);
  return { ok: true }; // NO!
}

// ✅ VÁLIDO - Éxito con evidencia
function newExec(device, cmd) {
  const executor = getExecutor(device);
  const result = executor.executeCommand(cmd);
  return toPtResult(result); // evidencia incluida
}
```

### Regla 2: enterCommand Es Asíncrono por Eventos

`enterCommand()` no retorna el resultado. El resultado llega vía Eventos:

- `commandStarted` - El comando empezó
- `outputWritten` - Salida acumulada
- `commandEnded` - El comando terminó (aquí está el status)

```typescript
// Cómo funciona internamente:
term.enterCommand("show ip int brief");
// NO esperes retorno -等待 eventos:
// - 'commandStarted' (timestamp)
// - 'outputWritten' (data)
// - 'commandEnded' ({ status, finalPrompt })
```

### Regla 3: Timeout es Error

Si un comando no termina en el tiempo esperado, debe devolver error:

```typescript
const execution = executor.executeCommand(cmd, {
  commandTimeoutMs: 8000,
  stallTimeoutMs: 15000
});

if (!execution.receivedCommandEnded) {
  return {
    ok: false,
    error: "Command did not complete",
    code: "TERMINAL_COMMAND_END_TIMEOUT"
  };
}
```

---

## Shape del Resultado

### CommandExecutionResult

```typescript
interface CommandExecutionResult {
  // Estado
  ok: boolean;

  // Comando ejecutado
  command: string;

  // Status del comando (0 = éxito)
  status: number;

  // Tiempos
  startedAt: number;
  endedAt: number;
  durationMs: number;

  // Estado del terminal
  promptBefore: string;
  promptAfter: string;
  modeBefore: IosMode;
  modeAfter: IosMode;

  // Output
  output: string;

  // Trazabilidad
  events: TerminalEventRecord[];

  // Advertencias
  warnings: string[];

  // Evidencia completa
  evidence: TerminalExecutionEvidence;

  // Error (si ok === false)
  error?: string;
  code?: string;

  // Confianza (0-1)
  confidence: number;
}
```

---

## Payload Contract

### ExecIosPayload

```typescript
interface ExecIosPayload {
  type: "execIos";
  device: string;
  command: string;
  parse?: boolean;
  ensurePrivileged?: boolean;
  dismissInitialDialog?: boolean;
  commandTimeoutMs?: number;
  stallTimeoutMs?: number;
}
```

### ConfigIosPayload

```typescript
interface ConfigIosPayload {
  type: "configIos";
  device: string;
  commands: string[];
  save?: boolean;
  stopOnError?: boolean;
  ensurePrivileged?: boolean;
  dismissInitialDialog?: boolean;
  commandTimeoutMs?: number;
  stallTimeoutMs?: number;
}
```

---

## ErroresTerminales

| Código | Descripción | Causa Común |
|--------|-------------|--------------|
| `TERMINAL_SESSION_OPEN_FAILED` | No se pudo abrir | Dispositivo no existe o sin terminal |
| `TERMINAL_COMMAND_START_TIMEOUT` | Timeout start | Comando no empezó |
| `TERMINAL_COMMAND_END_TIMEOUT` | Timeout end | Comando no terminó |
| `TERMINAL_PROMPT_MISMATCH` | Prompt cambió | Output inesperado |
| `TERMINAL_MODE_MISMATCH` | Modo cambió | No se logró modo objetivo |
| `TERMINAL_PAGER_LOOP` | Pager loop | Demasiados --More-- |
| `TERMINAL_WIZARD_BLOCKED` | Wizard activo | Diálogo inicial |
| `TERMINAL_CONFIRMATION_BLOCKED` | Confirm | Pregunta interactiva |
| `TERMINAL_SESSION_BROKEN` | Sesión rota | Estado inconsistente |
| `TERMINAL_EVIDENCE_MISSING` | Sin evidencia | No se capturó resultado |

---

## Testing Contract

Todo handler IOS debe cumplir:

### Test: Ejecución Simple

```typescript
test("exec simple command returns evidence", async () => {
  const result = executor.executeCommand("show version");
  expect(result.ok).toBe(true);
  expect(result.status).toBe(0);
  expect(result.evidence.rawOutput).toContain("IOS");
  expect(result.events).toContainEventType("commandEnded");
});
```

### Test: Timeout

```typescript
test("timeout returns error", async () => {
  const result = executor.executeCommand("slow command", {
    commandTimeoutMs: 100
  });
  expect(result.ok).toBe(false);
  expect(result.code).toBe("TERMINAL_COMMAND_END_TIMEOUT");
});
```

### Test: Wizard

```typescript
test("handles initial wizard", async () => {
  const result = executor.executeCommand("show version");
  expect(result.evidence.wizardInterventions).toBeDefined();
});
```

### Test: Pager

```typescript
test("handles pager", async () => {
  const result = executor.executeCommand("show run");
  expect(result.evidence.pagerAdvances).toBeDefined();
});
```

---

## Deprecated Legacy Patterns

| Patrón | Estado | Reemplazo |
|-------|--------|----------|
| `term.enterCommand(cmd); return {ok:true}` | **DEPRECATED** | Usar CommandExecutor |
| Éxito por cambio de prompt | **DEPRECATED** | evidence.commandEnded.status === 0 |
| Fallback sintético | **DEPRECATED** | error con código |
| Parser coupldeado | **DEPRECATED** | Separation de concerns |
| Sin evidencia | **DEPRECATED** | evidence requerida |

---

## Histórico

| Fecha | Versión | Cambios |
|------|--------|---------|
| 2026-04-19 | 1.0 | Initial IOS execution contract |