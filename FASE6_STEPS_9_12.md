# Fase 6: Pasos 9-12 - Plan Final

## Paso 9: Endurecer Transcript ↔ Command Trace ↔ Resultado

### Objetivo
Establecer trazabilidad completa entre comando enviado, eventos de sesión, y resultado final.

### Estructura de Trazabilidad

```
┌─────────────────────────────────────────────┐
│ Bridge Command ID                           │
└────────────┬────────────────────────────────┘
             │
             ├─ Device: R1
             ├─ Command: "interface GigabitEthernet0/0"
             ├─ Timestamp: 2026-04-05T12:34:56Z
             │
             └─ Execution Chain:
                ├─ PT-Runtime Handler
                │  ├─ Pre-execution: mode = priv-exec
                │  ├─ Transcript Events:
                │  │  ├─ commandStarted (t=0ms)
                │  │  ├─ outputWritten "config mode active" (t=45ms)
                │  │  ├─ modeChanged priv-exec → config (t=50ms)
                │  │  ├─ promptChanged "(config)#" (t=51ms)
                │  │  ├─ outputWritten "Interface 0/0 configured" (t=150ms)
                │  │  └─ commandEnded (t=152ms)
                │  │
                │  └─ Post-execution: mode = config
                │
                ├─ Result: IosInteractiveResult
                │  ├─ ok: true
                │  ├─ raw: "...output..."
                │  ├─ diagnostics.source: "terminal"
                │  ├─ diagnostics.completionReason: "command-ended"
                │  ├─ interaction.modesChanged: 1
                │  ├─ session.mode: "config"
                │  └─ transcriptSummary: [...]
                │
                └─ Classification: SYNTAX_ERROR | SUCCESS | etc.
```

### Nuevos Campos en Result

```typescript
interface EnrichedIosResult {
  // ... IosInteractiveResult ...
  
  // Trazabilidad mejorada
  traceId?: string;  // Correlation ID para toda la cadena
  bridgeCommandId?: string;  // ID del comando en la cola del bridge
  sessionId?: string;  // Session de terminal (puede persistirse)
  
  // Timeline completa
  timestampStart?: number;  // Unix ms cuando se envió
  timestampEnd?: number;    // Unix ms cuando se completó
  
  // Validación post-ejecución
  verificationCommand?: string;  // ej: "show running-config | include interface"
  verificationResult?: IosInteractiveResult;
  verified?: boolean;
}
```

### Implementación

#### En pt-runtime
- Generar `traceId` único al inicio de `handleExecInteractive`
- Pasar a través de toda la cadena
- Incluir en `transcriptSummary`

#### En pt-control (`IosService`)
- Recibir `traceId` del runtime
- Propagarlo a logs y a DB si existe
- Permitir agentes consultar por `traceId`

#### En CLI/Agentes
- Mostrar `traceId` en salida
- Permitir `pt query-execution <traceId>`
- Mostrar full transcript si se solicita

---

## Paso 10: Revisar y Endurecer `cleanUp()`

### Problema Actual
El runtime es complejo y puede dejar listeners/timers pendientes si:
- Estado desync ocurre sin recovery
- Timeout sin limpieza de listeners
- Excepción en handler sin finally

### Solución

#### En `main.ts` (generado PT-side)

```typescript
// Mantener registro de listeners activos
var activeListeners = {};
var activeTimers = [];

function registerListener(eventType, handler) {
  if (!activeListeners[eventType]) {
    activeListeners[eventType] = [];
  }
  activeListeners[eventType].push(handler);
  // Retornar unregister function
  return function() {
    activeListeners[eventType] = activeListeners[eventType].filter(
      function(h) { return h !== handler; }
    );
  };
}

function registerTimer(timerId) {
  activeTimers.push(timerId);
  return timerId;
}

function cleanUp() {
  // 1. Limpiar todos los listeners
  Object.keys(activeListeners).forEach(function(eventType) {
    activeListeners[eventType].forEach(function(handler) {
      try {
        workspace.unregister(eventType, handler);
      } catch(e) {
        dprint('[cleanUp] Failed to unregister ' + eventType + ': ' + e);
      }
    });
  });
  activeListeners = {};
  
  // 2. Limpiar todos los timers
  activeTimers.forEach(function(timerId) {
    try {
      clearTimeout(timerId);
      clearInterval(timerId);
    } catch(e) {
      dprint('[cleanUp] Failed to clear timer: ' + e);
    }
  });
  activeTimers = [];
  
  // 3. Limpiar estado global de IOS
  try {
    Object.keys(iosSessionEngines).forEach(function(deviceId) {
      var engine = iosSessionEngines[deviceId];
      if (engine && engine.reset) {
        engine.reset();
      }
    });
  } catch(e) {
    dprint('[cleanUp] Failed to reset engines: ' + e);
  }
  
  // 4. Cerrar todas las sesiones de terminal
  try {
    var net = getNet();
    var devices = net.getDevices();
    devices.forEach(function(device) {
      try {
        var term = device.getCommandLine();
        if (term && term.clear) {
          term.clear();
        }
      } catch(e) {
        // Ignorar - device puede no tener CLI
      }
    });
  } catch(e) {
    dprint('[cleanUp] Failed to close terminals: ' + e);
  }
  
  dprint('[cleanUp] Complete - all resources freed');
}

// Asegurar que se ejecuta siempre al cierre
if (typeof workspace !== 'undefined' && workspace.onShutdown) {
  workspace.onShutdown(function() {
    try {
      cleanUp();
    } catch(e) {
      dprint('[onShutdown] Fatal error in cleanUp: ' + e);
    }
  });
}
```

#### Garantías

- ✅ Idempotente: múltiples llamadas son seguras
- ✅ No reentrante: usa flag para prevenir recursión
- ✅ Nunca lanza: todos los errors son logged, no propagados
- ✅ Nunca asume: valida existencia antes de usar

---

## Paso 11: Reforzar Tests de IOS Interactivo

### Test File Structure

```
packages/pt-control/__tests__/
├── domain/ios/
│   ├── ios-error-classifier.test.ts      [70 líneas]
│   └── ios-session-engine.test.ts        [150 líneas]
├── application/services/
│   ├── ios-service-interactive.test.ts   [200 líneas]
│   └── ios-config-improved.test.ts       [250 líneas]
└── integration/
    └── ios-real-scenarios.test.ts        [300 líneas - con PT mock]
```

### Caso de Test 1: State Machine Básico

```typescript
test('IosSessionEngine transitions correctly', () => {
  const engine = new IosSessionEngine('user-exec', '>');
  
  engine.processEvent({ type: 'commandStarted', command: 'enable' });
  expect(engine.getExecutionState()).toBe('awaiting-output');
  
  engine.processEvent({ type: 'outputWritten', data: 'Password: ' });
  expect(engine.getState().awaitingPassword).toBe(true);
  
  engine.providePassword('secret');
  engine.processEvent({ type: 'outputWritten', data: 'R1#' });
  
  engine.processEvent({ type: 'commandEnded' });
  expect(engine.isComplete()).toBe(true);
  expect(engine.getState().mode).toBe('priv-exec');
  expect(engine.getMetrics().passwordsRequested).toBe(1);
});
```

### Caso de Test 2: Paging Handling

```typescript
test('IosSessionEngine handles paging correctly', () => {
  const engine = new IosSessionEngine('priv-exec', '#');
  
  engine.processEvent({ type: 'commandStarted', command: 'show config' });
  engine.processEvent({
    type: 'outputWritten',
    data: 'line 1\nline 2\nline 3\n--More--'
  });
  
  expect(engine.getState().paging).toBe(true);
  expect(engine.getMetrics().pagesAdvanced).toBe(0);
  
  engine.advancePaging();
  expect(engine.getState().paging).toBe(false);
  expect(engine.getMetrics().pagesAdvanced).toBe(1);
});
```

### Caso de Test 3: Error Classification

```typescript
test('classifyIosError categorizes syntax errors', () => {
  const result: IosInteractiveResult = {
    ok: false,
    raw: '% Invalid command',
    session: { mode: 'priv-exec' },
    interaction: { ...defaults },
    diagnostics: {
      source: 'terminal',
      completionReason: 'command-ended',
      errors: []
    }
  };
  
  const classified = classifyIosError(result);
  expect(classified.category).toBe(IosErrorCategory.SYNTAX_ERROR);
  expect(classified.retryable).toBe(false);
  expect(classified.severity).toBe('error');
});
```

### Caso de Test 4: Config Mode Transitions

```typescript
test('configIos transitions modes correctly', async () => {
  const result = await iosService.configIos('R1', [
    'interface GigabitEthernet0/0',
    'ip address 192.168.1.1 255.255.255.0'
  ]);
  
  expect(result.ok).toBe(true);
  expect(result.executedCount).toBe(2);
  expect(result.results[0].sessionAfter.mode).toBe('config');
  expect(result.results[0].interaction.modesChanged).toBe(1);
});
```

### Caso de Test 5: Interactive Prompt Handling (con PT mock)

```typescript
test('execInteractive handles confirms and passwords', async () => {
  const mock = new PTMockDevice();
  mock.onCommand('copy startup running', {
    prompt: 'Destination filename [running-config]? ',
    responseType: 'filename'
  });
  
  const result = await iosService.execInteractive('R1', 'copy startup running');
  
  expect(result.ok).toBe(true);
  expect(result.interaction.destinationFilenameAnswered).toBe(1);
});
```

---

## Paso 12: Actualizar Skill CLI

### Archivo: `docs/CLI_AGENT_SKILL.md`

Agregar sección nueva:

```markdown
## Fase 6: Ejecución IOS Confiable

A partir de Fase 6, la ejecución IOS es más confiable porque:

### 1. State Machine Real
- No depende de polling simplista
- Tracks eventos reales de terminal
- Maneja paging, confirms, passwords explícitamente

### 2. Diagnósticos Enriquecidos
```typescript
result.diagnostics.source  // 'terminal' o 'synthetic'
result.diagnostics.completionReason  // 'command-ended', 'timeout', 'desync', etc.
result.diagnostics.errors  // Array de errors reales
result.diagnostics.warnings  // Array de warnings
```

### 3. Métricas de Interacción
```typescript
result.interaction.pagesAdvanced  // Cuántos paging prompts se avanzaron
result.interaction.confirmsAnswered  // Cuántas confirmaciones se respondieron
result.interaction.passwordsRequested  // Cuántas passwords se pidieron
```

### 4. Cómo Usar en Agentes

**NO HAGAS**: Revisar solo si `ok === true`
```javascript
// ❌ MALO
if (result.ok) {
  // confiar ciegamente
}
```

**HAZLO**: Revisar source y completionReason
```javascript
// ✅ BUENO
if (result.ok && result.diagnostics.source === 'terminal') {
  // Confiable: de dispositivo real
} else if (result.diagnostics.source === 'synthetic') {
  // Advertencia: resultado heurístico, validar manualmente
} else if (result.diagnostics.completionReason === 'desync') {
  // Error crítico: session lost
}
```

### 5. Patrones Recomendados

#### Ejecutar comando seguro
```javascript
const result = await bridge.execInteractive({
  device: 'R1',
  command: 'show version'
});

if (result.ok && result.diagnostics.source === 'terminal') {
  // Procesar resultado
} else {
  // Registrar error y retry
  const error = classifyIosError(result);
  log(`Failed: ${error.message} (${error.category})`);
  
  if (error.retryable) {
    // Retry
  } else {
    // Falso crítico
  }
}
```

#### Configuración segura
```javascript
const configResult = await bridge.configIos({
  device: 'R1',
  commands: ['interface Gi0/0', 'ip address ...'],
  save: true
});

if (!configResult.ok) {
  const failedCmd = configResult.results[configResult.failedIndex];
  const error = classifyIosError(failedCmd);
  
  log(`Config failed at: ${failedCmd.command}`);
  log(`Error: ${error.message}`);
  log(`Source: ${failedCmd.diagnostics.source}`);
  
  // Decidir si retry o skip
}
```

### 6. Cambios desde Fase 5

| Aspecto | Fase 5 | Fase 6 |
|---------|--------|--------|
| **Detección de éxito** | `raw.includes('%')` | `diagnostics.source === 'terminal'` |
| **Errores** | String difuso | `ClassifiedError` con categoría |
| **Paging** | No trackea | `interaction.pagesAdvanced` |
| **Trazabilidad** | Ninguna | Transcript + trace ID |
| **Confianza** | Baja (heurísticas) | Media-Alta (state machine) |

### 7. Limitaciones Aún Presentes

Fase 6 **no incluye**:

- ❌ Parseo semántico de outputs (ej: validar si config realmente se guardó)
- ❌ Detección automática de cambios de topología
- ❌ Rollback automático de configuración fallida
- ❌ Mitigación de race conditions con otros usuarios

Eso llega en **Fase 7**.

### 8. Debug y Troubleshooting

Si un resultado parece sospechoso:

```javascript
// Revisar transcript completo
if (result.transcriptSummary) {
  result.transcriptSummary.forEach(entry => {
    console.log(`${entry.type}: ${JSON.stringify(entry.payload)}`);
  });
}

// Revisar diagnostics
console.log(`Source: ${result.diagnostics.source}`);
console.log(`Completion: ${result.diagnostics.completionReason}`);
console.log(`Errors: ${result.diagnostics.errors.join(', ')}`);

// Usar raw output como fallback
console.log(`Raw output:\n${result.raw}`);
```
```

### Cambios en Ejemplos

**Ejemplo 1: Comando simple**
```bash
pt exec-ios R1 "show ip route"
```

Output:
```
✓ Command executed (terminal source)
Completion: command-ended
Time: 245ms
Output: ...

Metrics:
  Paging advanced: 1
  Mode changes: 0
```

**Ejemplo 2: Configuración**
```bash
pt config-ios R1 "interface Gi0/0" "ip address 10.0.0.1 255.255.255.0" --save
```

Output:
```
✓ Configuration applied (2/2 commands)
Session: priv-exec → config → priv-exec
Source: terminal

Results:
  [0] interface Gi0/0
      OK, mode change: 1
  [1] ip address ...
      OK
  [save] write memory
      OK, diagnostics: source=terminal

Trace ID: exec-abc123def456
```
```

---

## Resumen de Pasos 9-12

| Paso | Nombre | Deliverables |
|------|--------|--------------|
| 9 | Transcript ↔ Trace | TraceID, timeline, trazabilidad completa |
| 10 | CleanUp | Idempotent, no-fail cleanup en shutdown |
| 11 | Tests | 70+ unit tests + integration tests |
| 12 | Skill | Documentación actualizada + ejemplos |

---

## Criterios de Aceptación Finales (Fase 6 Completa)

- ✅ `execInteractive` usa state machine real
- ✅ `configIos` usa helpers de sesión
- ✅ `IosService` alto revisa `diagnostics` no heurísticas
- ✅ Clasificador de errores formal
- ✅ Tests cubriendo casos críticos
- ✅ Skill actualizado con patrones seguros
- ✅ CleanUp idempotent y safe
- ✅ Trazabilidad completa end-to-end
- ✅ Sin regresiones en tests existentes
- ✅ Documentación actualizada

---

## Próximo: Fase 7

Cuando Fase 6 esté 100% completa, Fase 7 atacará:

1. **Parsers semánticos** para outputs IOS
2. **Validación post-config**: "¿Realmente se aplicó?"
3. **Integración transcript ↔ logs ↔ history**
4. **Sugerencias automáticas**: "deberías guardar", "cambio detectado"
5. **Bridging main.js ↔ runtime.js** para una sola entidad coherente

