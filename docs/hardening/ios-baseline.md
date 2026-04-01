# IOS Module Baseline — Estado Antes del Hardening

> Generado: 2026-03-31
> Objetivo: Punto de comparación para validar que los cambios mejoran el módulo sin romper funcionalidad existente.

---

## 1. Arquitectura Actual del Flujo IOS

```
PTController
    │
    ▼
IosService (ios-service.ts)
    │
    ├──► execIos() ─────► bridge.sendCommandAndWait({ type: "execIos" })
    │                         ▲
    │                         │ (NO pasa por CliSession)
    │
    ├──► configIos() ────► bridge.sendCommandAndWait({ type: "configIos" })
    │                         ▲
    │                         │ (NO pasa por CliSession)
    │
    ├──► execInteractive() ─► CliSession.executeAndWait()
    │                              │
    │                              ▼
    │                         bridge.sendCommandAndWait({ type: "execInteractive" })
    │
    └──► Semantic Ops (configureSvi, configureAccessPort, etc.)
              │
              ▼
         configIos()  ──► bridge.sendCommandAndWait({ type: "configIos" })
                                (NO pasa por CliSession)

FileBridgeV2
    │
    ▼
pt-runtime (compose.ts / config.ts)
    │
    ▼
Packet Tracer device CLI
```

**Capas:**
- `PTController` — orchestrator
- `IosService` — servicio de aplicación, mantiene `sessions: Map<string, CliSession>`
- `CliSession` — estado de sesión interactiva (modo, paging, confirm)
- `FileBridgeV2` — bridge de comunicación por archivos
- `pt-runtime` — runtime que ejecuta comandos en Packet Tracer

---

## 2. Estados Reconocidos Hoy

### IosMode (prompt-state.ts)
```
user-exec         → Router>
priv-exec         → Router#
config            → Router(config)#
config-if         → Router(config-if)#
config-line       → Router(config-line)#
config-router     → Router(config-router)#
awaiting-password → Password:
awaiting-confirm  → [confirm]
paging            → --More--
resolving-hostname→ translating "host"... domain server
unknown           → no match
```

### CliSessionState (cli-session.ts)
```typescript
interface CliSessionState extends PromptState {
  paging: boolean;
  awaitingConfirm: boolean;
}
```

### PromptState flags
```typescript
interface PromptState {
  // vacio hoy — solo CliSessionState tiene paging/awaitingConfirm
}
```

---

## 3. Clasificaciones de Salida Reconocidas

### OutputClassificationType (command-result.ts)
```
success     → default si no hay match
invalid     → "% Invalid input" detectado
incomplete  → "% Incomplete command" detectado
ambiguous   → "% Ambiguous command" detectado
paging      → "--More--" detectado
error       → "%" + ("ERROR" | "FAILED") detectados
```

### classificarOutput (command-result.ts:60-84)
```typescript
// Solo 5 checks string-based:
// 1. INVALID INPUT → "invalid"
// 2. INCOMPLETE COMMAND → "incomplete"
// 3. AMBIGUOUS COMMAND → "ambiguous"
// 4. --More-- → "paging"
// 5. % + (ERROR | FAILED) → "error"
// 6. default → "success"
```

---

## 4. Limitaciones Verificadas del Código

### L1: await-password no actualiza state.mode
**Archivo:** `cli-session.ts:161-168`
```typescript
if (promptState.mode === "awaiting-password") {
  this.state.mode = "awaiting-password";  // ✓ actualiza
  result.modeAfter = "awaiting-password";
  if (!this.options.enablePassword) {
    result.error = "Enable password required but not provided";
  }
}
// PROBLEMA: inferPromptState() devuelve "unknown" para "Password:"
// porque solo match /^Password:/i pero nunca se llama tras detectarlo
```

### L2: execIos/configIos bypasséan CliSession
**Archivo:** `ios-service.ts:149, 213`
```typescript
// execIos (línea ~206):
const result = await this.bridge.sendCommandAndWait({
  type: "execIos",  // ← va directo al bridge
  device,
  command,
  timeoutMs,
});

// configIos (línea ~130):
const result = await this.bridge.sendCommandAndWait({
  type: "configIos",  // ← va directo al bridge
  device,
  commands,
  save,
});
```
**Consecuencia:** El estado de sesión no se actualiza. Si después se llama `execInteractive()`, la sesión tiene estado stale.

### L3: mutation.input = {} en validación semántica
**Archivo:** `ios-service.ts:187-194`
```typescript
const mutation: Mutation = {
  kind: mutationKind,
  targetDevice: device,
  input: {
    ...(commands ? { commands } : {}),
    ...(intent || {}),
  }
};
```
**Consecuencia:** Las reglas de validación que esperan `AccessPortInput` o `TrunkPortInput` reciben `{ commands: string[] }` — no pueden extraer valores.

### L4: handleConfigIos TypeScript carece de session management
**Archivo:** `pt-runtime/src/handlers/config.ts`
```typescript
// El handler NO llama:
// - getOrCreateSession()
// - ensurePrivileged()
// - ensureConfigMode()

// Compara con compose.ts (JS runtime):
// var session = getOrCreateSession(payload.device, term);
// var configResult = ensureConfigMode(term, session);
```

### L5: stopOnError no existe en TypeScript handler
**Archivo:** `pt-runtime/src/handlers/config.ts`
- Payload: `ConfigIosPayload` no tiene `stopOnError`
- Resultado: siempre fail-fast (pero `ok` no siempre refleja fallido individual)

### L6: extractErrorMessage devuelve primer % no error real
**Archivo:** `command-result.ts:86-94`
```typescript
function extractErrorMessage(output: string): string | undefined {
  const lines = output.split("\n");
  for (const line of lines) {
    if (line.includes("%")) {  // ← primer %, no el error
      return line.trim();
    }
  }
  return undefined;
}
```
**Ejemplo malo:**
```
%SYS-5-CONFIG_I: Configured from console
% Invalid input detected at 'xyz'
```
→ Devuelve `%SYS-5-CONFIG_I` (syslog), no `% Invalid input` (error real)

### L7: classifyOutput no detecta muchos patrones IOS
**Faltan:**
- `% Interface FastEthernet0/1 does not exist` → `interface-not-found`
- `% Vlan 999 does not exist` → `vlan-not-found`
- `% Bad mask` → `mask-invalid`
- `% Invalid address`
- `% Unknown host or address` → `dns-lookup-timeout`
- `% Duplicate address`
- `% Not in enable mode` → `permission-denied`
- `% Command rejected`
- `Translating "host"...` (sin timeout aún) → `dns-lookup`

### L8: No sanitización antes de parsing
**Archivo:** `ios-parsers.ts`
- Parsers reciben output con `--More--`, ANSI, `\r` sin limpiar
- `parseShowIpInterfaceBrief` asume 6 columnas exactas con spacing ideal

### L9: CliSession.executeAndWait solo resuelve paging
**Archivo:** `cli-session.ts`
- `executeAndWait()` solo maneja `--More--`
- No maneja: copy destination, reload confirm, DNS lookup, confirm yes/no

### L10: Resultado de configIos se descarta parcialmente
**Archivo:** `file-bridge-v2-commands.ts:46-53`
```typescript
return {
  success: result.ok,
  commandId: result.id,
  error: result.error?.message ?? "Unknown error",  // solo string
};
// ConfigIosResult rico (failedAtIndex, results[], etc.) se PIERDE
```

---

## 5. Qué Rutas Pasan por CliSession vs. Cuáles No

| Método | Usa CliSession? | Estado actualizado? |
|--------|-----------------|---------------------|
| `execIos()` | NO | N/A |
| `configIos()` | NO | N/A |
| `execInteractive()` | SÍ | SÍ |
| Semantic ops | NO | N/A |

---

## 6. Cómo Se Determina Si Un Comando Falló

1. `term.enterCommand(cmd)` devuelve `[status, raw]`
2. `classifyOutput(raw)` → clasificación
3. Si `status !== 0` O `classification` es `invalid`/`error`/`incomplete` → **falló**
4. `extractErrorMessage(raw)` → mensaje de error (primer `%`)

**Problema:** No distingue permission-denied de interface-not-found, no detecta truncation, no detecta warnings.

---

## 7. Cómo Se Modela configIos Hoy

```
IosService.configIos()
  └─► bridge.sendCommandAndWait({ type: "configIos", device, commands, save })
        └─► FileBridgeV2
              └─► pt-runtime config.ts handler
                    └─► term.enterCommand() x N
                          └─► fail-fast en primer error
                    └─► write memory (si save !== false)
                    └─► { ok: boolean }
```

**Problemas:**
- No entra a config mode explícitamente (asume que ya está)
- No devuelve qué comando falló específicamente (solo `error: string`)
- `stopOnError` no existe
- `save` failure mezclado con comando failure

---

## 8. Tests Existentes Relevantes

```
packages/pt-control/src/domain/ios/
  ├── session/
  │   └── cli-session.test.ts
  └── ios-service.test.ts (parcial)

packages/file-bridge/tests/
  ├── consumer-parse-errors.test.ts
  ├── crash-recovery.test.ts
  └── lease-management.test.ts
```

**Lo que NO está probado actualmente:**
- Prompt inference con variantes de IOS
- Clasificación de errores específicos IOS
- execIos/configIos con estado de sesión
- Batch config con fallo parcial
- Diálogos interactivos (DNS, copy, confirm)
- Capability gating
